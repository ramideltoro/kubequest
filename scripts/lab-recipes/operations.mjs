import {
  add,
  pod,
  busy,
  deploy,
  apply,
  manifest,
  ns,
  waitPod,
  waitDeploy,
  getCheck,
  readyCheck,
  shellCheck,
  absent,
  runPod,
  report,
  contains,
  file,
} from "./helpers.mjs";
const healthy = (name = "nginx") =>
  pod(name, "nginx:1.28", {
    livenessProbe: {
      exec: { command: ["ls"] },
      initialDelaySeconds: 0,
      periodSeconds: 10,
    },
  });
for (const [i, title, delay, period] of [
  [102, "Declare a liveness check", 0, 10],
  [103, "Tune probe timing", 5, 5],
]) {
  const p = healthy();
  p.spec.containers[0].livenessProbe.initialDelaySeconds = delay;
  p.spec.containers[0].livenessProbe.periodSeconds = period;
  add(
    i,
    title,
    "A probe should express the health behavior you intend.",
    i === 103 ? manifest("pod.yaml", healthy()) : "",
    manifest("pod.yaml", p) +
      "\nkubectl apply -f pod.yaml\n" +
      waitPod("nginx"),
    [
      getCheck(
        "The exec probe is configured",
        "pod/nginx",
        '.spec.containers[0].livenessProbe.exec.command == ["ls"]',
      ),
      getCheck(
        "The probe timing matches",
        "pod/nginx",
        `(.spec.containers[0].livenessProbe.initialDelaySeconds // 0) == ${delay} and .spec.containers[0].livenessProbe.periodSeconds == ${period}`,
      ),
      readyCheck("nginx"),
    ],
    "Liveness failure requests a container restart. An ls probe illustrates exec syntax; a real application should use a check that reflects its actual health.",
    {
      brief: `Save and apply pod.yaml for nginx with an exec liveness probe running ls, initialDelaySeconds ${delay}, periodSeconds ${period}. Keep the Pod for grading; Stop lab handles cleanup.`,
    },
  );
}
const ready = pod("nginx", "nginx:1.28", {
  ports: [{ containerPort: 80 }],
  readinessProbe: { httpGet: { path: "/", port: 80 }, periodSeconds: 2 },
});
add(
  104,
  "Gate traffic on HTTP readiness",
  "A running process is not necessarily ready for requests.",
  "",
  manifest("pod.yaml", ready) +
    "\nkubectl apply -f pod.yaml\n" +
    waitPod("nginx"),
  [
    getCheck(
      "The HTTP readiness endpoint is correct",
      "pod/nginx",
      '.spec.containers[0].readinessProbe.httpGet | .path == "/" and .port == 80',
    ),
    readyCheck("nginx"),
  ],
  "Readiness controls endpoint eligibility. It does not restart a container on failure; liveness is a separate signal.",
  {
    brief:
      "Save and apply pod.yaml for nginx with HTTP readiness on / port 80. Keep the Pod for grading.",
  },
);
const failing = healthy("unhealthy");
failing.metadata.namespace = "qa";
failing.spec.containers[0].livenessProbe = {
  exec: { command: ["false"] },
  periodSeconds: 2,
  failureThreshold: 1,
};
add(
  105,
  "Find failing health checks",
  "Events identify the workloads whose liveness checks fail.",
  ns("qa") + "\n" + apply(failing) + "\nsleep 8",
  `kubectl get events -A -o json | jq -r '.items[] | select(.reason == "Unhealthy" and (.message | contains("Liveness probe failed"))) | .metadata.namespace + "/" + .involvedObject.name' | sort -u > answer.txt\ncat answer.txt`,
  [contains("qa/unhealthy")],
  "Unhealthy events include probe failures. Filter the message for liveness rather than treating every readiness failure as a restart signal.",
  {
    brief:
      "Find Pods with liveness failure events across namespaces. Save unique namespace/name lines in answer.txt. The qa namespace contains a failing fixture.",
  },
);
const logger = busy("counter", [
  "sh",
  "-c",
  'i=0; while true; do echo "$i: $(date)"; i=$((i+1)); sleep 1; done',
]);
add(
  106,
  "Read a changing log stream",
  "The process emits a new observation each second.",
  "",
  apply(logger) +
    "\n" +
    waitPod("counter") +
    "\nsleep 3\n" +
    report("kubectl logs counter"),
  [contains("0:"), contains("1:")],
  "Container logs contain the process’s standard output. Capture a bounded sample instead of leaving an endless follow session running.",
  {
    brief:
      "Create counter using busybox with an incrementing counter and date every second. Save at least its first two log lines to answer.txt.",
  },
);
for (const [i, title, command, expected] of [
  [107, "Investigate a missing path", ["ls", "/notexist"], "/notexist"],
  [
    108,
    "Investigate a missing executable",
    ["sh", "-c", "notexist"],
    "not found",
  ],
]) {
  const p = busy("broken", command);
  p.spec.restartPolicy = "Never";
  add(
    i,
    title,
    "A failed process leaves useful output behind.",
    "",
    apply(p) +
      "\nkubectl wait --for=jsonpath='{.status.phase}'=Failed pod/broken --timeout=90s\n" +
      report("kubectl logs broken") +
      "\nkubectl delete pod broken --grace-period=0 --force",
    [contains(expected), absent("The failed Pod is removed", "pod/broken")],
    "A nonzero process exit puts this Never-restarting Pod into Failed. Preserve diagnostic output before deleting it.",
    {
      brief: `Create busybox Pod broken running ${command.join(" ")}, with restartPolicy Never. Capture its failure logs in answer.txt, then delete the Pod.`,
    },
  );
}
add(
  109,
  "Read node resource usage",
  "Metrics show consumption rather than reservations.",
  "",
  report("kubectl top nodes"),
  [contains("CPU(cores)"), contains("MEMORY(bytes)")],
  "Metrics-server supplies recent resource measurements. Requests and limits describe policy; top reports observed usage.",
  {
    brief:
      "Use the installed metrics-server to save node CPU and memory utilization to answer.txt.",
  },
);
const svc = (name = "nginx", port = 80, targetPort = 80) => ({
  apiVersion: "v1",
  kind: "Service",
  metadata: { name },
  spec: { selector: { run: name }, ports: [{ port, targetPort }] },
});
const nginx = pod("nginx", "nginx:1.28", { ports: [{ containerPort: 80 }] });
const serving = runPod(nginx) + "\n" + apply(svc());
const httpCheck = (name = "nginx", port = 80) =>
  shellCheck(
    "The Service returns an HTTP response",
    `IP=$(kubectl get service ${name} -o jsonpath='{.spec.clusterIP}'); curl -fsS --max-time 5 "http://$IP:${port}" >/dev/null`,
  );
