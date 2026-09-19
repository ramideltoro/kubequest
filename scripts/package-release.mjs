import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { releaseId } from "../infra/release-format.mjs";
const revision = releaseId(
  process.env.GITHUB_SHA ||
    execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
);
fs.writeFileSync(
  "RELEASE.json",
  JSON.stringify({ revision, builtAt: new Date().toISOString() }, null, 2) +
    "\n",
);
execFileSync("tar", [
  "-czf",
  "release.tar.gz",
  "dist",
  "server",
  "content",
  "infra",
  "package.json",
  "package-lock.json",
  "RELEASE.json",
]);
fs.writeFileSync(
  "release.tar.gz.sha256",
  createHash("sha256").update(fs.readFileSync("release.tar.gz")).digest("hex") +
    "  release.tar.gz\n",
);
console.log("Packaged commit " + revision);
