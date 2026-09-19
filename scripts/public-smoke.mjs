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
for (const path of ["/", "/basics", "/ckad", "/readme"]) {
  const r = await fetch(origin + path, { signal: AbortSignal.timeout(20000) });
  assert.equal(r.status, 200, path);
  assert((await r.text()).includes('<div id="root">'), path);
}
assert.equal((await fetch(origin + "/api/private/session")).status, 401);
const wiki = await fetch(origin + "/wiki/Architecture", { redirect: "manual" });
if (process.env.ALLOW_LEGACY_WIKI === "true" && wiki.status === 200) {
  assert((await wiki.text()).includes('<div id="root">'));
} else {
  assert.equal(wiki.status, 308);
  assert.equal(wiki.headers.get("location"), "https://ramideltoro.github.io/kubequest-wiki/Architecture/");
}
console.log(
  "PASS public release identity, portal routes, wiki redirect, Google configuration, lab readiness and anonymous API protection.",
);