const networkWhy =
  "A Service selects Pods by labels and maps a stable service port to a container endpoint. Verify actual traffic as well as the object fields; a Service with no usable endpoints cannot deliver requests.";
add(
  110,
  "Expose the web Pod",
  "A stable Service should select the workload.",
  "",
  serving,
  [
    getCheck(
      "The Service has the correct selector",
      "service/nginx",
      '.spec.selector.run == "nginx" and .spec.ports[0].port == 80',
    ),
    httpCheck(),
  ],
  networkWhy,
  {
    brief:
      "Create nginx Pod with nginx:1.28 and expose it through ClusterIP Service nginx on port 80.",
  },
);
add(
  111,
  "Inspect Service endpoints",
  "Check both the virtual address and backing Pods.",
  serving,
  report(
    "kubectl get service nginx; kubectl get endpointslices -l kubernetes.io/service-name=nginx",
  ),
  [contains("ClusterIP"), contains("ENDPOINTS")],
  networkWhy,
  {
    brief: "Save the nginx Service and its EndpointSlice table to answer.txt.",
  },
);
add(
  112,
  "Request the Service IP",
  "Test the virtual address from inside the cluster.",
  serving,
  `IP=$(kubectl get service nginx -o jsonpath='{.spec.clusterIP}')\nkubectl run client --image=busybox:1.37 --restart=Never --command -- wget -qO- "$IP"\nkubectl wait --for=jsonpath='{.status.phase}'=Succeeded pod/client --timeout=90s\n${report("kubectl logs client")}`,
  [
    contains("Welcome to nginx"),
    getCheck(
      "The client request completed",
      "pod/client",
      '.status.phase == "Succeeded"',
    ),
  ],
  networkWhy,
  {
    brief:
      "Fetch nginx’s ClusterIP from a busybox client Pod and save the response to answer.txt.",
  },
);
add(
  113,
  "Reach a NodePort",
  "The node address and allocated port form the external endpoint.",
  serving,
  `kubectl patch service nginx --type=merge -p '{"spec":{"type":"NodePort"}}'\nNODE=$(kubectl get nodes -o json | jq -r '[.items[0].status.addresses[] | select(.type == "InternalIP" and (.address | contains(":") | not))][0].address')\nPORT=$(kubectl get service nginx -o jsonpath='{.spec.ports[0].nodePort}')\ncurl -fsS --retry 5 --retry-connrefused --retry-delay 1 "http://$NODE:$PORT" > answer.txt\ncat answer.txt`,
  [
    getCheck(
      "The Service has a NodePort",
      "service/nginx",
      '.spec.type == "NodePort" and .spec.ports[0].nodePort >= 30000',
    ),
    contains("Welcome to nginx"),
  ],
  networkWhy,
  {
    brief:
      "Convert the supplied nginx Service to NodePort. Fetch it through the practice node IP and allocated port, saving answer.txt. Keep resources for grading.",
  },
);
const foo = deploy("foo", 3, "dgkanatsios/simpleapp:latest");
foo.spec.template.spec.containers[0].ports = [{ containerPort: 8080 }];
const fooSetup = apply(foo) + "\n" + waitDeploy("foo");
const fooSvc = svc("foo", 6262, 8080);
fooSvc.spec.selector = { app: "foo" };
add(
  114,
  "Prepare a hostname service",
  "Three replicas will identify themselves in responses.",
  "",
  fooSetup,
  [
    getCheck(
      "Three replicas are available",
      "deployment/foo",
      ".spec.replicas == 3 and .status.availableReplicas == 3",
    ),
    getCheck(
      "The image and port are configured",
      "deployment/foo",
      '.spec.template.spec.containers[0] | .image == "dgkanatsios/simpleapp:latest" and .ports[0].containerPort == 8080',
    ),
    absent("No Service has been created", "service/foo"),
  ],
  networkWhy,
  {
    brief:
      "Create Deployment foo with three dgkanatsios/simpleapp:latest replicas, app=foo and container port 8080. Do not create a Service yet.",
  },
);
add(
  115,
  "Contact each replica directly",
  "Prove every endpoint responds before adding a Service.",
  fooSetup,
  `for IP in $(kubectl get pods -l app=foo -o jsonpath='{.items[*].status.podIP}'); do curl -fsS "http://$IP:8080"; echo; done > answer.txt\ncat answer.txt`,
  [
    contains("foo-"),
    shellCheck(
      "Each running Pod appears in the report",
      `for NAME in $(kubectl get pods -l app=foo -o jsonpath='{.items[*].metadata.name}'); do grep -F "$NAME" answer.txt >/dev/null; done`,
    ),
  ],
  networkWhy,
  {
    brief:
      "Fetch each foo Pod on port 8080 and save all returned hostnames to answer.txt.",
  },
);
add(
  116,
  "Map the application port",
  "Clients use 6262 while containers listen on 8080.",
  fooSetup,
  apply(fooSvc),
  [
    getCheck(
      "The port mapping is correct",
      "service/foo",
      '.spec.ports[0].port == 6262 and .spec.ports[0].targetPort == 8080 and .spec.selector.app == "foo"',
    ),
    httpCheck("foo", 6262),
  ],
  networkWhy,
  {
    brief:
      "Create Service foo with port 6262 targeting app=foo on container port 8080.",
  },
);
add(
  117,
  "Sample traffic across replicas",
  "Multiple requests can reach different backing Pods.",
  fooSetup + "\n" + apply(fooSvc),
  `IP=$(kubectl get service foo -o jsonpath='{.spec.clusterIP}')\nfor i in $(seq 1 30); do curl -fsS "http://$IP:6262"; echo; done > answer.txt\ncat answer.txt`,
  [
    contains("foo-"),
    shellCheck(
      "More than one replica answered",
      `test "$(grep -o 'foo-[a-z0-9-]*' answer.txt | sort -u | wc -l)" -ge 2`,
    ),
  ],
  "Services distribute new connections across ready endpoints; the order is not guaranteed and consecutive requests can hit the same Pod. Sample enough independent connections instead of expecting strict round-robin order.",
  {
    brief:
      "Save 30 independent HTTP responses from Service foo to answer.txt. Confirm more than one replica answered. Keep resources for grading.",
  },
);
const d = deploy("nginx", 2, "nginx:1.28");
const ds = svc();
ds.spec.selector = { app: "nginx" };
const allowed = busy("allowed");
allowed.metadata.labels = { access: "granted" };
const denied = busy("denied");
const policy = {
  apiVersion: "networking.k8s.io/v1",
  kind: "NetworkPolicy",
  metadata: { name: "web-only" },
  spec: {
    podSelector: { matchLabels: { app: "nginx" } },
    policyTypes: ["Ingress"],
    ingress: [
      {
        from: [{ podSelector: { matchLabels: { access: "granted" } } }],
        ports: [{ protocol: "TCP", port: 80 }],
      },
    ],
  },
};
add(
  118,
  "Restrict ingress to approved clients",
  "Successful requests alone do not prove isolation.",
  apply(d) +
    "\n" +
    apply(ds) +
    "\n" +
    apply(allowed) +
    "\n" +
    apply(denied) +
    "\n" +
    waitDeploy("nginx") +
    "\n" +
    waitPod("allowed") +
    "\n" +
    waitPod("denied"),
  apply(policy) +
    `\nsleep 3\nkubectl exec allowed -- wget -qO- -T 3 http://nginx`,
  [
    shellCheck(
      "The approved client can connect",
      "kubectl exec allowed -- wget -qO- -T 3 http://nginx >/dev/null",
    ),
    shellCheck(
      "The unapproved client is blocked",
      "if kubectl exec denied -- wget -qO- -T 3 http://nginx >/dev/null 2>&1; then exit 1; fi",
    ),
  ],
  "NetworkPolicies are additive. Selecting the server Pods isolates their ingress, and the allowed peer selector opens only the intended client set. Always test both allowed and denied paths.",
  {
    brief:
      "Create web-only NetworkPolicy selecting app=nginx and allowing TCP/80 only from Pods labeled access=granted. Verify allowed succeeds and denied fails.",
  },
);
const ingress = {
  apiVersion: "networking.k8s.io/v1",
  kind: "Ingress",
  metadata: { name: "web" },
  spec: {
    ingressClassName: "traefik",
    rules: [
      {
        host: "notes.lab",
        http: {
          paths: [
            {
              path: "/",
              pathType: "Prefix",
              backend: { service: { name: "nginx", port: { number: 80 } } },
            },
          ],
        },
      },
    ],
  },
};
add(
  119,
  "Route an HTTP path",
  "The Ingress controller must know the host and backend.",
  serving,
  apply(ingress) +
    `\nsleep 3\ncurl -fsS -H 'Host: notes.lab' http://127.0.0.1 > answer.txt\ncat answer.txt`,
  [
    getCheck(
      "The rule points at nginx",
      "ingress/web",
      '.spec.rules[0].host == "notes.lab" and .spec.rules[0].http.paths[0].backend.service.name == "nginx"',
    ),
    shellCheck(
      "The controller routes the request",
      "curl -fsS --max-time 5 -H 'Host: notes.lab' http://127.0.0.1 | grep -F 'Welcome to nginx' >/dev/null",
    ),
  ],
  "An Ingress object requires a controller. This environment includes Traefik; the Host header selects notes.lab without changing DNS.",
  {
    brief:
      "Create Ingress web with class traefik, host notes.lab, Prefix path / and backend nginx:80. Test through the node with the Host header.",
  },
);
const shared = busy("shared");
shared.spec.containers = [
  {
    ...shared.spec.containers[0],
    name: "first",
    volumeMounts: [{ name: "data", mountPath: "/etc/foo" }],
  },
  {
    ...shared.spec.containers[0],
    name: "second",
    volumeMounts: [{ name: "data", mountPath: "/etc/foo" }],
  },
];
shared.spec.volumes = [{ name: "data", emptyDir: {} }];
add(
  120,
  "Share a file within one Pod",
  "The containers need a common volume.",
  "",
  apply(shared) +
    "\n" +
    waitPod("shared") +
    `\nkubectl exec shared -c second -- sh -c "cut -d: -f1 /etc/passwd > /etc/foo/passwd"\nkubectl exec shared -c first -- cat /etc/foo/passwd`,
  [
    getCheck(
      "An emptyDir backs the shared mount",
      "pod/shared",
      '.spec.volumes | any(.name == "data" and .emptyDir != null)',
    ),
    shellCheck(
      "The first container reads the written file",
      "kubectl exec shared -c first -- grep -x root /etc/foo/passwd >/dev/null",
    ),
  ],
  "emptyDir belongs to the Pod lifetime. It shares files between containers in that Pod but does not preserve data when the Pod is replaced.",
  {
    brief:
      "Create shared with two busybox containers mounting one emptyDir at /etc/foo. In second, write the first column of /etc/passwd to /etc/foo/passwd; read it from first. Keep the Pod for grading.",
  },
);
const pv = {
  apiVersion: "v1",
  kind: "PersistentVolume",
  metadata: { name: "myvolume" },
  spec: {
    capacity: { storage: "10Gi" },
    accessModes: ["ReadWriteOnce", "ReadWriteMany"],
    persistentVolumeReclaimPolicy: "Retain",
    storageClassName: "normal",
    hostPath: { path: "/var/kubequest-volume", type: "DirectoryOrCreate" },
  },
};
const pvc = {
  apiVersion: "v1",
  kind: "PersistentVolumeClaim",
  metadata: { name: "mypvc" },
  spec: {
    accessModes: ["ReadWriteOnce"],
    storageClassName: "normal",
    volumeName: "myvolume",
    resources: { requests: { storage: "4Gi" } },
  },
};
const storagePod = (name) => {
  const p = busy(name);
  p.spec.containers[0].volumeMounts = [{ name: "data", mountPath: "/etc/foo" }];
  p.spec.volumes = [
    { name: "data", persistentVolumeClaim: { claimName: "mypvc" } },
  ];
  return p;
};
const storageWhy =
  "The claim binds a workload to a PersistentVolume. This single-node lab uses hostPath for practice; declaring ReadWriteMany does not make hostPath shared across machines or provide production-grade durability.";
