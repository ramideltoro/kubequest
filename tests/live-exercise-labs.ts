import { Lab } from "../server/lab.ts";
import { exerciseLabs } from "../server/exercise-scenarios.ts";
import { mkdirSync, writeFileSync } from "node:fs";
if (!process.env.LAB_DIR?.endsWith("/exercise-runtime-qa/lab"))
  throw Error("Use the dedicated runtime QA template and port.");
const output =
  process.env.QA_OUTPUT_DIR || "/var/lib/kubequest/exercise-runtime-qa/results";
mkdirSync(output, { recursive: true });
const selected = process.env.ONLY_MISSIONS?.split(",");
const sleep = (n: number) => new Promise((r) => setTimeout(r, n));
const lab = new Lab();
let failures = 0;
let resetVerified = false;
for (const [id, recipe] of Object.entries(exerciseLabs).filter(
  ([id]) => !selected || selected.includes(id),
)) {
  console.log("START fresh isolated VM", id);
  try {
    await lab.start(id, "guided", 20);
    while (lab.busy) await sleep(1000);
    if (lab.session?.status !== "ready")
      throw Error("Setup did not become ready");
    const before = await lab.grade();
    if (!before.length || before.every((c) => c.passed))
      throw Error("Initial state already passed");
    const terminal = await lab.command(
      "su - student -c 'bash -s'",
      "set -euo pipefail\ncd /home/student\nexport KUBECONFIG=/home/student/.kube/config\n" +
        recipe.solution,
      260000,
    );
    let after = await lab.grade();
    for (let i = 0; i < 10 && !after.every((c) => c.passed); i++) {
      await sleep(3000);
      after = await lab.grade();
    }
    const snapshot = await lab.snapshot();
    if (!after.every((c) => c.passed)) throw Error(JSON.stringify(after));
    writeFileSync(
      output + "/" + id + ".json",
      JSON.stringify(
        { id, before, after, terminal, resourceCount: snapshot.length },
        null,
        2,
      ),
    );
    console.log("PASS fresh isolated VM", id);
    if (process.env.VERIFY_RESET === "1" && !resetVerified) {
      await lab.command("touch /home/student/reset-marker");
      await lab.reset(20);
      while (lab.busy) await sleep(1000);
      if (lab.session?.status !== "ready")
        throw Error("Reset did not become ready");
      await lab.command("test ! -e /home/student/reset-marker");
      if ((await lab.grade()).every((c) => c.passed))
        throw Error("Reset preserved the solved state");
      resetVerified = true;
      console.log("PASS reset discards workspace and restores task", id);
    }
  } catch (e) {
    failures++;
    console.error("FAIL fresh isolated VM", id, String(e));
  } finally {
    if (!lab.busy) await lab.stop();
  }
}
process.exitCode = failures ? 1 : 0;
