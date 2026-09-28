import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const directory = process.argv[2];
if (!directory)
  throw Error("Provide the directory of actual successful lab recordings.");
const missions = JSON.parse(fs.readFileSync("content/exercise-missions.json"));
const recipes = JSON.parse(fs.readFileSync("server/exercise-labs.json"));
const hash = (value) => createHash("sha256").update(value).digest("hex");
const records = missions.map((m) => {
  const bytes = fs.readFileSync(path.join(directory, m.id + ".json"));
  const recording = JSON.parse(bytes);
  const expected = recipes[m.id].checks.map((c) => c.label);
  assert.deepEqual(
    recording.after.map((c) => c.label),
    expected,
    m.id + " checks",
  );
  assert.ok(
    recording.after.length && recording.after.every((c) => c.passed),
    m.id + " passing result",
  );
  assert.ok(
    recording.before.length && !recording.before.every((c) => c.passed),
    m.id + " initial state",
  );
  assert.equal(
    recording.transcript.find((s) => s.title === "Complete the task")?.command,
    m.solution,
    m.id + " recorded solution",
  );
  const media = Object.fromEntries(
    ["mp4", "vtt", "txt", "jpg"].map((extension) => {
      const bytes = fs.readFileSync("public/demos/" + m.id + "." + extension);
      assert.ok(bytes.length > 20);
      return [extension, hash(bytes)];
    }),
  );
  assert.ok(
    fs
      .readFileSync("public/demos/" + m.id + ".txt", "utf8")
      .includes(m.solution),
  );
  const transcript = fs.readFileSync("public/demos/" + m.id + ".txt", "utf8");
  for (const entry of recording.transcript)
    assert.ok(
      transcript.includes(entry.command + "\n" + entry.output),
      m.id + " recorded output differs",
    );
  return {
    id: m.id,
    checks: expected.length,
    solutionSha256: hash(m.solution),
    recordingSha256: hash(bytes),
    media,
  };
});
fs.writeFileSync(
  "content/exercise-recordings.json",
  JSON.stringify(
    {
      environment:
        "Disposable K3s 1.35.8 guest; actual student commands and authored behavioral checks",
      records,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Verified " +
    records.length +
    " real solution recordings and their public media.",
);
