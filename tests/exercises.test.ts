import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import library from "../content/ckad-exercises.json";
import index from "../content/ckad-index.json";
import { parseProgress } from "../src/exercise-progress";
import {
  splitHeadings,
  cleanWrappers,
} from "../scripts/import-ckad-exercises.mjs";

test("imports all ten source files and 152 questions with solutions and pinned attribution", () => {
  assert.equal(library.exercises.length, 152);
  assert.equal(library.topics.length, 10);
  assert.equal(new Set(library.exercises.map((e) => e.id)).size, 152);
  assert.equal(
    library.topics.reduce((sum, t) => sum + t.count, 0),
    152,
  );
  assert.deepEqual(
    index.exercises.map((e) => e.id),
    library.exercises.map((e) => e.id),
  );
  for (const exercise of library.exercises) {
    assert.ok(exercise.solution.trim());
    const topic = library.topics.find((t) => t.id === exercise.topic)!;
    const line = Number(exercise.sourceUrl.split("#L")[1]);
    const raw = fs
      .readFileSync(`content/ckad-upstream/${topic.file}`, "utf8")
      .split(/\r?\n/);
    assert.equal(raw[line - 1].trim(), "### " + exercise.title);
    assert.ok(exercise.sourceUrl.includes(library.source.revision));
  }
  assert.equal(
    fs.readFileSync("public/licenses/ckad-exercises.txt", "utf8"),
    fs.readFileSync("content/ckad-upstream/LICENSE", "utf8"),
  );
});
test("heading parsing preserves shell comments, YAML, nested headings and angle brackets in code", () => {
  const fixture =
    "# Topic\nDocs\n### Task\n<details><summary>show</summary>\n<p>\n```yaml\n### not a question\n# comment\nvalue: <p>literal</p>\n```\n</p></details>\n### Next\nBody";
  const blocks = splitHeadings(fixture);
  assert.deepEqual(
    blocks
      .filter((b: { level: number }) => b.level === 3)
      .map((b: { title: string }) => b.title),
    ["Task", "Next"],
  );
  const cleaned = cleanWrappers(blocks[2].lines.join("\n"));
  assert.ok(cleaned.includes("value: <p>literal</p>"));
  assert.ok(cleaned.includes("### not a question\n# comment"));
  assert.ok(!cleaned.includes("<details>"));
});
test("exercise progress ignores malformed storage, unknown IDs and invalid states", () => {
  const id = library.exercises[0].id;
  for (const raw of [null, "broken", "[]", "null", '"text"'])
    assert.deepEqual(parseProgress(raw), {});
  assert.deepEqual(
    parseProgress(JSON.stringify({ [id]: "practiced", unknown: "review" })),
    { [id]: "practiced" },
  );
  assert.deepEqual(parseProgress(JSON.stringify({ [id]: "review" })), {
    [id]: "review",
  });
  assert.deepEqual(parseProgress(JSON.stringify({ [id]: "passed" })), {});
});
