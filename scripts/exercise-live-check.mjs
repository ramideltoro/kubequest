import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(execFile);
const lab = process.env.LAB_DIR;
if (!lab || !lab.endsWith("/exercise-qa"))
  throw Error("Use the dedicated exercise-qa VM, never the production guest.");
const recipes = JSON.parse(await fs.readFile(process.argv[2], "utf8"));
const output = process.argv[3];
await fs.mkdir(output, { recursive: true });
async function command(script, user = "root", timeout = 200000) {
  const result = await new Promise((resolve, reject) => {
    const child = execFile(
      "ssh",
      [
        "-i",
        lab + "/id_ed25519",
        "-p",
        process.env.LAB_SSH_PORT || "22241",
        "-o",
        "StrictHostKeyChecking=yes",
        "-o",
        "HostKeyAlias=[127.0.0.1]:22240",
        "-o",
        "UserKnownHostsFile=" + lab + "/known_hosts",
        user + "@127.0.0.1",
        "bash -s",
      ],
      { timeout, maxBuffer: 2e6 },
      (err, stdout, stderr) =>
        err
          ? reject(Error((stdout + "\n" + stderr).slice(-6000)))
          : resolve(stdout + stderr),
    );
    child.stdin.end(
      "set -euo pipefail\ncd /home/student\nexport KUBECONFIG=" +
        (user === "root"
          ? "/etc/rancher/k3s/k3s.yaml"
          : "/home/student/.kube/config") +
        "\nexport HELM_CONFIG_HOME=/home/student/.config/helm HELM_CACHE_HOME=/home/student/.cache/helm HELM_DATA_HOME=/home/student/.local/share/helm\n" +
        script +
        "\n",
    );
  });
  return result;
}
const reset = `
# Each recipe normally starts in a fresh VM; remove prior Podman task state in this batch runner.
for c in $(/usr/bin/podman ps -a --format '{{.Names}}'); do
 case "$c" in lab-registry|lab-private-registry) ;; *) /usr/bin/podman rm -f "$c" >/dev/null;; esac
done
/usr/bin/podman rmi -f localhost/simpleapp localhost:5000/simpleapp localhost:5001/simpleapp >/dev/null 2>&1 || true

for n in $(kubectl get ns -o json | jq -r '.items[].metadata.name | select(. != "default" and . != "kube-system" and . != "kube-public" and . != "kube-node-lease")'); do
 kubectl delete pods --all -n "$n" --force --grace-period=0 --wait=false >/dev/null 2>&1 || true
 kubectl delete ns "$n" --wait=true --timeout=90s >/dev/null
done
kubectl delete pv myvolume --ignore-not-found --wait=false >/dev/null
kubectl delete crd operators.stable.example.com --ignore-not-found --wait=false >/dev/null
NODE=$(kubectl get nodes -o jsonpath='{.items[0].metadata.name}')
kubectl taint node "$NODE" tier- >/dev/null 2>&1 || true
kubectl label node "$NODE" accelerator- kubequest/target- >/dev/null 2>&1 || true
find /home/student -mindepth 1 -maxdepth 1 ! -name .kube ! -name .ssh ! -name .bashrc ! -name .profile ! -name .bash_logout -exec rm -rf -- {} +
kubectl create namespace quest >/dev/null
kubectl config set-context --current --namespace=quest >/dev/null
su - student -c 'KUBECONFIG=/home/student/.kube/config kubectl config set-context --current --namespace=quest' >/dev/null
for i in $(seq 1 30); do kubectl get serviceaccount default -n quest >/dev/null 2>&1 && break; sleep 1; done
`;
let failures = 0;
for (const r of recipes.filter(
  (r) =>
    !process.env.ONLY_LABS ||
    process.env.ONLY_LABS.split(",").includes(String(r.i)),
)) {
  if (process.env.SKIP_PASSED === "1") {
    try {
      const old = JSON.parse(await fs.readFile(output + "/" + r.id + ".json"));
      if (old.after.every((c) => c.passed)) continue;
    } catch {}
  }
  console.log("START", r.i, r.id);
  const transcript = [];
  try {
    await command(reset);
    await command(r.setup + "\nchown -R student:student /home/student");
    const grade = async () => {
      const checks = [];
      for (const c of r.checks) {
        try {
          await command(c.command);
          checks.push({
            label: c.label,
            passed: true,
            detail: "Verified against the disposable environment.",
          });
        } catch {
          checks.push({
            label: c.label,
            passed: false,
            detail: "The expected result is not present yet.",
          });
        }
      }
      return checks;
    };
    const before = await grade();
    if (before.every((c) => c.passed))
      throw Error("Initial state already passes every check");
    transcript.push({
      title: "Inspect the starting environment",
      command:
        r.inspect || "kubectl get pods,deployments,services,jobs -n quest",
      output: await command(
        r.inspect || "kubectl get pods,deployments,services,jobs -n quest",
        "student",
      ),
    });
    transcript.push({
      title: "Complete the task",
      command: r.solution,
      output: await command(r.solution, "student", 240000),
    });
    let after = await grade();
    for (let n = 0; n < 6 && !after.every((c) => c.passed); n++) {
      await new Promise((r) => setTimeout(r, 2000));
      after = await grade();
    }
    transcript.push({
      title: "Run behavioral checks",
      command: "KubeQuest: Check my work",
      output: after
        .map((c) => (c.passed ? "PASS" : "FAIL") + " " + c.label)
        .join("\n"),
    });
    await fs.writeFile(
      output + "/" + r.id + ".json",
      JSON.stringify(
        { mission: r.id, title: r.title, before, after, transcript },
        null,
        2,
      ),
    );
    if (!after.every((c) => c.passed))
      throw Error(
        "Failed checks: " +
          after
            .filter((c) => !c.passed)
            .map((c) => c.label)
            .join(", "),
      );
    console.log("PASS", r.i, r.id);
  } catch (e) {
    failures++;
    console.log("FAIL", r.i, r.id, String(e));
    await fs.writeFile(output + "/" + r.id + ".failure.txt", String(e));
  }
}
console.log("FINISHED", recipes.length, "definitions;", failures, "failures");
process.exitCode = failures ? 1 : 0;
