import { variants } from "./live-variants.ts";
import { Lab } from "../server/lab.ts";
import { missions } from "../content/missions.ts";
import { mkdirSync, writeFileSync } from "node:fs";
const lab = new Lab();
const dir = "/var/lib/kubequest/qa";
mkdirSync(dir, { recursive: true });
const sleep = (n: number) => new Promise((r) => setTimeout(r, n));
let all = true;
for (const m of missions.filter(
  (m) => !process.env.ONLY_MISSION || m.id === process.env.ONLY_MISSION,
)) {
  console.log("START", m.id);
  const transcript: { title: string; command: string; output: string }[] = [];
  try {
    await lab.start(m.id, "guided", m.minutes);
    while (lab.busy) await sleep(1000);
    if (lab.session?.status !== "ready")
      throw Error("Session did not become ready");
    await sleep(5000);
    const before = await lab.grade();
    if (before.every((c) => c.passed))
      throw Error("Broken initial state passed");
    console.log("BROKEN", m.id, before.filter((c) => c.passed).length + "/4");
    const cmd = "kubectl get deployments,pods,services -n quest";
    transcript.push({
      title: "Inspect the broken application",
      command: cmd,
      output: await lab.command(cmd),
    });
    if (m.id === "running-not-ready")
      transcript.push({
        title: "Inspect the failing probe",
        command: "kubectl describe deployment notes -n quest",
        output: await lab.command("kubectl describe deployment notes -n quest"),
      });
    const output = await lab.command("bash -s", m.solution, 150000);
    transcript.push({ title: "Apply the repair", command: m.solution, output });
    let after = await lab.grade();
    for (let i = 0; i < 12 && !after.every((c) => c.passed); i++) {
      await sleep(3000);
      after = await lab.grade();
    }
    transcript.push({
      title: "Verify the result",
      command: cmd,
      output: await lab.command(cmd),
    });
    transcript.push({
      title: "Run behavioral checks",
      command: "KubeQuest: Check my work",
      output: after
        .map(
          (c) =>
            (c.passed ? "PASS" : "FAIL") + " " + c.label + " — " + c.detail,
        )
        .join("\n"),
    });
    writeFileSync(
      `${dir}/${m.id}.json`,
      JSON.stringify(
        { mission: m.id, title: m.title, before, after, transcript },
        null,
        2,
      ),
    );
    if (!after.every((c) => c.passed))
      throw Error(
        "Validation failed: " +
          after
            .filter((c) => !c.passed)
            .map((c) => c.label)
            .join(", "),
      );
    console.log("PASS", m.id, "4/4");
    await variants(lab, m.id);
    // An allowed alternative: named Service targetPort should still behave correctly.
    if (m.id === "lost-in-routing") {
      await lab.command(
        'kubectl patch deployment notes -n quest --type=strategic -p \'{"spec":{"template":{"spec":{"containers":[{"name":"web","ports":[{"containerPort":80,"name":"http"}]}]}}}}\'',
      );
      await lab.command(
        'kubectl patch service notes -n quest --type merge -p \'{"spec":{"ports":[{"port":80,"targetPort":"http"}]}}\'',
      );
      await lab.command(
        "kubectl rollout status deployment/notes -n quest --timeout=60s",
        "",
        65000,
      );
      await sleep(2000);
      if (!(await lab.grade()).every((c) => c.passed))
        throw Error("Valid alternative failed");
      console.log("PASS named-port alternative");
      const isolated = await lab.command(
        'for u in http://10.0.2.2:4340/healthz http://192.168.1.115:4310/healthz http://192.168.1.1 http://169.254.169.254 http://1.1.1.1; do if curl -sS --connect-timeout 1 --max-time 2 -o /dev/null "$u" 2>/dev/null; then echo REACHABLE; else echo BLOCKED; fi; done',
        "",
        15000,
      );
      if (isolated.includes("REACHABLE")) throw Error("Isolation check failed");
      console.log(
        "PASS network isolation: host, LAN, router, metadata, internet blocked",
      );
    }
  } catch (e) {
    all = false;
    console.error("FAIL", m.id, String(e));
    try {
      console.log(
        (
          await lab.command(
            "kubectl get pods -A; kubectl get events -n quest --sort-by=.lastTimestamp | tail -12",
          )
        ).slice(-6000),
      );
    } catch {}
  } finally {
    if (!lab.busy) await lab.stop();
  }
}
process.exitCode = all ? 0 : 1;
