import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import missions from "../content/exercise-missions.json";
import source from "../content/ckad-exercises.json";
import guides from "../content/ckad-curriculum.json";
import { exerciseLabs } from "../server/exercise-scenarios";
import { Lab } from "../server/lab";

test("every source exercise and guided lesson has an independent lab, source notice and complete mission diagram", () => {
  assert.equal(missions.length, 156);
  assert.deepEqual(
    new Set(missions.map((m) => m.id)),
    new Set([...source.exercises, ...guides].map((m) => m.id)),
  );
  for (const m of missions) {
    const lab = exerciseLabs[m.id];
    assert.ok(lab, m.id);
    assert.ok(m.title && m.tagline && m.brief && m.why && m.sourceUrl, m.id);
    assert.equal(m.objectives.length, lab.checks.length);
    assert.ok(lab.checks.length > 0);
    assert.equal(m.hints.length, 3);
    assert.equal(m.visual.nodes.length, 4);
    assert.ok(m.visual.contrast.summary);
    assert.ok(fs.existsSync("public" + m.licensePath));
    for (const n of m.visual.nodes)
      assert.ok(
        n.icon.startsWith("ui-") ||
          fs.existsSync("public/icons/" + n.icon + ".svg"),
        m.id + ": " + n.icon,
      );
    for (const e of m.visual.edges)
      assert.ok(e.from >= 0 && e.to < 4 && e.from !== e.to);
    for (const script of [
      lab.setup,
      lab.solution,
      ...lab.checks.map((c) => c.command),
    ])
      execFileSync("bash", ["-n"], { input: script });
  }
});
test("exercise grading uses observed checks and fails closed on command errors", async () => {
  const lab = new Lab();
  lab.session = {
    id: "test",
    missionId: missions[0].id,
    mode: "guided",
    status: "ready",
    startedAt: 0,
    lastActivity: 0,
    expiresAt: 1,
    deadline: null,
    message: "",
  };
  let commands = 0;
  lab.command = async () => {
    commands++;
    throw Error("missing expected state");
  };
  const failed = await lab.grade();
  assert.equal(failed.length, missions[0].objectives.length);
  assert.ok(failed.every((c) => !c.passed));
  assert.equal(commands, failed.length);
  lab.command = async () => "";
  assert.ok((await lab.grade()).every((c) => c.passed));
});

test("expanded resource snapshots never expose Secret values", async () => {
  const lab = new Lab();
  lab.items = async () => [
    {
      kind: "Secret",
      metadata: { name: "practice", labels: {} },
      data: { password: "MUST_NOT_REACH_BROWSER" },
    },
    {
      kind: "Role",
      metadata: { name: "reader" },
      rules: [{ verbs: ["get"], resources: ["pods"] }],
    },
  ];
  const snapshot = await lab.snapshot();
  assert.equal(snapshot.length, 2);
  assert.equal(
    JSON.stringify(snapshot).includes("MUST_NOT_REACH_BROWSER"),
    false,
  );
  assert.equal("data" in snapshot[0], false);
});

test("every converted mission ships a matching qualified walkthrough and public media", async () => {
  const { createHash } = await import("node:crypto");
  const hash = (value: string | Buffer) =>
    createHash("sha256").update(value).digest("hex");
  const qualification = JSON.parse(
    fs.readFileSync("content/exercise-recordings.json", "utf8"),
  );
  assert.equal(qualification.records.length, missions.length);
  for (const m of missions) {
    const record = qualification.records.find(
      (r: { id: string }) => r.id === m.id,
    );
    assert.ok(record, m.id);
    assert.equal(
      record.solutionSha256,
      hash(m.solution),
      m.id + " stale recording",
    );
    assert.equal(record.checks, m.objectives.length);
    for (const ext of ["mp4", "vtt", "txt", "jpg"]) {
      assert.equal(
        hash(fs.readFileSync("public/demos/" + m.id + "." + ext)),
        record.media[ext],
        m.id + " media integrity",
      );
    }
    assert.ok(
      fs
        .readFileSync("public/demos/" + m.id + ".txt", "utf8")
        .includes(m.solution),
    );
  }
});
