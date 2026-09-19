import Fastify from "fastify";
import { PassThrough } from "node:stream";
import { Coach, type CoachEvent } from "./coach.ts";
import cookie from "@fastify/cookie";
import websocket from "@fastify/websocket";
import serveStatic from "@fastify/static";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createAuth } from "./auth.ts";
import { Lab } from "./lab.ts";
import { missions } from "../content/missions.ts";
import { lessons } from "../content/lessons.ts";
import { foundations } from "../content/foundations.ts";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export async function buildApp(
  env: NodeJS.ProcessEnv = process.env,
  lab = new Lab(),
  coach = new Coach(),
) {
  const revision = existsSync(root + "/RELEASE.json")
    ? JSON.parse(readFileSync(root + "/RELEASE.json", "utf8")).revision
    : "development";
  const maintenance = () =>
    existsSync(env.DEPLOYMENT_MARKER || "/run/kubequest-deploy/maintenance");
  const app = Fastify({
    logger: false,
    bodyLimit: 70000,
    trustProxy: "127.0.0.1",
  });
  await app.register(cookie);
  await app.register(websocket, { options: { maxPayload: 65536 } });
  const auth = createAuth(env);
  const dbPath = env.DB_PATH || root + "/data/kubequest.sqlite";
  if (dbPath !== ":memory:") mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(
    "PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS attempts(id INTEGER PRIMARY KEY, mission TEXT, mode TEXT, completed_at INTEGER, seconds INTEGER, results TEXT); CREATE TABLE IF NOT EXISTS progress(lesson TEXT PRIMARY KEY, completed_at INTEGER);",
  );
  const buckets = new Map<string, { n: number; at: number }>();
  let grading = false;
  app.addHook("onRequest", async (req, reply) => {
    reply
      .header("X-Content-Type-Options", "nosniff")
      .header("Referrer-Policy", "strict-origin-when-cross-origin")
      .header("X-Frame-Options", "DENY");
    reply.header(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self'; connect-src 'self' ws: wss:; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
    );
    if (req.url.startsWith("/api") || req.url.startsWith("/auth")) {
      reply.header("Cache-Control", "no-store");
      const ip = req.ip;
      let b = buckets.get(ip);
      if (!b || b.at < Date.now() - 60000) {
        b = { n: 0, at: Date.now() };
        buckets.set(ip, b);
      }
      if (++b.n > 240)
        return reply
          .code(429)
          .send({ error: "Too many requests. Please pause and retry." });
      if (buckets.size > 5000)
        for (const [k, v] of buckets)
          if (v.at < Date.now() - 60000) buckets.delete(k);
    }
    if (req.url.startsWith("/api/private/")) {
      if (!(await auth.identity(req)))
        return reply
          .code(401)
          .send({ error: "Only authorized users can use live labs." });
      if (
        (req.method !== "GET" || req.headers.upgrade) &&
        req.headers.origin !== auth.origin
      )
        return reply.code(403).send({ error: "Invalid request origin." });
    }
  });
  auth.register(app);
  app.get("/healthz", async () => ({
    status: "ok",
    application: "KubeQuest",
    revision,
    authentication: auth.configured ? "google" : "not-configured",
    labReady: lab.available,
    kubernetes: "1.35.8+k3s1",
  }));
  app.get("/api/me", async (req) => ({
    user: await auth.identity(req),
    authConfigured: auth.configured,
    labAvailable: lab.available,
  }));
  app.get("/api/private/session", async () => ({ session: lab.session }));
  const validSession = (req: any, reply: any, allowSubmitted = false) => {
    const s = lab.session;
    if (
      !s ||
      (s.status !== "ready" && !(allowSubmitted && s.status === "submitted"))
    ) {
      reply.code(409).send({ error: "No ready lab session." });
      return false;
    }
    if (req.body?.sessionId !== s.id) {
      reply
        .code(409)
        .send({ error: "The lab changed. Refresh before trying again." });
      return false;
    }
    if (!allowSubmitted && s.mode === "timed" && s.deadline! <= Date.now()) {
      reply.code(409).send({ error: "Time is up. Submit your attempt." });
      return false;
    }
    return true;
  };
  app.post("/api/private/session/start", async (req, reply) => {
    if (maintenance())
      return reply.code(503).header("Retry-After", "30").send({
        error: "A portal update is in progress. Please retry shortly.",
      });
    const b = req.body as any;
    const m = missions.find((x) => x.id === b?.missionId);
    if (!m || !["guided", "independent", "timed"].includes(b.mode))
      return reply
        .code(400)
        .send({ error: "Choose a valid mission and mode." });
    return { session: await lab.start(m.id, b.mode, m.minutes) };
  });
  app.post("/api/private/session/stop", async (req, reply) => {
    if (!lab.session || lab.session.id !== (req.body as any)?.sessionId)
      return reply.code(409).send({ error: "The lab changed." });
    coach.cancel(lab.session.id);
    await lab.stop();
    return { ok: true };
  });
  app.post("/api/private/session/reset", async (req, reply) => {
    if (maintenance())
      return reply.code(503).header("Retry-After", "30").send({
        error: "A portal update is in progress. Please retry shortly.",
      });
    if (!lab.session || lab.session.id !== (req.body as any)?.sessionId)
      return reply.code(409).send({ error: "The lab changed." });
    coach.cancel(lab.session.id);
    return {
      session: await lab.reset(
        missions.find((x) => x.id === lab.session!.missionId)!.minutes,
      ),
    };
  });
  app.post("/api/private/session/keepalive", async (req, reply) => {
    if (!validSession(req, reply)) return;
    lab.touch();
    return { session: lab.session };
  });
  app.post("/api/private/apply", async (req, reply) => {
    if (!validSession(req, reply)) return;
    const b = req.body as any;
    if (typeof b.yaml !== "string" || b.yaml.length > 64000)
      return reply
        .code(400)
        .send({ error: "Provide a YAML manifest under 64 KB." });
    if (lab.operation)
      return reply
        .code(409)
        .send({ error: "Another lab operation is running." });
    lab.operation = true;
    lab.touch();
    try {
      return {
        output: await lab.command("kubectl apply -n quest -f -", b.yaml, 30000),
      };
    } finally {
      lab.operation = false;
    }
  });
  async function grade() {
    if (grading || lab.operation)
      throw Error("Another lab operation is running.");
    grading = true;
    lab.operation = true;
    const s = lab.session!;
    if (s.mode === "timed") s.status = "submitted";
    try {
      const checks = await lab.grade();
      const result = {
        checks,
        passed: checks.every((x) => x.passed),
        score: Math.round(
          (100 * checks.filter((x) => x.passed).length) / checks.length,
        ),
      };
      db.prepare(
        "INSERT INTO attempts(mission,mode,completed_at,seconds,results) VALUES(?,?,?,?,?)",
      ).run(
        s.missionId,
        s.mode,
        Date.now(),
        Math.round((Date.now() - s.startedAt) / 1000),
        JSON.stringify(result),
      );
      if (s.mode === "timed") s.status = "submitted";
      return result;
    } finally {
      grading = false;
      lab.operation = false;
    }
  }
  app.post("/api/private/grade", async (req, reply) => {
    if (!validSession(req, reply, true)) return;
    lab.touch();
    return grade();
  });
  app.get("/api/private/progress", async () => ({
    attempts: db
      .prepare("SELECT * FROM attempts ORDER BY id DESC LIMIT 100")
      .all()
      .map((r: any) => ({ ...r, results: JSON.parse(r.results) })),
    lessons: db
      .prepare("SELECT lesson FROM progress")
      .all()
      .map((x: any) => x.lesson),
  }));
  app.post("/api/private/progress", async (req, reply) => {
    const b = req.body as any;
    if (![...foundations, ...lessons].some((l) => l.id === b?.lesson))
      return reply.code(400).send({ error: "Unknown lesson." });
    db.prepare("INSERT OR REPLACE INTO progress VALUES(?,?)").run(
      b.lesson,
      Date.now(),
    );
    return { ok: true };
  });
  app.post("/api/private/tutor", async (req, reply) => {
    if (!validSession(req, reply)) return;
    if (lab.session?.mode === "timed")
      return reply
        .code(403)
        .send({ error: "Tutor is unavailable during timed attempts." });
    const b = req.body as any;
    if (
      typeof b.question !== "string" ||
      !b.question.trim() ||
      b.question.length > 1500
    )
      return reply
        .code(400)
        .send({ error: "Use a question between 1 and 1,500 characters." });
    const m = missions.find((m) => m.id === lab.session!.missionId)!;
    const sessionId = lab.session!.id;
    const controller = new AbortController();
    lab.touch();
    if (b.stream !== true) {
      const onClose = () => {
        if (!reply.raw.writableEnded) controller.abort();
      };
      reply.raw.on("close", onClose);
      try {
        return await coach.answer(
          m,
          sessionId,
          b.question,
          () => lab.snapshot(),
          controller.signal,
          () => {},
        );
      } finally {
        reply.raw.off("close", onClose);
      }
    }
    const stream = new PassThrough();
    const emit = (event: CoachEvent) => {
      if (!stream.destroyed && !controller.signal.aborted)
        stream.write(JSON.stringify(event) + "\n");
    };
    const heartbeat = setInterval(
      () =>
        emit({
          type: "status",
          message:
            "Still working locally. You can stop this answer or use a reviewed hint below.",
        }),
      5000,
    );
    const close = () => {
      controller.abort();
      clearInterval(heartbeat);
    };
    reply.raw.on("close", close);
    reply
      .header("Cache-Control", "no-store, no-transform")
      .header("X-Accel-Buffering", "no")
      .type("application/x-ndjson; charset=utf-8");
    void coach
      .answer(
        m,
        sessionId,
        b.question,
        () => lab.snapshot(),
        controller.signal,
        emit,
      )
      .catch(() => {})
      .finally(() => {
        clearInterval(heartbeat);
        reply.raw.off("close", close);
        stream.end();
      });
    return reply.send(stream);
  });
  app.get("/api/private/resources", { websocket: true }, (socket, req) => {
    const q = req.query as any;
    const id = q.sessionId;
    if (!lab.session || id !== lab.session.id) {
      socket.close(1008, "Invalid session");
      return;
    }
    let running = false;
    const send = async () => {
      if (running) return;
      running = true;
      try {
        if (
          !(await auth.identity(req)) ||
          !lab.session ||
          id !== lab.session.id
        ) {
          socket.close(1008, "Session ended");
          return;
        }
        if (["ready", "submitted"].includes(lab.session.status))
          socket.send(
            JSON.stringify({
              type: "resources",
              resources: await lab.snapshot(),
            }),
          );
      } catch {
        if (socket.readyState === 1)
          socket.send(JSON.stringify({ type: "unavailable" }));
      } finally {
        running = false;
      }
    };
    const timer = setInterval(send, 5000);
    void send();
    socket.on("close", () => clearInterval(timer));
  });
  app.get("/api/private/terminal", { websocket: true }, (socket, req) => {
    const q = req.query as any;
    const valid = () =>
      lab.session?.id === q.sessionId &&
      lab.session?.status === "ready" &&
      !(lab.session.mode === "timed" && lab.session.deadline! <= Date.now());
    if (!valid()) {
      socket.close(1008, "Lab is not available");
      return;
    }
    let connection: any, stream: any;
    let closed = false;
    socket.on("message", (raw: Buffer) => {
      if (!valid()) {
        socket.close(1008, "Session ended");
        return;
      }
      try {
        const m = JSON.parse(raw.toString());
        if (
          m.type === "input" &&
          typeof m.data === "string" &&
          m.data.length <= 8192
        ) {
          lab.touch();
          stream?.write(m.data);
        }
        if (
          m.type === "resize" &&
          Number.isInteger(m.cols) &&
          Number.isInteger(m.rows)
        ) {
          stream?.setWindow(
            Math.min(100, Math.max(5, m.rows)),
            Math.min(300, Math.max(20, m.cols)),
            0,
            0,
          );
        }
      } catch {
        socket.close(1008, "Invalid terminal message");
      }
    });
    const timer = setInterval(async () => {
      if (!valid() || !(await auth.identity(req)))
        socket.close(1008, "Session ended");
    }, 3000);
    socket.on("close", () => {
      closed = true;
      clearInterval(timer);
      stream?.close();
      connection?.end();
    });
    void lab
      .connection("student")
      .then((c) => {
        if (closed) {
          c.end();
          return;
        }
        connection = c;
        c.shell({ term: "xterm-256color", cols: 100, rows: 24 }, (err, s) => {
          if (err) {
            socket.close(1011, "Terminal unavailable");
            return;
          }
          stream = s;
          s.on(
            "data",
            (d: Buffer) => socket.readyState === 1 && socket.send(d.toString()),
          );
          s.stderr.on(
            "data",
            (d: Buffer) => socket.readyState === 1 && socket.send(d.toString()),
          );
          s.on("close", () => socket.close());
        });
      })
      .catch(() => socket.close(1011, "Terminal unavailable"));
  });
  app.setErrorHandler((error: any, req, reply) => {
    const known = error.message?.match(
      /already active|operation|lab changed|not installed|No active|Wait for/,
    );
    reply.code(known ? 409 : 500).send({
      error: known
        ? error.message
        : "This operation could not finish. Check the lab state and try again.",
    });
    console.error(
      "request_failed",
      req.routeOptions.url,
      error.message?.slice(0, 160),
    );
  });
  const wikiOrigin = "https://ramideltoro.github.io/kubequest-wiki";
  app.get("/wiki", async (_req, reply) =>
    reply.redirect(wikiOrigin + "/", 308),
  );
  app.get("/wiki/*", async (req, reply) => {
    const chapter = (req.params as { "*": string })["*"].replace(/\/$/, "");
    return reply.redirect(
      wikiOrigin +
        (/^[A-Za-z-]+$/.test(chapter) && chapter !== "Home"
          ? "/" + chapter + "/"
          : "/"),
      308,
    );
  });
  app.get("/wiki-assets/*", async (req, reply) => {
    const name = (req.params as { "*": string })["*"];
    if (!/^[a-z-]+\.(svg|puml)$/.test(name))
      return reply.code(404).send({ error: "Diagram not found." });
    return reply.redirect(wikiOrigin + "/diagrams/" + name, 308);
  });
  await app.register(serveStatic, {
    root: resolve(root, "dist"),
    wildcard: false,
    index: false,
  });
  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith("/api") || req.url.startsWith("/auth"))
      return reply.code(404).send({ error: "Not found." });
    return reply.sendFile("index.html");
  });
  const watchdog = setInterval(() => {
    const s = lab.session;
    if (
      s?.status === "ready" &&
      s.mode === "timed" &&
      s.deadline! <= Date.now() &&
      !grading &&
      !lab.operation
    ) {
      void grade().catch(() => {});
    }
  }, 5000);
  watchdog.unref();
  app.addHook("onClose", async () => {
    clearInterval(watchdog);
    coach.cancel();
    if (lab.timer) clearInterval(lab.timer);
    db.close();
  });
  return { app, lab, auth };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const { app, lab } = await buildApp();
  await lab.initialize();
  await app.listen({
    host: "127.0.0.1",
    port: Number(process.env.PORT || 4340),
  });
  console.log(
    "KubeQuest listening on 127.0.0.1:" + Number(process.env.PORT || 4340),
  );
}
