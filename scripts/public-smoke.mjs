import assert from "node:assert/strict";
const origin = "https://kubequest.ramideltoro.com";
const health = await fetch(origin + "/healthz", {
  cache: "no-store",
  signal: AbortSignal.timeout(20000),
});
assert(health.ok);
const body = await health.json();
assert.equal(body.status, "ok");
assert.equal(body.revision, process.env.EXPECTED_REVISION);
assert.equal(body.authentication, "google");
assert.equal(body.labReady, true);
for (const path of [
  "/",
  "/basics",
  "/ckad",
  "/readme",
  "/wiki",
  "/wiki/Architecture",
]) {
  const r = await fetch(origin + path, { signal: AbortSignal.timeout(20000) });
  assert.equal(r.status, 200, path);
  assert((await r.text()).includes('<div id="root">'), path);
}
assert.equal((await fetch(origin + "/api/private/session")).status, 401);
console.log(
  "PASS public release identity, portal routes, wiki, Google configuration, lab readiness and anonymous API protection.",
);
