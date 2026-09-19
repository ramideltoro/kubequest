import { stringify } from "yaml";
export type KObject = Record<string, any>;
const metadata = (name: string) => ({ name, namespace: "quest" });
const probe = (name: string, role: string): KObject => ({
  apiVersion: "v1",
  kind: "Pod",
  metadata: { ...metadata(name), labels: { app: name, role } },
  spec: {
    containers: [
      {
        name: "probe",
        image: "busybox:1.37",
        imagePullPolicy: "IfNotPresent",
        command: ["sh", "-c", "sleep 86400"],
      },
    ],
  },
});
export function setupObjects(id: string): KObject[] {
  const ns = {
    apiVersion: "v1",
    kind: "Namespace",
    metadata: { name: "quest" },
  };
  const deployment: KObject = {
    apiVersion: "apps/v1",
    kind: "Deployment",
    metadata: metadata("notes"),
    spec: {
      replicas: 2,
      selector: { matchLabels: { app: "little-notes" } },
      template: {
        metadata: { labels: { app: "little-notes" } },
        spec: {
          containers: [
            {
              name: "web",
              image: "nginx:1.27-alpine",
              imagePullPolicy: "IfNotPresent",
              ports: [{ containerPort: 80 }],
              readinessProbe: {
                httpGet: { path: "/", port: 80 },
                initialDelaySeconds: 1,
                periodSeconds: 2,
              },
            },
          ],
        },
      },
    },
  };
  const service: KObject = {
    apiVersion: "v1",
    kind: "Service",
    metadata: metadata("notes"),
    spec: {
      selector: { app: "little-notes" },
      ports: [{ port: 80, targetPort: 80 }],
    },
  };
  const list: KObject[] = [
    ns,
    deployment,
    service,
    probe("probe", "frontend"),
    probe("intruder", "untrusted"),
  ];
  const pod = deployment.spec.template.spec,
    web = pod.containers[0];
  if (id === "lost-in-routing") service.spec.selector.app = "old-notes";
  if (id === "running-not-ready") web.readinessProbe.httpGet.path = "/ready";
  if (id === "configuration-drift") {
    list.push(
      {
        apiVersion: "v1",
        kind: "ConfigMap",
        metadata: metadata("notes-settings"),
        data: { greeting: "Hello from Little Notes" },
      },
      {
        apiVersion: "v1",
        kind: "Secret",
        metadata: metadata("notes-credentials"),
        stringData: { password: "practice-only-not-a-real-password" },
      },
    );
    web.env = [
      {
        name: "GREETING",
        valueFrom: {
          configMapKeyRef: { name: "notes-settings", key: "wrong-key" },
        },
      },
      {
        name: "DB_PASSWORD",
        valueFrom: {
          secretKeyRef: { name: "old-credentials", key: "password" },
        },
      },
    ];
    web.command = [
      "sh",
      "-c",
      'test -n "$DB_PASSWORD" && printf "%s" "$GREETING" > /usr/share/nginx/html/index.html && exec nginx -g "daemon off;"',
    ];
  }
  if (id === "release-rescue") {
    web.image = "nginx:missing-release";
    deployment.spec.strategy = {
      type: "RollingUpdate",
      rollingUpdate: { maxUnavailable: 2, maxSurge: 0 },
    };
  }
  if (id === "handoff-between-containers") {
    pod.volumes = [{ name: "shared", emptyDir: {} }];
    pod.initContainers = [
      {
        name: "prepare",
        image: "busybox:1.37",
        command: [
          "sh",
          "-c",
          "echo WELCOME_TO_LITTLE_NOTES > /work/index.html",
        ],
      },
    ];
    web.volumeMounts = [{ name: "shared", mountPath: "/usr/share/nginx/html" }];
  }
  if (id === "report-that-disappeared") {
    list.splice(1, 2);
    list.push(
      {
        apiVersion: "v1",
        kind: "PersistentVolumeClaim",
        metadata: metadata("reports"),
        spec: {
          accessModes: ["ReadWriteOnce"],
          storageClassName: "local-path",
          resources: { requests: { storage: "64Mi" } },
        },
      },
      {
        apiVersion: "v1",
        kind: "Pod",
        metadata: metadata("report-reader"),
        spec: {
          containers: [
            {
              name: "reader",
              image: "busybox:1.37",
              command: ["sh", "-c", "sleep 86400"],
              volumeMounts: [{ name: "data", mountPath: "/data" }],
            },
          ],
          volumes: [
            { name: "data", persistentVolumeClaim: { claimName: "reports" } },
          ],
        },
      },
      {
        apiVersion: "batch/v1",
        kind: "Job",
        metadata: metadata("daily-report"),
        spec: {
          template: {
            spec: {
              restartPolicy: "Never",
              containers: [
                {
                  name: "report",
                  image: "busybox:1.37",
                  command: ["sh", "-c", "echo DAILY_REPORT > /data/report.txt"],
                  volumeMounts: [{ name: "data", mountPath: "/data" }],
                },
              ],
              volumes: [{ name: "data", emptyDir: {} }],
            },
          },
        },
      },
    );
  }
  if (id === "least-privilege") {
    deployment.metadata.name = "notes-worker";
    deployment.spec.replicas = 1;
    deployment.spec.selector.matchLabels.app = "notes-worker";
    deployment.spec.template.metadata.labels.app = "notes-worker";
    pod.containers = [
      {
        name: "worker",
        image: "busybox:1.37",
        command: ["sh", "-c", "sleep 86400"],
      },
    ];
    list.splice(2, 1);
  }
  if (id === "open-the-right-door")
    list.push(
      {
        apiVersion: "networking.k8s.io/v1",
        kind: "NetworkPolicy",
        metadata: metadata("notes-ingress"),
        spec: {
          podSelector: { matchLabels: { app: "little-notes" } },
          policyTypes: ["Ingress"],
          ingress: [],
        },
      },
      {
        apiVersion: "networking.k8s.io/v1",
        kind: "Ingress",
        metadata: metadata("notes"),
        spec: {
          ingressClassName: "traefik",
          rules: [
            {
              host: "notes.quest.test",
              http: {
                paths: [
                  {
                    path: "/",
                    pathType: "Prefix",
                    backend: {
                      service: { name: "old-notes", port: { number: 80 } },
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    );
  return list;
}
export const setupYaml = (id: string) =>
  setupObjects(id)
    .map((o) => stringify(o))
    .join("---\n");
export type Check = { label: string; passed: boolean; detail: string };
function quantity(q: any) {
  const m = String(q ?? "").match(/^(\d+(?:\.\d+)?)(m|Ki|Mi|Gi|K|M|G)?$/);
  return m
    ? Number(m[1]) *
        ({
          m: 0.001,
          Ki: 1024,
          Mi: 1048576,
          Gi: 1073741824,
          K: 1000,
          M: 1000000,
          G: 1000000000,
        }[m[2]] ?? 1)
    : 0;
}
export function evaluate(
  id: string,
  items: KObject[],
  evidence: Record<string, string>,
): Check[] {
  const get = (kind: string, name: string) =>
    items.find((x) => x.kind === kind && x.metadata.name === name);
  const dep = get(
    "Deployment",
    id === "least-privilege" ? "notes-worker" : "notes",
  );
  const pod = dep?.spec?.template?.spec;
  const web = pod?.containers?.find(
    (c: any) => c.name === (id === "least-privilege" ? "worker" : "web"),
  );
  const svc = get("Service", "notes");
  const ready =
    !!dep &&
    (dep.status?.readyReplicas ?? 0) >= dep.spec.replicas &&
    dep.status?.observedGeneration >= dep.metadata.generation;
  const check = (label: string, passed: any, detail: string): Check => ({
    label,
    passed: !!passed,
    detail,
  });
  const port80 = (port: any) =>
    port === 80 ||
    (typeof port === "string" &&
      web?.ports?.some((p: any) => p.name === port && p.containerPort === 80));
  const http = check(
    "HTTP request succeeds",
    evidence.http?.includes("200"),
    "An actual request must return HTTP 200.",
  );
  if (id === "lost-in-routing")
    return [
      check(
        "Two ready application replicas",
        ready &&
          dep.spec.replicas === 2 &&
          dep.spec.template.metadata.labels.app === "little-notes",
        "Keep two ready Pods labeled app=little-notes.",
      ),
      check(
        "Service selects the application",
        svc?.spec.selector?.app === "little-notes",
        "Match app=little-notes.",
      ),
      check(
        "Service port mapping",
        svc?.spec.ports?.some(
          (p: any) => p.port === 80 && port80(p.targetPort ?? p.port),
        ),
        "Expose 80 and route to the web port.",
      ),
      http,
    ];
  if (id === "running-not-ready")
    return [
      check(
        "Two ready replicas",
        ready && dep.spec.replicas === 2,
        "The rollout must become ready.",
      ),
      check(
        "Readiness probe",
        web?.readinessProbe?.httpGet?.path === "/" &&
          port80(web?.readinessProbe?.httpGet?.port),
        "HTTP / on port 80.",
      ),
      check(
        "Liveness probe",
        web?.livenessProbe?.httpGet?.path === "/" &&
          port80(web?.livenessProbe?.httpGet?.port),
        "HTTP / on port 80.",
      ),
      http,
    ];
  if (id === "configuration-drift") {
    const ref = (n: string) => web?.env?.find((x: any) => x.name === n);
    const cm = ref("GREETING")?.valueFrom?.configMapKeyRef;
    const secret = ref("DB_PASSWORD")?.valueFrom?.secretKeyRef;
    return [
      check(
        "ConfigMap reference",
        cm?.name === "notes-settings" && cm?.key === "greeting",
        "Use GREETING from notes-settings/greeting.",
      ),
      check(
        "Secret reference",
        secret?.name === "notes-credentials" && secret?.key === "password",
        "Use DB_PASSWORD from notes-credentials/password; no literal credential.",
      ),
      check(
        "Two ready replicas",
        ready && dep.spec.replicas === 2,
        "New containers must start successfully.",
      ),
      check(
        "Configured greeting served",
        evidence.body?.includes("Hello from Little Notes"),
        "HTTP response must contain the configured greeting.",
      ),
    ];
  }
  if (id === "release-rescue")
    return [
      check(
        "Correct release image",
        /^((docker.io\/)?library\/)?nginx:1\.27-alpine(?:@sha256:[a-f0-9]+)?$/.test(
          web?.image ?? "",
        ),
        "Use the preloaded nginx:1.27-alpine image.",
      ),
      check(
        "Two ready replicas",
        ready && dep.spec.replicas === 2,
        "Wait for the replacement rollout.",
      ),
      check(
        "Safe rolling strategy",
        dep?.spec.strategy?.type === "RollingUpdate" &&
          [0, "0", "0%"].includes(
            dep?.spec.strategy?.rollingUpdate?.maxUnavailable,
          ) &&
          [1, "1"].includes(dep?.spec.strategy?.rollingUpdate?.maxSurge),
        "maxUnavailable 0; maxSurge 1.",
      ),
      http,
    ];
  if (id === "handoff-between-containers") {
    const init = pod?.initContainers?.[0];
    const mount = init?.volumeMounts?.find((v: any) => v.mountPath === "/work");
    const shared = pod?.volumes?.find((v: any) => v.name === mount?.name);
    return [
      check(
        "Init container completes",
        !!init && ready,
        "Keep the init-container pattern and complete the rollout.",
      ),
      check(
        "Init mounts shared emptyDir",
        mount && shared?.emptyDir !== undefined,
        "Mount an emptyDir at /work.",
      ),
      check(
        "Web uses the same volume",
        web?.volumeMounts?.some(
          (v: any) =>
            v.name === mount?.name && v.mountPath === "/usr/share/nginx/html",
        ),
        "Serve the shared directory.",
      ),
      check(
        "Generated page served",
        evidence.body?.includes("WELCOME_TO_LITTLE_NOTES"),
        "Verify content through the Service.",
      ),
    ];
  }
  if (id === "report-that-disappeared") {
    const pvc = get("PersistentVolumeClaim", "reports"),
      job = get("Job", "daily-report"),
      p = job?.spec.template.spec;
    const vol = p?.volumes?.find(
      (v: any) => v.persistentVolumeClaim?.claimName === "reports",
    );
    return [
      check(
        "PVC is Bound",
        pvc?.status?.phase === "Bound",
        "Use the existing reports claim.",
      ),
      check(
        "Job mounts the PVC",
        vol &&
          p?.containers?.some((c: any) =>
            c.volumeMounts?.some(
              (m: any) => m.name === vol.name && m.mountPath === "/data",
            ),
          ),
        "Mount reports at /data.",
      ),
      check(
        "Job completed",
        job?.status?.conditions?.some(
          (c: any) => c.type === "Complete" && c.status === "True",
        ),
        "Job must finish successfully.",
      ),
      check(
        "Report persists for another Pod",
        evidence.report?.trim() === "DAILY_REPORT",
        "Read the report from report-reader, not the Job log.",
      ),
    ];
  }
  if (id === "least-privilege") {
    const s = web?.securityContext;
    const r = web?.resources;
    return [
      check(
        "Non-root without escalation",
        (s?.runAsUser ?? pod?.securityContext?.runAsUser) === 1000 &&
          (s?.runAsNonRoot ?? pod?.securityContext?.runAsNonRoot) === true &&
          s?.allowPrivilegeEscalation === false,
        "Set all three identity/escalation controls.",
      ),
      check(
        "Capabilities and token removed",
        s?.capabilities?.drop?.includes("ALL") &&
          pod?.automountServiceAccountToken === false,
        "Drop ALL; disable automatic API token mounting.",
      ),
      check(
        "Bounded CPU and memory",
        ["cpu", "memory"].every(
          (k) =>
            quantity(r?.requests?.[k]) > 0 &&
            quantity(r?.limits?.[k]) >= quantity(r?.requests?.[k]),
        ),
        "Set positive requests and limits, with requests ≤ limits.",
      ),
      check(
        "Worker runs as UID 1000",
        ready && dep?.spec.replicas === 1 && evidence.uid?.trim() === "1000",
        "Verify the running process identity and availability.",
      ),
    ];
  }
  const ing = get("Ingress", "notes");
  return [
    check(
      "Ingress isolation configured",
      items.some(
        (x) =>
          x.kind === "NetworkPolicy" &&
          x.spec?.podSelector?.matchLabels?.app === "little-notes" &&
          x.spec?.policyTypes?.includes("Ingress"),
      ),
      "Apply an ingress policy to the notes Pods.",
    ),
    check(
      "Frontend allowed; intruder blocked",
      evidence.allowed === "yes" && evidence.denied === "yes",
      "Test from two real Pods; a broken Service alone must not pass.",
    ),
    check(
      "Correct Ingress route",
      ing?.spec.rules?.some(
        (r: any) =>
          r.host === "notes.quest.test" &&
          r.http?.paths?.some(
            (p: any) =>
              p.backend?.service?.name === "notes" &&
              p.backend?.service?.port?.number === 80,
          ),
      ),
      "Route notes.quest.test to notes:80.",
    ),
    check(
      "Ingress responds",
      evidence.ingress?.includes("200"),
      "Send a Host-header request to the ingress controller.",
    ),
  ];
}
