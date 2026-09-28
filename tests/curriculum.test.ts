import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import YAML from "yaml";
import modules from "../content/ckad-curriculum.json";
import index from "../content/ckad-curriculum-index.json";
import exercises from "../content/ckad-index.json";
import { parseProgress } from "../src/curriculum-progress";

test("curriculum prerequisites, source attribution and search index stay valid", () => {
  assert.equal(new Set(modules.map((m) => m.id)).size, modules.length);
  assert.deepEqual(
    index,
    modules.map(({ id, title, skill, domain, minutes, objective }) => ({
      id,
      title,
      skill,
      domain,
      minutes,
      objective,
    })),
  );
  for (const m of modules) {
    for (const id of m.prerequisites)
      assert.ok(exercises.exercises.some((e) => e.id === id));
    assert.match(m.source, /\/blob\/[a-f0-9]{40}\//);
    assert.ok(fs.existsSync(`public${m.licensePath}`));
    for (const field of [
      m.concept,
      m.example,
      m.guided,
      m.challenge,
      m.verification,
      m.solution,
      m.cleanup,
      m.gap,
      m.changes,
    ])
      assert.ok(field.length > 30);
    assert.ok(m.hints.length >= 2);
  }
});
test("startup example is valid YAML with a startup budget and independent health checks", () => {
  const lesson = modules.find((m) => m.id === "startup-probe-budget")!;
  const yaml = lesson.example.match(/```yaml\n([\s\S]*?)```/)![1];
  const pod = YAML.parse(yaml);
  const container = pod.spec.containers[0];
  assert.equal(pod.metadata.namespace, "kq-startup");
  assert.equal(
    container.startupProbe.failureThreshold *
      container.startupProbe.periodSeconds,
    60,
  );
  assert.ok(container.command[2].includes("sleep 25"));
  assert.ok(container.readinessProbe && container.livenessProbe);
});
test("curriculum progress rejects malformed data and unrelated exercise IDs", () => {
  for (const value of ["null", "[]", "broken", "1"])
    assert.deepEqual(parseProgress(value), {});
  assert.deepEqual(
    parseProgress(
      JSON.stringify({
        [modules[0].id]: "practiced",
        [modules[1].id]: "review",
        [modules[2].id]: "passed",
        [exercises.exercises[0].id]: "practiced",
      }),
    ),
    { [modules[0].id]: "practiced", [modules[1].id]: "review" },
  );
});
