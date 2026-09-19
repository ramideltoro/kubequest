import test from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../server/index.ts";
import {
  validateWikiReview,
  requiresWikiReview,
} from "../scripts/wiki-review.mjs";
test("Behavior, curriculum, UI and infrastructure changes require a new reviewed wiki commit", () => {
  const before = {
    revision: "a".repeat(40),
    summary: "Reviewed the existing application documentation.",
  };
  for (const file of [
    "src/main.tsx",
    "server/index.ts",
    "content/lessons.ts",
    "infra/kubequest.service",
    ".github/workflows/ci-cd.yml",
  ])
    assert.throws(() => validateWikiReview(before, before, [file]));
  assert.equal(requiresWikiReview(["package-lock.json"]), false);
  assert.equal(
    validateWikiReview({ ...before, revision: "b".repeat(40) }, before, [
      "server/index.ts",
    ]),
    true,
  );
  assert.throws(() =>
    validateWikiReview({ revision: "main", summary: "x" }, null, []),
  );
});
test("Old wiki chapters and UML URLs redirect to the dedicated Pages site without open redirects", async () => {
  const { app } = await buildApp({ DB_PATH: ":memory:" });
  try {
    for (const [from, to] of [
      ["/wiki", "/"],
      ["/wiki/", "/"],
      ["/wiki/Home", "/"],
      ["/wiki/Architecture", "/Architecture/"],
      ["/wiki-assets/class.svg", "/diagrams/class.svg"],
    ]) {
      const r = await app.inject(from);
      assert.equal(r.statusCode, 308);
      assert.equal(
        r.headers.location,
        "https://ramideltoro.github.io/kubequest-wiki" + to,
      );
    }
    const r = await app.inject("/wiki/https://evil.example");
    assert.equal(
      r.headers.location,
      "https://ramideltoro.github.io/kubequest-wiki/",
    );
  } finally {
    await app.close();
  }
});