add(
  121,
  "Offer a static volume",
  "Storage exists before a claim asks for it.",
  "",
  manifest("pv.yaml", pv) + "\nkubectl apply -f pv.yaml",
  [
    getCheck(
      "The PV has the expected capacity and class",
      "pv/myvolume",
      '.spec.capacity.storage == "10Gi" and .spec.storageClassName == "normal"',
    ),
    getCheck(
      "Both access modes are declared",
      "pv/myvolume",
      '.spec.accessModes | (index("ReadWriteOnce") != null and index("ReadWriteMany") != null)',
    ),
  ],
  storageWhy,
  {
    brief:
      "Save and apply pv.yaml for myvolume: 10Gi, class normal, ReadWriteOnce and ReadWriteMany, hostPath /var/kubequest-volume.",
  },
);
add(
  122,
  "Bind a storage claim",
  "The request must match an available volume.",
  apply(pv),
  manifest("pvc.yaml", pvc) +
    "\nkubectl apply -f pvc.yaml\nkubectl wait --for=jsonpath='{.status.phase}'=Bound pvc/mypvc --timeout=60s",
  [
    getCheck(
      "The claim bound to myvolume",
      "pvc/mypvc",
      '.status.phase == "Bound" and .spec.volumeName == "myvolume"',
    ),
    getCheck(
      "The requested capacity is 4Gi",
      "pvc/mypvc",
      '.spec.resources.requests.storage == "4Gi"',
    ),
  ],
  storageWhy,
  {
    brief:
      "Save and apply pvc.yaml for mypvc: 4Gi, ReadWriteOnce, class normal, bound explicitly to myvolume.",
  },
);
add(
  123,
  "Write through the claim",
  "Mount the claim before creating the data.",
  apply(pv) + "\n" + apply(pvc),
  manifest("pod.yaml", storagePod("writer")) +
    "\nkubectl apply -f pod.yaml\n" +
    waitPod("writer") +
    "\nkubectl exec writer -- cp /etc/passwd /etc/foo/passwd",
  [
    getCheck(
      "The Pod mounts mypvc",
      "pod/writer",
      '.spec.volumes | any(.persistentVolumeClaim.claimName == "mypvc")',
    ),
    shellCheck(
      "The file was copied to the mounted volume",
      "kubectl exec writer -- cmp /etc/passwd /etc/foo/passwd",
    ),
  ],
  storageWhy,
  {
    brief:
      "Create writer mounting mypvc at /etc/foo. Copy its /etc/passwd into the mounted directory.",
  },
);
add(
  124,
  "Read the persisted file elsewhere",
  "A second Pod should see the volume’s data.",
  apply(pv) +
    "\n" +
    apply(pvc) +
    "\n" +
    apply(storagePod("writer")) +
    "\n" +
    waitPod("writer") +
    "\nkubectl exec writer -- cp /etc/passwd /etc/foo/passwd",
  apply(storagePod("reader")) +
    "\n" +
    waitPod("reader") +
    "\n" +
    report("kubectl exec reader -- cat /etc/foo/passwd"),
  [
    getCheck(
      "The reader references the same claim",
      "pod/reader",
      '.spec.volumes | any(.persistentVolumeClaim.claimName == "mypvc")',
    ),
    contains("root:"),
  ],
  storageWhy,
  {
    brief:
      "Create reader mounting the existing mypvc at /etc/foo. Save the file written by writer to answer.txt. Keep both Pods for grading.",
  },
);
add(
  125,
  "Copy a file out of the container",
  "kubectl cp transfers data through the API.",
  runPod(busy("busybox")),
  "kubectl cp busybox:/etc/passwd ./passwd\ncat passwd",
  [
    shellCheck(
      "The copied file matches the container",
      "kubectl exec busybox -- cat /etc/passwd > /tmp/kq-expected-passwd\ncmp passwd /tmp/kq-expected-passwd",
    ),
  ],
  "kubectl cp relies on tar in the container. A copied local file is separate from a volume mount and remains available in the lab workspace.",
  {
    brief:
      "Copy /etc/passwd from the supplied busybox Pod to local file passwd.",
  },
);
