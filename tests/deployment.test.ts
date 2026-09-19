import test from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error the installed deploy helper intentionally uses dependency-free JavaScript
import { releaseId, validateArchive } from "../infra/release-format.mjs";
const names = [
  "dist/index.html",
  "server/index.ts",
  "package.json",
  "package-lock.json",
  "RELEASE.json",
];
const list = (paths: string[], type = "-") =>
  paths.map((p) => `${type}rw-r--r-- 0/0 20 2026-09-19 00:00 ${p}`).join("\n");
test("Deployment accepts complete releases and rejects traversal, links, unexpected files and oversized archives", () => {
  assert.equal(validateArchive(names.join("\n"), list(names)).length, 5);
  for (const path of [
    "../etc/shadow",
    "/etc/passwd",
    "dist/../../etc/passwd",
    "dist/./file",
    "node_modules/hook.js",
    "dist/file\n../oops",
  ])
    assert.throws(() =>
      validateArchive([...names, path].join("\n"), list([...names, path])),
    );
  assert.throws(() => validateArchive(names.join("\n"), list(names, "l")));
  assert.throws(() =>
    validateArchive(names.slice(1).join("\n"), list(names.slice(1))),
  );
  assert.throws(() =>
    validateArchive(
      names.join("\n"),
      list(names).replace(" 20 ", " 999999999 "),
    ),
  );
});
test("Deployment identifiers cannot become paths or shell commands", () => {
  assert.equal(releaseId("a".repeat(40)), "a".repeat(40));
  for (const id of ["main", "abc123", "../release", "a".repeat(40) + ";id", ""])
    assert.throws(() => releaseId(id));
});
