#!/usr/bin/node
// Installed out of band as root. Application releases cannot replace this helper.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { createHmac } from "node:crypto";
import { parseEnv } from "node:util";
import { releaseId, validateArchive } from "./release-format.mjs";
const [action, revision] = process.argv.slice(2);
if (
  process.getuid() !== 0 ||
  !["deploy", "rollback"].includes(action) ||
  process.argv.length !== 4
)
  throw Error("Invalid deployment invocation");
releaseId(revision);
const base = "/opt/kubequest",
  destination = base + "/releases/" + revision;
const marker = "/run/kubequest-deploy/maintenance";
let temporary,
  marked = false,
  activated = false,
  old;
const run = (bin, args, options = {}) =>
  execFileSync(bin, args, {
    encoding: "utf8",
    timeout: 180000,
    maxBuffer: 4 * 1024 * 1024,
    env: { PATH: "/usr/sbin:/usr/bin:/sbin:/bin", LANG: "C" },
    ...options,
  });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function pointTo(path) {
  const link = base + "/next";
  try {
    fs.unlinkSync(link);
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  fs.symlinkSync(path, link);
  fs.renameSync(link, base + "/current");
}
async function healthy(expected) {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch("http://127.0.0.1:4340/healthz", {
        signal: AbortSignal.timeout(2000),
      });
      const h = await r.json();
      if (
        r.ok &&
        h.status === "ok" &&
        h.authentication === "google" &&
        h.labReady &&
        (!expected || h.revision === expected)
      )
        return;
    } catch {}
    await sleep(1000);
  }
  throw Error("Release failed its health check");
}
async function ensureIdle() {
  const env = parseEnv(fs.readFileSync("/etc/kubequest/runtime.env", "utf8"));
  const enc = (value) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const unsigned =
    enc({ alg: "HS256" }) +
    "." +
    enc({
      email: "rami.deltoro@gmail.com",
      sub: "deployment-idle-check",
      iss: env.PUBLIC_ORIGIN,
      aud: "kubequest",
      iat: now,
      exp: now + 60,
    });
  const token =
    unsigned +
    "." +
    createHmac("sha256", env.SESSION_SECRET)
      .update(unsigned)
      .digest("base64url");
  const r = await fetch("http://127.0.0.1:4340/api/private/session", {
    headers: { Cookie: "__Host-kubequest=" + token },
    signal: AbortSignal.timeout(5000),
  });
  if (!r.ok) throw Error("Cannot verify lab is idle; refusing to restart");
  if ((await r.json()).session)
    throw Error(
      "An active lab is in progress. Deployment deferred; retry after the lab is stopped.",
    );
}
try {
  old = fs.realpathSync(base + "/current");
  if (action === "deploy") {
    temporary = fs.mkdtempSync(base + "/incoming-");
    fs.chmodSync(temporary, 0o711);
    const archive = temporary + "/release.tar.gz",
      fd = fs.openSync(archive, "wx", 0o600);
    let size = 0;
    try {
      for await (const chunk of process.stdin) {
        size += chunk.length;
        if (size > 100 * 1024 * 1024)
          throw Error("Compressed release exceeds limit");
        fs.writeSync(fd, chunk);
      }
    } finally {
      fs.closeSync(fd);
    }
    validateArchive(
      run("/usr/bin/tar", ["-tzf", archive]),
      run("/usr/bin/tar", ["--numeric-owner", "-tvzf", archive]),
    );
    const stage = temporary + "/stage";
    fs.mkdirSync(stage);
    const uid = Number(run("/usr/bin/id", ["-u", "kubequest-deploy"]).trim());
    const gid = Number(run("/usr/bin/id", ["-g", "kubequest-deploy"]).trim());
    fs.chownSync(stage, uid, gid);
    fs.chownSync(archive, uid, gid);
    run("/usr/sbin/runuser", [
      "-u",
      "kubequest-deploy",
      "--",
      "/usr/bin/tar",
      "-xzf",
      archive,
      "--no-same-owner",
      "--no-same-permissions",
      "-C",
      stage,
    ]);
    if (
      JSON.parse(fs.readFileSync(stage + "/RELEASE.json", "utf8")).revision !==
      revision
    )
      throw Error("Release revision does not match requested commit");
    // No package lifecycle scripts or privileged package installation.
    run(
      "/usr/sbin/runuser",
      [
        "-u",
        "kubequest-deploy",
        "--",
        "/usr/bin/npm",
        "ci",
        "--omit=dev",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
      ],
      { cwd: stage, stdio: ["ignore", "pipe", "pipe"] },
    );
    run("/usr/bin/chown", ["-hR", "root:root", stage]);
    run("/usr/bin/chmod", ["-R", "u=rwX,go=rX", stage]);
    if (fs.existsSync(destination)) {
      if (
        JSON.parse(fs.readFileSync(destination + "/RELEASE.json", "utf8"))
          .revision !== revision
      )
        throw Error("Installed revision mismatch");
      console.log("Reusing the previously installed immutable release.");
    } else fs.renameSync(stage, destination);
  } else {
    if (
      !fs.existsSync(destination + "/RELEASE.json") ||
      fs.realpathSync(destination) !== destination ||
      JSON.parse(fs.readFileSync(destination + "/RELEASE.json", "utf8"))
        .revision !== revision
    )
      throw Error("Rollback release is not installed");
  }
  fs.mkdirSync("/run/kubequest-deploy", { recursive: true, mode: 0o755 });
  fs.writeFileSync(marker, revision, { mode: 0o644 });
  marked = true;
  await ensureIdle();
  run("/usr/bin/systemctl", ["start", "kubequest-backup.service"]);
  pointTo(destination);
  activated = true;
  run("/usr/bin/systemctl", ["restart", "kubequest"]);
  await healthy(revision);
  console.log("DEPLOYED " + revision + " https://kubequest.ramideltoro.com");
} catch (error) {
  if (activated && old) {
    pointTo(old);
    run("/usr/bin/systemctl", ["restart", "kubequest"]);
    await healthy();
    console.error("Previous release restored.");
  }
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (marked) fs.unlinkSync(marker);
  if (temporary) fs.rmSync(temporary, { recursive: true, force: true });
}
