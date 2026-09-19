import test from "node:test";
import assert from "node:assert/strict";
import { setupObjects, evaluate } from "../server/scenarios.ts";
import { missions } from "../content/missions.ts";
import { lessons } from "../content/lessons.ts";
import { foundations } from "../content/foundations.ts";
test("Every mission starts broken and has complete authored content", () => {
  for (const m of missions) {
    assert.equal(
      evaluate(m.id, setupObjects(m.id), {}).every((c) => c.passed),
      false,
      m.id,
    );
    assert.equal(m.hints.length, 3);
    assert.ok(m.solution.length > 50);
    assert.equal(m.objectives.length, 4);
  }
  assert.equal(new Set(missions.map((m) => m.id)).size, 8);
});
test("Readiness alone cannot pass routing: selector and real HTTP evidence are required", () => {
  const o = setupObjects("lost-in-routing");
  const d = o.find((x) => x.kind === "Deployment")!;
  d.metadata.generation = 1;
  d.status = { readyReplicas: 2, observedGeneration: 1 };
  let c = evaluate("lost-in-routing", o, { http: "200" });
  assert.equal(
    c.every((x) => x.passed),
    false,
  );
  o.find((x) => x.kind === "Service")!.spec.selector.app = "little-notes";
  assert.equal(
    evaluate("lost-in-routing", o, { http: "200" }).every((x) => x.passed),
    true,
  );
  assert.equal(
    evaluate("lost-in-routing", o, { http: "503" }).every((x) => x.passed),
    false,
  );
});
test("Security task cannot pass with zero resource values or root runtime identity", () => {
  const o = setupObjects("least-privilege"),
    d = o.find((x) => x.kind === "Deployment")!,
    p = d.spec.template.spec,
    c = p.containers[0];
  d.metadata.generation = 1;
  d.status = { readyReplicas: 1, observedGeneration: 1 };
  p.automountServiceAccountToken = false;
  c.securityContext = {
    runAsUser: 1000,
    runAsNonRoot: true,
    allowPrivilegeEscalation: false,
    capabilities: { drop: ["ALL"] },
  };
  c.resources = {
    requests: { cpu: "50m", memory: "32Mi" },
    limits: { cpu: "200m", memory: "64Mi" },
  };
  assert.ok(
    evaluate("least-privilege", o, { uid: "1000" }).every((c) => c.passed),
  );
  assert.ok(
    !evaluate("least-privilege", o, { uid: "0" }).every((c) => c.passed),
  );
  c.resources.requests.cpu = "0";
  assert.ok(
    !evaluate("least-privilege", o, { uid: "1000" }).every((c) => c.passed),
  );
});
test("All thirty lessons have independent exercises, accessible labels, correct-answer explanations, and official references", () => {
  assert.equal(lessons.length, 14);
  assert.equal(foundations.length, 16);
  assert.equal(new Set([...foundations, ...lessons].map((l) => l.id)).size, 30);
  for (const l of [...foundations, ...lessons]) {
    assert.ok(l.correct >= 0 && l.correct < l.answers.length);
    assert.ok(l.paragraphs.join("").length > 700);
    assert.ok(l.try.length > 30);
    assert.ok(l.docs.startsWith("https://"));
  }
});
