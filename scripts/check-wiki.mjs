import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { validateWikiReview } from "./wiki-review.mjs";
const git = (args, options = {}) =>
  execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  }).trim();
const review = JSON.parse(fs.readFileSync("wiki-review.json", "utf8"));
let base = process.env.WIKI_BASE_REVISION;
if (!base || /^0+$/.test(base))
  base = git(["rev-parse", process.env.CI ? "HEAD^" : "HEAD"]);
if (!/^[a-f0-9]{40}$/.test(base))
  throw Error("Invalid documentation comparison base");
const changed = [
  ...git(["diff", "--name-only", base]).split("\n"),
  ...git(["ls-files", "--others", "--exclude-standard"]).split("\n"),
].filter(Boolean);
let previous = null;
try {
  previous = JSON.parse(git(["show", base + ":wiki-review.json"]));
} catch {}
const required = validateWikiReview(review, previous, changed);
const target = path.resolve(process.env.WIKI_CHECKOUT_PATH || ".wiki-check");
if (!fs.existsSync(target + "/.git"))
  git([
    "clone",
    "--quiet",
    "https://github.com/ramideltoro/kubequest-wiki.git",
    target,
  ]);
if (
  git(["remote", "get-url", "origin"], { cwd: target }) !==
  "https://github.com/ramideltoro/kubequest-wiki.git"
)
  throw Error("Unexpected wiki checkout origin");
git(["fetch", "--quiet", "origin", "main"], { cwd: target });
git(["merge-base", "--is-ancestor", review.revision, "origin/main"], {
  cwd: target,
});
if (required) {
  const files = previous
    ? git(["diff", "--name-only", previous.revision, review.revision], {
        cwd: target,
      }).split("\n")
    : git(["ls-tree", "-r", "--name-only", review.revision], {
        cwd: target,
      }).split("\n");
  if (
    !files.some(
      (f) =>
        /^(pages\/|diagrams\/|reference\/)/.test(f) &&
        !/^pages\/(Current-release|Release-history)\.md$/.test(f),
    )
  )
    throw Error(
      "The reviewed wiki commit must include authored guide or diagram changes.",
    );
}
git(["checkout", "--quiet", "--detach", review.revision], { cwd: target });
execFileSync(process.execPath, ["scripts/check-docs.mjs"], {
  cwd: target,
  stdio: "inherit",
});
console.log(
  "PASS reviewed wiki commit " +
    review.revision +
    "; documentation change gate " +
    (required ? "satisfied" : "not required for these files") +
    ".",
);
