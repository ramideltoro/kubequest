import test from "node:test";
import assert from "node:assert/strict";
import { Coach, coachEvidence, type CoachEvent } from "../server/coach.ts";
import { missions } from "../content/missions.ts";
import { buildApp } from "../server/index.ts";
import { Lab } from "../server/lab.ts";
import { SignJWT } from "jose";
const mission = missions[0];
const snapshot = async () => [{ kind: "Pod", name: "notes", ready: false }];
const response = (lines: unknown[]) =>
  new Response(lines.map((x) => JSON.stringify(x)).join("\n") + "\n");
const signal = () => new AbortController().signal;
test("Coach context excludes secret, configuration, label, and terminal content and bounds object count/size", () => {
  const input = Array.from({ length: 100 }, () => ({
    kind: "Pod",
    name: "notes",
    ready: false,
    data: { password: "never-send" },
    labels: { token: "never-send" },
    terminal: "never-send",
    annotations: { value: "never-send" },
  }));
  const result = coachEvidence(input);
  assert(!result.includes("never-send"));
  assert(result.length <= 1800);
  assert(result.includes('"ready":false'));
});
test("Coach emits words before completion and uses bounded, warm local inference", async () => {
  let body: any;
  const coach = new Coach((async (_url: unknown, options: RequestInit) => {
    body = JSON.parse(options.body as string);
    return response([
      { message: { content: "Check " } },
      { message: { content: "the Service." } },
      { done: true },
    ]);
  }) as typeof fetch);
  const events: CoachEvent[] = [];
  const result = await coach.answer(
    mission,
    "s",
    "Why is traffic failing?",
    snapshot,
    signal(),
    (e) => events.push(e),
  );
  assert.equal(result?.fallback, false);
  assert.equal(result?.answer, "Check the Service.");
  assert(
    events.findIndex((e) => e.type === "token") <
      events.findIndex((e) => e.type === "done"),
  );
  assert.equal(body.stream, true);
  assert.equal(body.keep_alive, "15m");
  assert.equal(body.options.num_predict, 220);
});
test("Model failure and incomplete streams produce a clearly labeled reviewed fallback", async () => {
  for (const result of [
    new Response("unavailable", { status: 503 }),
    response([{ message: { content: "unfinished" } }]),
  ]) {
    const coach = new Coach((async () => result) as typeof fetch);
    const answer = await coach.answer(
      mission,
      "s",
      "Help",
      snapshot,
      signal(),
      () => {},
    );
    assert.equal(answer?.fallback, true);
    assert(answer?.answer.includes(mission.hints[0]));
    assert(!answer?.answer.includes("unfinished"));
  }
});
test("One inference at a time; cancellation releases the slot and aborts model work", async () => {
  let calls = 0,
    aborted = false;
  const coach = new Coach((async (_url: unknown, options: RequestInit) => {
    calls++;
    return new Promise<Response>((_resolve, reject) => {
      options.signal!.addEventListener(
        "abort",
        () => {
          aborted = true;
          reject(Error("aborted"));
        },
        { once: true },
      );
    });
  }) as typeof fetch);
  const first = coach.answer(
    mission,
    "s1",
    "Help",
    snapshot,
    signal(),
    () => {},
  );
  await new Promise((r) => setTimeout(r, 10));
  const second = await coach.answer(
    mission,
    "s1",
    "Another",
    snapshot,
    signal(),
    () => {},
  );
  assert.equal(calls, 1);
  assert.equal(second?.fallback, true);
  assert(second?.reason?.includes("another question"));
  coach.cancel("other-session");
  assert.equal(aborted, false);
  coach.cancel("s1");
  assert.equal(await first, null);
  assert.equal(aborted, true);
  const next = coach.answer(
    mission,
    "s2",
    "Help",
    snapshot,
    signal(),
    () => {},
  );
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(calls, 2);
  coach.cancel();
  await next;
});
test("A stalled model times out to authored help; missing evidence does not stall inference", async (t) => {
  // A real fetch owns a socket. Keep that lifetime in this socket-free mock too:
  // AbortSignal.timeout deliberately does not keep Node 22 running by itself.
  const connectionLifetime = setInterval(() => {}, 100);
  t.after(() => clearInterval(connectionLifetime));
  const coach = new Coach(
    (async (_url: unknown, options: RequestInit) =>
      new Promise<Response>((_resolve, reject) =>
        options.signal!.addEventListener(
          "abort",
          () => reject(Error("timeout")),
          { once: true },
        ),
      )) as typeof fetch,
    40,
    5,
  );
  const result = await coach.answer(
    mission,
    "s",
    "Help",
    () => new Promise(() => {}),
    signal(),
    () => {},
  );
  assert.equal(result?.fallback, true);
  assert(result?.reason?.includes("too long"));
});
test("Authenticated HTTP coach delivers progress before the model answer; empty questions are rejected", async () => {
  const env = {
    AUTH_GOOGLE_ID: "test-client",
    AUTH_GOOGLE_SECRET: "test-secret",
    DB_PATH: ":memory:",
    PUBLIC_ORIGIN: "https://kubequest.example.test",
    SESSION_SECRET: "z".repeat(48),
  };
  const lab = new Lab();
  lab.session = {
    id: "coach-test",
    missionId: mission.id,
    mode: "guided",
    status: "ready",
    startedAt: Date.now(),
    lastActivity: Date.now(),
    expiresAt: Date.now() + 1800000,
    deadline: null,
    message: "ready",
  };
  lab.snapshot = snapshot as any;
  const coach = new Coach((async () => {
    await new Promise((r) => setTimeout(r, 180));
    return response([
      { message: { content: "Read the Service selector." } },
      { done: true },
    ]);
  }) as typeof fetch);
  const { app } = await buildApp(env, lab, coach);
  const token = await new SignJWT({ email: "rami.deltoro@gmail.com" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("test")
    .setIssuer(env.PUBLIC_ORIGIN)
    .setAudience("kubequest")
    .setIssuedAt()
    .setExpirationTime("1m")
    .sign(new TextEncoder().encode(env.SESSION_SECRET));
  const headers = {
    origin: env.PUBLIC_ORIGIN,
    cookie: "__Host-kubequest=" + token,
    "Content-Type": "application/json",
  };
  try {
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/private/tutor",
          headers,
          payload: { sessionId: "coach-test", question: " " },
        })
      ).statusCode,
      400,
    );
    const address = await app.listen({ host: "127.0.0.1", port: 0 });
    const r = await fetch(address + "/api/private/tutor", {
      method: "POST",
      headers,
      body: JSON.stringify({
        sessionId: "coach-test",
        question: "Help",
        stream: true,
      }),
    });
    assert.equal(r.status, 200);
    const reader = r.body!.getReader(),
      decoder = new TextDecoder();
    const first = decoder.decode((await reader.read()).value);
    assert(first.includes('"type":"status"'));
    assert(!first.includes('"type":"done"'));
    let rest = "";
    for (;;) {
      const p = await reader.read();
      if (p.done) break;
      rest += decoder.decode(p.value);
    }
    assert(rest.includes('"type":"token"'));
    assert(rest.includes('"fallback":false'));
  } finally {
    await app.close();
  }
});
