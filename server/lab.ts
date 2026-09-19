import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, existsSync, rmSync, mkdirSync } from "node:fs";
import { Client } from "ssh2";
import { randomUUID } from "node:crypto";
import { setupYaml, evaluate, type KObject } from "./scenarios.ts";
const exec = promisify(execFile),
  sleep = (n: number) => new Promise((r) => setTimeout(r, n));
export type Session = {
  id: string;
  missionId: string;
  mode: "guided" | "independent" | "timed";
  status: "starting" | "ready" | "error" | "submitted";
  startedAt: number;
  lastActivity: number;
  expiresAt: number;
  deadline: number | null;
  message: string;
};
export class Lab {
  dir = process.env.LAB_DIR || "/var/lib/kubequest/lab";
  session: Session | null = null;
  connections = new Set<Client>();
  busy = false;
  operation = false;
  timer: ReturnType<typeof setInterval> | null = null;
  get available() {
    return existsSync(this.dir + "/template.qcow2");
  }
  async initialize() {
    if (this.available) {
      await this.destroy();
    }
    this.timer = setInterval(() => {
      if (this.session && !this.busy && Date.now() > this.session.expiresAt)
        this.stop().catch(() => {});
    }, 10000);
    this.timer.unref();
  }
  touch() {
    if (this.session)
      ((this.session.lastActivity = Date.now()),
        (this.session.expiresAt = Date.now() + 30 * 60 * 1000));
  }
  async connection(user = "root"): Promise<Client> {
    const key = readFileSync(this.dir + "/id_ed25519");
    const known = readFileSync(this.dir + "/known_hosts", "utf8")
      .split("\n")
      .filter((l) => l && !l.startsWith("#"))
      .map((l) => l.split(/\s+/)[2]);
    return await new Promise((resolve, reject) => {
      const c = new Client();
      c.once("ready", () => {
        this.connections.add(c);
        c.on("close", () => this.connections.delete(c));
        resolve(c);
      })
        .on("error", reject)
        .connect({
          host: "127.0.0.1",
          port: 22240,
          username: user,
          privateKey: key,
          hostVerifier: (k: Buffer) => known.includes(k.toString("base64")),
          readyTimeout: 6000,
        });
    });
  }
  async command(command: string, input = "", timeout = 20000): Promise<string> {
    const c = await this.connection();
    return await new Promise((resolve, reject) => {
      let out = "";
      const timer = setTimeout(() => {
        c.end();
        reject(Error("Lab command timed out"));
      }, timeout);
      c.exec(command, (err, s) => {
        if (err) {
          clearTimeout(timer);
          c.end();
          return reject(err);
        }
        s.on("data", (d: Buffer) => {
          out += d.toString();
          if (out.length > 2_000_000) {
            s.close();
          }
        });
        s.stderr.on("data", (d: Buffer) => {
          out += d.toString();
        });
        s.on("close", (code: number) => {
          clearTimeout(timer);
          c.end();
          code === 0
            ? resolve(out)
            : reject(Error(out.slice(-3000) || "Lab command failed"));
        });
        s.end(input);
      });
    });
  }
  async destroy() {
    for (const c of this.connections) c.end();
    this.connections.clear();
    if (existsSync(this.dir + "/session.pid")) {
      const pid = Number(readFileSync(this.dir + "/session.pid", "utf8"));
      if (pid > 1) {
        try {
          const args = readFileSync(`/proc/${pid}/cmdline`, "utf8");
          if (
            args.includes("qemu-system") &&
            args.includes(this.dir + "/session.qcow2")
          ) {
            process.kill(pid, "SIGTERM");
            for (let i = 0; i < 50; i++) {
              try {
                process.kill(pid, 0);
                await sleep(100);
              } catch {
                break;
              }
            }
          }
        } catch {}
      }
      rmSync(this.dir + "/session.pid", { force: true });
    }
    rmSync(this.dir + "/session.qcow2", { force: true });
  }
  async start(missionId: string, mode: Session["mode"], minutes: number) {
    if (this.session || this.busy)
      throw Error("A lab is already active. Stop it before starting another.");
    if (!this.available) throw Error("Lab template is not installed.");
    this.busy = true;
    const now = Date.now();
    this.session = {
      id: randomUUID(),
      missionId,
      mode,
      status: "starting",
      startedAt: now,
      lastActivity: now,
      expiresAt: now + 30 * 60 * 1000,
      deadline: null,
      message: "Booting your disposable Kubernetes environment…",
    };
    void this.boot(minutes);
    return this.session;
  }
  async boot(minutes: number) {
    try {
      await this.destroy();
      mkdirSync(this.dir, { recursive: true });
      await exec("qemu-img", [
        "create",
        "-f",
        "qcow2",
        "-F",
        "qcow2",
        "-b",
        this.dir + "/template.qcow2",
        this.dir + "/session.qcow2",
      ]);
      await exec("qemu-system-x86_64", [
        "-enable-kvm",
        "-cpu",
        "host",
        "-smp",
        "4",
        "-m",
        "8192",
        "-drive",
        `file=${this.dir}/session.qcow2,if=virtio,format=qcow2`,
        "-netdev",
        "user,id=n1,restrict=on,ipv6=off,hostfwd=tcp:127.0.0.1:22240-:22",
        "-device",
        "virtio-net-pci,netdev=n1",
        "-display",
        "none",
        "-serial",
        `file:${this.dir}/session-serial.log`,
        "-daemonize",
        "-pidfile",
        this.dir + "/session.pid",
      ]);
      let ready = false;
      for (let i = 0; i < 75; i++) {
        try {
          await this.command(
            'ip route replace default via 10.0.2.2 dev ens3; systemctl is-active --quiet k3s && test -s /run/flannel/subnet.env && kubectl get nodes --no-headers | grep " Ready "',
          );
          ready = true;
          break;
        } catch {
          await sleep(2000);
        }
      }
      if (!ready)
        throw Error("Kubernetes did not become ready. Reset the lab to retry.");
      await this.command(
        "kubectl create namespace quest --dry-run=client -o yaml | kubectl apply -f -; for i in $(seq 1 40); do kubectl get serviceaccount default -n quest >/dev/null 2>&1 && exit 0; sleep 1; done; exit 1",
        "",
        45000,
      );
      await this.command(
        "kubectl apply -f -",
        setupYaml(this.session!.missionId),
        60000,
      );
      await this.command(
        'kubectl config set-context --current --namespace=quest >/dev/null; su - student -c "KUBECONFIG=/home/student/.kube/config kubectl config set-context --current --namespace=quest" >/dev/null',
      );
      await this.command(
        "kubectl wait -n quest --for=condition=Ready pod/probe pod/intruder --timeout=90s",
        "",
        100000,
      );
      this.session!.status = "ready";
      this.session!.startedAt = Date.now();
      this.session!.deadline =
        this.session!.mode === "timed" ? Date.now() + minutes * 60000 : null;
      this.session!.message = "Your lab is ready. Namespace: quest.";
      this.touch();
    } catch (e) {
      if (this.session) {
        this.session.status = "error";
        this.session.message = "Lab setup failed. Reset to try again.";
      }
      console.error("lab_boot_failed", String(e).slice(0, 300));
    } finally {
      this.busy = false;
    }
  }
  async stop() {
    if (this.busy || this.operation)
      throw Error("Wait for the current lab operation to finish.");
    this.busy = true;
    try {
      await this.destroy();
      this.session = null;
    } finally {
      this.busy = false;
    }
  }
  async reset(minutes: number) {
    if (!this.session) throw Error("No active lab.");
    const { missionId, mode } = this.session;
    await this.stop();
    return this.start(missionId, mode, minutes);
  }
  async items(): Promise<KObject[]> {
    return JSON.parse(
      await this.command(
        "kubectl get deployments,pods,services,endpointslices,configmaps,pvc,jobs,networkpolicies,ingresses -n quest -o json",
      ),
    ).items;
  }
  async snapshot() {
    const items = await this.items();
    return items
      .filter((x) =>
        [
          "Pod",
          "Deployment",
          "Service",
          "Job",
          "PersistentVolumeClaim",
          "Ingress",
          "NetworkPolicy",
        ].includes(x.kind),
      )
      .map((x) => ({
        kind: x.kind,
        name: x.metadata.name,
        labels: x.metadata.labels || {},
        selector: x.spec?.selector || {},
        phase: x.status?.phase || "",
        ready:
          x.kind === "Pod"
            ? !!x.status?.conditions?.some(
                (c: any) => c.type === "Ready" && c.status === "True",
              )
            : (x.status?.readyReplicas ?? 0),
        replicas: x.spec?.replicas ?? 0,
        reason:
          x.status?.containerStatuses
            ?.map((c: any) => c.state?.waiting?.reason)
            .filter(Boolean)
            .join(", ") || "",
        restarts:
          x.status?.containerStatuses?.reduce(
            (n: number, c: any) => n + c.restartCount,
            0,
          ) || 0,
      }));
  }
  async grade() {
    const id = this.session!.missionId;
    const evidence: Record<string, string> = {};
    const safe = async (k: string, cmd: string) => {
      try {
        evidence[k] = (await this.command(cmd, "", 12000)).trim();
      } catch {
        evidence[k] = "";
      }
    };
    if (
      ![
        "report-that-disappeared",
        "least-privilege",
        "open-the-right-door",
      ].includes(id)
    ) {
      await safe(
        "http",
        "IP=$(kubectl get svc notes -n quest -o jsonpath='{.spec.clusterIP}'); curl -sS --max-time 4 -o /dev/null -w '%{http_code}' http://$IP",
      );
      await safe(
        "body",
        "IP=$(kubectl get svc notes -n quest -o jsonpath='{.spec.clusterIP}'); curl -sS --max-time 4 http://$IP",
      );
    }
    if (id === "report-that-disappeared")
      await safe(
        "report",
        "kubectl exec -n quest report-reader -- cat /data/report.txt",
      );
    if (id === "least-privilege")
      await safe(
        "uid",
        "kubectl exec -n quest deployment/notes-worker -- id -u",
      );
    if (id === "open-the-right-door") {
      await safe(
        "allowed",
        "kubectl exec -n quest probe -- wget -q -T 3 -O /dev/null http://notes >/dev/null 2>&1 && echo yes",
      );
      await safe(
        "denied",
        "kubectl wait -n quest --for=condition=Ready pod/intruder --timeout=2s >/dev/null && kubectl exec -n quest intruder -- sh -c 'wget -q -T 3 -O /dev/null http://notes >/dev/null 2>&1; test $? -ne 0 && echo yes'",
      );
      await safe(
        "ingress",
        "curl -sS --max-time 4 -o /dev/null -w '%{http_code}' -H 'Host: notes.quest.test' http://127.0.0.1",
      );
    }
    return evaluate(id, await this.items(), evidence);
  }
}
