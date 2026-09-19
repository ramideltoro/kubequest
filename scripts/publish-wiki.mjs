import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
const snapshot = path.resolve(
  process.env.WIKI_EXPORT_PATH || ".wiki-update/current.json",
);
const current = JSON.parse(fs.readFileSync(snapshot, "utf8"));
if (!/^[a-f0-9]{40}$/.test(current.sourceRevision))
  throw Error("Invalid wiki source revision");
if (!process.env.WIKI_DEPLOY_KEY || !process.env.WIKI_KNOWN_HOSTS)
  throw Error("Missing scoped wiki publishing credentials");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "kubequest-wiki-"));
fs.chmodSync(temp, 0o700);
const quote = (value) => "'" + value.replace(/'/g, "'\\''") + "'";
const env = {
  ...process.env,
  GIT_TERMINAL_PROMPT: "0",
  GIT_SSH_COMMAND: `ssh -i ${quote(temp + "/key")} -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=${quote(temp + "/known_hosts")}`,
};
const run = (args, cwd) =>
  execFileSync("git", args, {
    cwd,
    env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 60000,
  }).trim();
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
try {
  fs.writeFileSync(temp + "/key", process.env.WIKI_DEPLOY_KEY + "\n", {
    mode: 0o600,
  });
  fs.writeFileSync(temp + "/known_hosts", process.env.WIKI_KNOWN_HOSTS + "\n", {
    mode: 0o600,
  });
  const health = await fetch("https://kubequest.ramideltoro.com/healthz", {
    signal: AbortSignal.timeout(15000),
  });
  if (!health.ok || (await health.json()).revision !== current.sourceRevision)
    throw Error(
      "Wiki export does not match the live application; refusing stale publication",
    );
  const repo = temp + "/repo";
  run([
    "clone",
    "--quiet",
    "git@github.com:ramideltoro/kubequest-wiki.git",
    repo,
  ]);
  execFileSync(process.execPath, ["scripts/update-reference.mjs", snapshot], {
    cwd: repo,
    stdio: "inherit",
  });
  execFileSync(process.execPath, ["scripts/check-docs.mjs"], {
    cwd: repo,
    stdio: "inherit",
  });
  run(
    [
      "add",
      "generated",
      "pages/Current-release.md",
      "pages/Release-history.md",
    ],
    repo,
  );
  if (run(["diff", "--cached", "--name-only"], repo)) {
    run(
      [
        "-c",
        "user.name=KubeQuest release automation",
        "-c",
        "user.email=41898282+github-actions[bot]@users.noreply.github.com",
        "commit",
        "-m",
        "Document KubeQuest release " + current.sourceRevision.slice(0, 12),
      ],
      repo,
    );
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        run(["push", "origin", "HEAD:main"], repo);
        break;
      } catch (error) {
        if (attempt === 2) throw error;
        run(["pull", "--rebase", "origin", "main"], repo);
      }
    }
  }
  const expected = run(["rev-parse", "HEAD"], repo);
  console.log(
    "Wiki reference pushed; waiting for GitHub Pages to publish " +
      expected +
      ".",
  );
  let matched = false;
  for (let attempt = 0; attempt < 32; attempt++) {
    try {
      const r = await fetch(
        "https://ramideltoro.github.io/kubequest-wiki/release.json?release=" +
          expected +
          "&check=" +
          Date.now(),
        { cache: "no-store", signal: AbortSignal.timeout(12000) },
      );
      if (r.ok) {
        const live = await r.json();
        if (
          live.sourceRevision === current.sourceRevision &&
          /^[a-f0-9]{40}$/.test(live.wikiRevision)
        ) {
          if (live.wikiRevision === expected) matched = true;
          else {
            run(["fetch", "--quiet", "origin", "main"], repo);
            try {
              run(
                ["merge-base", "--is-ancestor", expected, live.wikiRevision],
                repo,
              );
              matched = true;
            } catch {}
          }
        }
      }
    } catch {}
    if (matched) break;
    await wait(15000);
  }
  if (!matched)
    throw Error(
      "Wiki publication did not reach the expected application revision. Inspect kubequest-wiki Actions and rerun this job.",
    );
  const message =
    "Verified wiki and application revision " +
    current.sourceRevision +
    " at https://ramideltoro.github.io/kubequest-wiki/";
  console.log(message);
  if (process.env.GITHUB_STEP_SUMMARY)
    fs.appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      "\n### Wiki synchronized\n\n[Read the wiki](https://ramideltoro.github.io/kubequest-wiki/) · [Wiki repository](https://github.com/ramideltoro/kubequest-wiki)\n\nApplication commit: `" +
        current.sourceRevision +
        "`\n",
    );
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
