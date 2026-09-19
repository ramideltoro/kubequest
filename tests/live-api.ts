import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { parseEnv } from "node:util";
import { SignJWT } from "jose";
import WebSocket from "ws";
const env = parseEnv(readFileSync("/etc/kubequest/runtime.env", "utf8"));
const origin = env.PUBLIC_ORIGIN!;
const jwt = await new SignJWT({ email: "rami.deltoro@gmail.com" })
  .setSubject("deployment-verification")
  .setProtectedHeader({ alg: "HS256" })
  .setIssuer(origin)
  .setAudience("kubequest")
  .setIssuedAt()
  .setExpirationTime("15m")
  .sign(new TextEncoder().encode(env.SESSION_SECRET));
const cookie = "__Host-kubequest=" + jwt;
const sleep = (n: number) => new Promise((r) => setTimeout(r, n));
async function api(path: string, body?: any) {
  const r = await fetch("http://127.0.0.1:4340" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Cookie: cookie,
      Origin: origin,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const j = (await r.json()) as any;
  if (!r.ok) throw Error(r.status + " " + j.error);
  return j;
}
async function ready() {
  for (let i = 0; i < 120; i++) {
    const j = await api("/api/private/session");
    if (j.session?.status === "ready") return j.session;
    if (j.session?.status === "error") throw Error("Lab start failed");
    await sleep(1000);
  }
  throw Error("Lab startup timeout");
}
function socket(path: string) {
  return new WebSocket("ws://127.0.0.1:4340" + path, {
    headers: { Cookie: cookie, Origin: origin },
  });
}
console.log(
  "Testing the deployed API using a short-lived maintenance test session; no login bypass is installed.",
);
const start = await api("/api/private/session/start", {
  missionId: "lost-in-routing",
  mode: "guided",
});
try {
  await api("/api/private/session/start", {
    missionId: "running-not-ready",
    mode: "guided",
  });
  throw Error("Concurrent start was accepted");
} catch (e) {
  if (!String(e).includes("409")) throw e;
}
let s = await ready();
console.log("PASS authenticated start and single-session limit");
await new Promise<void>((resolve, reject) => {
  const ws = socket("/api/private/terminal?sessionId=" + s.id);
  let text = "";
  const timer = setTimeout(() => {
    ws.close();
    reject(Error("Terminal timeout " + JSON.stringify(text.slice(0, 1800))));
  }, 15000);
  ws.on("open", () =>
    setTimeout(
      () =>
        ws.send(
          JSON.stringify({
            type: "input",
            data: 'printf "KUBEQUEST_TERMINAL_%s\\n" OK\r',
          }),
        ),
      500,
    ),
  );
  ws.on("message", (d) => {
    text += d.toString();
    if (text.includes("KUBEQUEST_TERMINAL_OK")) {
      clearTimeout(timer);
      ws.close();
      resolve();
    }
  });
  ws.on("error", reject);
});
console.log("PASS actual terminal shell execution");
for (let i = 0; i < 2; i++)
  await new Promise<void>((resolve, reject) => {
    const ws = socket("/api/private/resources?sessionId=" + s.id);
    const timer = setTimeout(() => {
      ws.close();
      reject(Error("Resource stream timeout"));
    }, 15000);
    ws.on("message", (d) => {
      const j = JSON.parse(d.toString());
      if (
        j.resources?.some(
          (x: any) => x.kind === "Service" && x.name === "notes",
        )
      ) {
        clearTimeout(timer);
        ws.close();
        resolve();
      }
    });
    ws.on("error", reject);
  });
console.log("PASS live resource stream and reconnect");
await api("/api/private/apply", {
  sessionId: s.id,
  yaml: "apiVersion: v1\nkind: Service\nmetadata:\n  name: notes\n  namespace: quest\nspec:\n  selector: {app: little-notes}\n  ports: [{port: 80, targetPort: 80}]",
});
await sleep(3000);
let grade = await api("/api/private/grade", { sessionId: s.id });
if (!grade.passed) throw Error("API grading failed " + JSON.stringify(grade));
console.log("PASS YAML apply, behavioral grading, and persistence");
const began = Date.now();
const tutor = await api("/api/private/tutor", {
  sessionId: s.id,
  question:
    "In one short sentence, why must a Service selector match Pod labels?",
});
if (!tutor.answer) throw Error("No tutor response");
console.log(
  "Tutor result:",
  tutor.fallback ? "authored fallback" : "local Qwen response",
  Math.round((Date.now() - began) / 1000) + " seconds",
);
writeFileSync(
  "/var/lib/kubequest/qa/tutor-result.txt",
  (tutor.fallback ? "FALLBACK" : "LOCAL QWEN") + "\n" + tutor.answer + "\n",
);
const oldId = s.id;
await api("/api/private/session/reset", { sessionId: oldId });
s = await ready();
if (s.id === oldId) throw Error("Reset reused session identity");
try {
  await api("/api/private/apply", { sessionId: oldId, yaml: "invalid" });
  throw Error("Stale request accepted");
} catch (e) {
  if (!String(e).includes("409")) throw e;
}
grade = await api("/api/private/grade", { sessionId: s.id });
if (grade.passed) throw Error("Reset retained fixed resources");
console.log(
  "PASS fresh-VM reset, stale ID rejection, and broken state restoration",
);
await api("/api/private/session/stop", { sessionId: s.id });
if ((await api("/api/private/session")).session)
  throw Error("Session not stopped");
console.log("PASS stop and cleanup");

if (existsSync("/var/lib/kubequest/lab/session.qcow2"))
  throw Error("Stopped session disk remains");
await api("/api/private/session/start", {
  missionId: "lost-in-routing",
  mode: "guided",
});
await ready();
execFileSync("systemctl", ["restart", "kubequest"]);
await sleep(2500);
if (
  (await api("/api/private/session")).session ||
  existsSync("/var/lib/kubequest/lab/session.qcow2")
)
  throw Error("Orphan survived restart");
console.log("PASS service restart removes orphan VM and overlay");
