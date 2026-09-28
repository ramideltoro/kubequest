import {
  add,
  pod,
  busy,
  apply,
  manifest,
  ns,
  waitPod,
  getCheck,
  readyCheck,
  shellCheck,
  absent,
  runPod,
  report,
  contains,
  reportCheck,
  file,
} from "./helpers.mjs";
const whyPod =
  "A namespace scopes names. The API stores the Pod specification, then the scheduler and kubelet turn that desired state into a running container. An accepted manifest alone does not prove readiness.";
for (const i of [0, 1]) {
  const p = pod();
  p.metadata.namespace = "mynamespace";
  add(
    i,
    i ? "Declare the namespaced Pod" : "A home for the first Pod",
    i
      ? "The manifest should describe exactly what you intend to run."
      : "The team needs its workload separated by namespace.",
    "",
    `${ns("mynamespace")}\n${manifest("pod.yaml", p)}\nkubectl apply -f pod.yaml\n${waitPod("nginx", "mynamespace")}`,
    [
      getCheck(
        "nginx uses the provided nginx image",
        "pod/nginx",
        '.spec.containers[0].image == "nginx:1.28"',
        "mynamespace",
      ),
      readyCheck("nginx", "mynamespace"),
    ],
    whyPod,
    {
      namespace: "mynamespace",
      brief:
        "Create namespace mynamespace and an nginx Pod named nginx in it. Use the preloaded nginx:1.28 image. Save pod.yaml as well as applying it.",
      starter: manifest("pod.yaml", p),
    },
  );
}
for (const i of [2, 3]) {
  const p = busy("env-reader", ["env"]);
  p.spec.restartPolicy = "Never";
  add(
    i,
    i === 2
      ? "Read a container’s environment"
      : "Declare an environment inspection",
    "A short-lived container can reveal its environment without a long-running service.",
    "",
    `${manifest("env.yaml", p)}\nkubectl apply -f env.yaml\nkubectl wait --for=jsonpath='{.status.phase}'=Succeeded pod/env-reader --timeout=90s\n${report("kubectl logs env-reader")}`,
    [
      getCheck(
        "The env process completed",
        "pod/env-reader",
        '.status.phase == "Succeeded" and .spec.restartPolicy == "Never"',
      ),
      contains("HOSTNAME=env-reader"),
    ],
    "The env process prints its environment and exits. restartPolicy Never preserves completion instead of repeatedly restarting a successful one-shot command.",
    {
      brief:
        "Run a busybox:1.37 Pod named env-reader with command env and restartPolicy Never. Save its logs to answer.txt.",
    },
  );
}
add(
  4,
  "Preview a namespace",
  "Prepare a manifest without changing the cluster.",
  "",
  `kubectl create namespace myns --dry-run=client -o yaml > namespace.yaml\ncat namespace.yaml`,
  [
    shellCheck(
      "namespace.yaml declares myns",
      'kubectl create --dry-run=client -f namespace.yaml -o json | jq -e \'.kind == "Namespace" and .metadata.name == "myns"\' >/dev/null',
    ),
    absent("myns was not created", "namespace/myns"),
  ],
  "Client dry-run generates an object locally. Redirecting it to a file lets you inspect or review it before applying.",
  {
    brief:
      "Write namespace.yaml for Namespace myns using client dry-run. Do not create the namespace.",
  },
);
add(
  5,
  "Budget before admission",
  "Review a ResourceQuota before it can reject workloads.",
  "",
  `kubectl create quota myrq --hard=cpu=1,memory=1G,pods=2 --dry-run=client -o yaml > quota.yaml\ncat quota.yaml`,
  [
    shellCheck(
      "The quota file contains all three limits",
      `kubectl create --dry-run=client -f quota.yaml -o json | jq -e '.kind == "ResourceQuota" and .metadata.name == "myrq" and .spec.hard.cpu == "1" and .spec.hard.memory == "1G" and .spec.hard.pods == "2"' >/dev/null`,
    ),
    absent("The quota is not active", "quota/myrq"),
  ],
  "A quota limits aggregate namespace consumption. Generating the manifest does not install an admission limit.",
  {
    brief:
      "Save quota.yaml for myrq with cpu=1, memory=1G, pods=2. Do not apply it.",
  },
);
add(
  6,
  "Look beyond the current namespace",
  "One namespace does not show the whole cluster.",
  `${ns("inventory")}\n${apply({ ...busy("inventory-worker"), metadata: { name: "inventory-worker", namespace: "inventory" } })}`,
  report("kubectl get pods --all-namespaces"),
  [contains("inventory-worker"), contains("kube-system")],
  "The -A flag requests a list across namespaces; the NAMESPACE column keeps identically named objects distinguishable.",
  {
    brief:
      "List Pods across all namespaces and save the table to answer.txt. Include the inventory namespace and system workloads.",
  },
);
const serving = pod("nginx", "nginx:1.28", { ports: [{ containerPort: 80 }] });
add(
  7,
  "Declare a web port",
  "The container must be running before clients can use it.",
  "",
  `${apply(serving)}\n${waitPod("nginx")}`,
  [
    getCheck(
      "Port 80 is declared",
      "pod/nginx",
      ".spec.containers[0].ports | any(.containerPort == 80)",
    ),
    readyCheck("nginx"),
  ],
  "containerPort documents the container endpoint; it does not create a Service or open an external route. nginx itself listens on port 80.",
  {
    brief:
      "Create Pod nginx with nginx:1.28, declaring container port 80. A Service is not required.",
  },
);
add(
  8,
  "Change the running image",
  "A Pod image update replaces its container.",
  runPod(serving),
  `kubectl set image pod/nginx nginx=nginx:1.24.0\n${waitPod("nginx")}`,
  [
    getCheck(
      "The requested image is in the spec",
      "pod/nginx",
      '.spec.containers[0].image == "nginx:1.24.0"',
    ),
    getCheck(
      "The running container reports the new image",
      "pod/nginx",
      '.status.containerStatuses[0].image | contains("1.24.0")',
    ),
  ],
  "The kubelet reconciles the changed image by replacing the container. Verify runtime status as well as the spec.",
  {
    brief:
      "Update the provided nginx Pod to the preloaded nginx:1.24.0 image and verify its running image.",
  },
);
add(
  9,
  "Reach a Pod by IP",
  "Test the server from another Pod.",
  runPod(serving),
  `IP=$(kubectl get pod nginx -o jsonpath='{.status.podIP}')\nkubectl run client --image=busybox:1.37 --restart=Never --command -- wget -qO- "$IP"\nkubectl wait --for=jsonpath='{.status.phase}'=Succeeded pod/client --timeout=90s\n${report("kubectl logs client")}`,
  [
    getCheck(
      "The client completed its request",
      "pod/client",
      '.status.phase == "Succeeded"',
    ),
    contains("Welcome to nginx"),
  ],
  "A Pod IP routes directly to that Pod while it exists. A successful HTTP response tests more than merely observing an assigned address.",
  {
    brief:
      "Find the nginx Pod IP and fetch its homepage from a busybox client Pod. Save the response to answer.txt.",
  },
);
add(
  10,
  "Inspect the desired object",
  "The YAML shows what Kubernetes has stored.",
  runPod(serving),
  report("kubectl get pod nginx -o yaml", "pod.yaml"),
  [
    shellCheck(
      "pod.yaml contains the real Pod identity",
      `test -s pod.yaml\nkubectl create --dry-run=client -f pod.yaml -o json | jq -e '.kind == "Pod" and .metadata.name == "nginx" and .metadata.uid != null' >/dev/null`,
    ),
  ],
  "kubectl get -o yaml returns the stored object, including server-populated metadata and status. Those generated fields are useful for inspection but usually omitted from authored manifests.",
  {
    brief:
      "Save the existing nginx Pod as pod.yaml, including its server-populated metadata.",
  },
);
add(
  11,
  "Explain a waiting workload",
  "Events reveal why the container cannot start.",
  apply(pod("nginx", "nginx:missing-release")),
  report("kubectl describe pod nginx"),
  [contains("nginx:missing-release"), contains("Events:")],
  "Describe combines specification, status and recent events. A nonexistent image is an image acquisition problem, not a readiness probe failure.",
  {
    brief:
      "Describe the supplied failing nginx Pod and save the diagnostic output in answer.txt. Identify the unavailable image; this is an inspection task, so do not repair it.",
  },
);
add(
  12,
  "Read application output",
  "Logs show what the process said.",
  runPod(busy("logger", ["sh", "-c", "echo KUBEQUEST_LOG_READY; sleep 3600"])),
  report("kubectl logs logger"),
  [contains("KUBEQUEST_LOG_READY")],
  "kubectl logs reads the container’s stdout and stderr; it does not read arbitrary files inside the container.",
  { brief: "Read the provided logger Pod’s output and save it in answer.txt." },
);
const crash = busy("logger", [
  "sh",
  "-c",
  "echo KUBEQUEST_PREVIOUS_INSTANCE; if [ -f /state/restarted ]; then sleep 3600; else touch /state/restarted; sleep 10; exit 1; fi",
]);
crash.spec.volumes = [{ name: "state", emptyDir: {} }];
crash.spec.containers[0].volumeMounts = [
  { name: "state", mountPath: "/state" },
];
add(
  13,
  "Recover the previous logs",
  "A restart should not erase the first clue.",
  `${apply(crash)}\nfor i in $(seq 1 60); do test "$(kubectl get pod logger -o jsonpath='{.status.containerStatuses[0].restartCount}')" -ge 1 2>/dev/null && break; sleep 2; done\n${waitPod("logger")}`,
  report("kubectl logs logger --previous"),
  [contains("KUBEQUEST_PREVIOUS_INSTANCE")],
  "--previous requests the preceding terminated container instance. It is especially useful when a restart has replaced the process whose failure you need to investigate.",
  {
    brief:
      "The logger Pod has restarted. Save the previous container instance’s logs to answer.txt using --previous.",
  },
);
add(
  14,
  "Open a shell in the container",
  "Inspect the container filesystem through exec.",
  runPod(serving),
  report("kubectl exec nginx -- sh -c 'id; ls /usr/share/nginx/html'"),
  [contains("uid="), contains("index.html")],
  "exec starts a process inside the existing container. The shell runs in that container’s filesystem and process environment.",
  {
    brief:
      "Use kubectl exec to run a shell command in nginx that prints its identity and lists the web root. Save both outputs to answer.txt.",
  },
);
const hello = busy("hello", ["echo", "hello world"]);
hello.spec.restartPolicy = "Never";
add(
  15,
  "Finish a one-shot Pod",
  "A successful process should stay completed.",
  "",
  `${apply(hello)}\nkubectl wait --for=jsonpath='{.status.phase}'=Succeeded pod/hello --timeout=90s\n${report("kubectl logs hello")}`,
  [
    getCheck("The Pod succeeded", "pod/hello", '.status.phase == "Succeeded"'),
    contains("hello world"),
  ],
  "Never leaves a successful one-shot container completed; the output remains available until the Pod is deleted.",
  {
    brief:
      "Create Pod hello that prints hello world and exits successfully. Save the logs to answer.txt.",
  },
);
add(
  16,
  "Run a disposable command",
  "Keep the result, remove the temporary workload.",
  "",
  `kubectl run hello --image=busybox:1.37 --restart=Never --rm -i --command -- echo 'hello world' > answer.txt\ncat answer.txt`,
  [contains("hello world"), absent("The temporary Pod is gone", "pod/hello")],
  "--rm removes the attached temporary Pod after its process exits. Saving the output keeps evidence without leaving the workload behind.",
  {
    brief:
      "Run a temporary busybox Pod named hello that prints hello world, automatically removes itself, and saves output to answer.txt.",
  },
);
add(
  17,
  "Inject a container variable",
  "Configuration belongs in the container environment.",
  "",
  `${apply(pod("nginx", "nginx:1.28", { env: [{ name: "var1", value: "val1" }] }))}\n${waitPod("nginx")}\n${report("kubectl exec nginx -- printenv var1")}`,
  [
    getCheck(
      "var1 is declared correctly",
      "pod/nginx",
      '.spec.containers[0].env | any(.name == "var1" and .value == "val1")',
    ),
    contains("val1"),
  ],
  "The Pod spec provides the environment when the container starts. Inspect the process environment to confirm the value actually reached the workload.",
  {
    brief:
      "Create nginx with environment variable var1=val1. Save the running container’s printenv var1 output to answer.txt.",
  },
);
const two = busy("double", ["sh", "-c", "echo hello; sleep 3600"]);
two.spec.containers.push({ ...two.spec.containers[0], name: "second" });
two.spec.containers[0].name = "first";
add(
  18,
  "Choose the right container",
  "Two containers share a Pod, but exec needs a destination.",
  "",
  `${apply(two)}\n${waitPod("double")}\n${report("kubectl exec double -c second -- ls")}`,
  [
    getCheck(
      "Both containers are defined",
      "pod/double",
      ".spec.containers | length == 2",
    ),
    shellCheck(
      "The second container can execute commands",
      "kubectl exec double -c second -- test -d /bin",
    ),
    contains("bin"),
  ],
  "The -c flag selects the container. Pod networking is shared, but each container still has its own root filesystem.",
  {
    brief:
      "Create double with first and second busybox containers that echo hello and sleep 3600. Run ls in second and save the result to answer.txt.",
  },
);
const shared = pod("shared", "nginx:1.28", {
  volumeMounts: [{ name: "work", mountPath: "/usr/share/nginx/html" }],
});
shared.spec.volumes = [{ name: "work", emptyDir: {} }];
shared.spec.initContainers = [
  {
    name: "prepare",
    image: "busybox:1.37",
    command: ["sh", "-c", "echo Test > /work-dir/index.html"],
    volumeMounts: [{ name: "work", mountPath: "/work-dir" }],
  },
];
add(
  19,
  "Publish the init container’s page",
  "The web container must see what initialization wrote.",
  "",
  `${apply(shared)}\n${waitPod("shared")}\nIP=$(kubectl get pod shared -o jsonpath='{.status.podIP}')\ncurl -fsS "$IP" > answer.txt\ncat answer.txt`,
  [
    getCheck(
      "An init container and emptyDir are configured",
      "pod/shared",
      ".spec.initContainers | length == 1",
    ),
    shellCheck(
      "The shared page is served",
      `IP=$(kubectl get pod shared -o jsonpath='{.status.podIP}'); test "$(curl -fsS --max-time 5 "$IP")" = Test`,
    ),
  ],
  "The init container completes before nginx starts. Both mount the same emptyDir under different paths, so nginx serves the file written during initialization.",
  {
    brief:
      "Create shared with an init container writing Test into an emptyDir. Mount it as nginx’s web root and verify the served page.",
  },
);
