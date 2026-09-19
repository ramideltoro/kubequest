import { Lab } from "../server/lab.ts";
import { missions } from "../content/missions.ts";
const quote = (s: string) => "'" + s.replaceAll("'", "'\\''") + "'";
export async function variants(lab: Lab, id: string) {
  const patch = async (kind: string, name: string, body: any, type = "merge") =>
    lab.command(
      `kubectl patch ${kind} ${name} -n quest --type=${type} -p ${quote(JSON.stringify(body))}`,
    );
  const web = (body: any) =>
    patch(
      "deployment",
      "notes",
      {
        spec: {
          template: { spec: { containers: [{ name: "web", ...body }] } },
        },
      },
      "strategic",
    );
  const restore = () =>
    lab.command("bash -s", missions.find((m) => m.id === id)!.solution, 150000);
  const wait = async () => {
    await new Promise((r) => setTimeout(r, 3000));
    for (let i = 0; i < 24; i++) {
      if ((await lab.grade()).every((c) => c.passed)) return;
      await new Promise((r) => setTimeout(r, 2000));
    }
    throw Error("Alternative solution failed");
  };
  const rejected = async () => {
    if ((await lab.grade()).every((c) => c.passed))
      throw Error("Superficial repair passed");
    console.log("PASS incomplete repair rejected", id);
  };
  if (id === "lost-in-routing") {
    await patch("service", "notes", { spec: { selector: { app: "wrong" } } });
    await rejected();
    await restore();
    await web({ ports: [{ name: "site", containerPort: 80 }] });
    await patch("service", "notes", {
      spec: { ports: [{ port: 80, targetPort: "site" }] },
    });
  } else if (id === "running-not-ready") {
    await web({ readinessProbe: null });
    await rejected();
    await restore();
    await web({
      ports: [{ name: "site", containerPort: 80 }],
      readinessProbe: { httpGet: { path: "/", port: "site" } },
      livenessProbe: { httpGet: { path: "/", port: "site" } },
    });
  } else if (id === "configuration-drift") {
    await web({
      env: [
        {
          name: "DB_PASSWORD",
          valueFrom: null,
          value: "practice-only-not-a-real-password",
        },
      ],
    });
    await rejected();
    await restore();
    await web({
      env: [
        {
          name: "GREETING",
          valueFrom: {
            configMapKeyRef: {
              name: "notes-settings",
              key: "greeting",
              optional: false,
            },
          },
        },
        {
          name: "DB_PASSWORD",
          valueFrom: {
            secretKeyRef: {
              name: "notes-credentials",
              key: "password",
              optional: false,
            },
          },
        },
      ],
    });
  } else if (id === "release-rescue") {
    await patch("deployment", "notes", {
      spec: { strategy: { rollingUpdate: { maxUnavailable: 2 } } },
    });
    await rejected();
    await restore();
    await patch("deployment", "notes", {
      spec: { strategy: { rollingUpdate: { maxUnavailable: "0%" } } },
    });
    await web({ image: "docker.io/library/nginx:1.27-alpine" });
  } else if (id === "handoff-between-containers") {
    await patch(
      "deployment",
      "notes",
      {
        spec: {
          template: {
            spec: { initContainers: [{ name: "prepare", volumeMounts: null }] },
          },
        },
      },
      "strategic",
    );
    await rejected();
    await restore();
    await patch("deployment", "notes", {
      spec: {
        template: {
          spec: {
            volumes: [{ name: "renamed-data", emptyDir: {} }],
            initContainers: [
              {
                name: "prepare",
                image: "busybox:1.37",
                command: [
                  "sh",
                  "-c",
                  "echo WELCOME_TO_LITTLE_NOTES > /work/index.html",
                ],
                volumeMounts: [{ name: "renamed-data", mountPath: "/work" }],
              },
            ],
            containers: [
              {
                name: "web",
                image: "nginx:1.27-alpine",
                volumeMounts: [
                  { name: "renamed-data", mountPath: "/usr/share/nginx/html" },
                ],
              },
            ],
          },
        },
      },
    });
  } else if (id === "report-that-disappeared") {
    await lab.command(
      "kubectl exec -n quest report-reader -- sh -c " +
        quote("echo WRONG > /data/report.txt"),
    );
    await rejected();
    await restore();
    const job = JSON.parse(
      await lab.command("kubectl get job daily-report -n quest -o json"),
    );
    job.metadata = { name: "daily-report", namespace: "quest" };
    delete job.status;
    delete job.spec.selector;
    delete job.spec.template.metadata;
    job.spec.template.spec.volumes = [
      { name: "archive", persistentVolumeClaim: { claimName: "reports" } },
    ];
    job.spec.template.spec.containers[0].volumeMounts = [
      { name: "archive", mountPath: "/data" },
    ];
    await lab.command("kubectl delete job daily-report -n quest");
    await lab.command("kubectl apply -f -", JSON.stringify(job));
  } else if (id === "least-privilege") {
    await patch("deployment", "notes-worker", {
      spec: { template: { spec: { automountServiceAccountToken: true } } },
    });
    await rejected();
    await restore();
    await patch(
      "deployment",
      "notes-worker",
      {
        spec: {
          template: {
            spec: {
              securityContext: { runAsUser: 1000, runAsNonRoot: true },
              containers: [
                {
                  name: "worker",
                  securityContext: { runAsUser: null, runAsNonRoot: null },
                  resources: {
                    requests: { cpu: "0.05", memory: "33554432" },
                    limits: { cpu: "0.2", memory: "67108864" },
                  },
                },
              ],
            },
          },
        },
      },
      "strategic",
    );
  } else {
    await patch("networkpolicy", "notes-ingress", { spec: { ingress: [{}] } });
    await new Promise((r) => setTimeout(r, 3000));
    await rejected();
    await restore();
    const policy = JSON.parse(
      await lab.command(
        "kubectl get networkpolicy notes-ingress -n quest -o json",
      ),
    );
    policy.metadata = { name: "frontend-only", namespace: "quest" };
    policy.spec.ingress[0].from = policy.spec.ingress[0].from.slice(0, 1);
    await lab.command("kubectl apply -f -", JSON.stringify(policy));
    await patch("networkpolicy", "notes-ingress", {
      spec: {
        ingress: [
          {
            from: [
              {
                namespaceSelector: {
                  matchLabels: { "kubernetes.io/metadata.name": "kube-system" },
                },
              },
            ],
            ports: [{ port: 80, protocol: "TCP" }],
          },
        ],
      },
    });
  }
  await wait();
  console.log("PASS valid alternative", id);
}
