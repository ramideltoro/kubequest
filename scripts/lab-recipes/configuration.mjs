import {
  add,
  pod,
  apply,
  manifest,
  ns,
  waitPod,
  getCheck,
  readyCheck,
  shellCheck,
  absent,
  report,
  contains,
  file,
} from "./helpers.mjs";
const cm = (name, data) => ({
  apiVersion: "v1",
  kind: "ConfigMap",
  metadata: { name },
  data,
});
const secret = (name, stringData) => ({
  apiVersion: "v1",
  kind: "Secret",
  metadata: { name },
  type: "Opaque",
  stringData,
});
const configWhy =
  "Configuration is a separate API object. A workload references its keys through environment variables or files, so changing the image is not required to supply application settings.";
add(
  72,
  "Store two configuration values",
  "A reusable image needs external settings.",
  "",
  `kubectl create configmap config --from-literal=foo=lala --from-literal=foo2=lolo`,
  [
    getCheck(
      "Both values are stored",
      "configmap/config",
      '.data.foo == "lala" and .data.foo2 == "lolo"',
    ),
  ],
  configWhy,
  { brief: "Create ConfigMap config with foo=lala and foo2=lolo." },
);
add(
  73,
  "Inspect configuration data",
  "Read values from the API, not from memory.",
  apply(cm("config", { foo: "lala", foo2: "lolo" })),
  report("kubectl get configmap config -o yaml"),
  [contains("lala"), contains("lolo")],
  configWhy,
  { brief: "Save the provided config ConfigMap as YAML in answer.txt." },
);
for (const [i, title, name, filename, data, flag, expression] of [
  [
    74,
    "Load a configuration file",
    "from-file",
    "settings.txt",
    "foo=lala\nfoo2=lolo",
    "--from-file=settings.txt",
    '.data["settings.txt"] | contains("foo=lala")',
  ],
  [
    75,
    "Load environment-style settings",
    "from-env",
    "settings.env",
    "foo=lala\nfoo2=lolo",
    "--from-env-file=settings.env",
    '.data.foo == "lala" and .data.foo2 == "lolo"',
  ],
  [
    76,
    "Choose the ConfigMap key",
    "special-config",
    "settings.txt",
    "hello from a file",
    "--from-file=special=settings.txt",
    '.data.special | contains("hello from a file")',
  ],
])
  add(
    i,
    title,
    "File contents and environment entries are parsed differently.",
    file(filename, data),
    `kubectl create configmap ${name} ${flag}\nkubectl get configmap ${name} -o yaml`,
    [
      getCheck(
        "The resulting data has the expected shape",
        `configmap/${name}`,
        expression,
      ),
    ],
    configWhy,
    {
      brief: `Use the supplied ${filename} to create ConfigMap ${name} with ${flag}. Inspect its values.`,
    },
  );
let p = pod("nginx", "nginx:1.28", {
  env: [
    {
      name: "option",
      valueFrom: { configMapKeyRef: { name: "options", key: "var5" } },
    },
  ],
});
add(
  77,
  "Map one configuration key",
  "The environment name can differ from the stored key.",
  "",
  apply(cm("options", { var5: "val5" })) +
    "\n" +
    apply(p) +
    "\n" +
    waitPod("nginx"),
  [
    getCheck(
      "The reference points to options/var5",
      "pod/nginx",
      '.spec.containers[0].env | any(.name == "option" and .valueFrom.configMapKeyRef.name == "options" and .valueFrom.configMapKeyRef.key == "var5")',
    ),
    shellCheck(
      "The application receives val5",
      'test "$(kubectl exec nginx -- printenv option)" = val5',
    ),
  ],
  configWhy,
  {
    brief:
      "Create options with var5=val5 and nginx with environment variable option referencing that key. Do not hardcode val5 in the Pod.",
  },
);
p = pod("nginx", "nginx:1.28", {
  envFrom: [{ configMapRef: { name: "anotherone" } }],
});
add(
  78,
  "Import a group of settings",
  "Load each ConfigMap key as an environment variable.",
  "",
  apply(cm("anotherone", { var6: "val6", var7: "val7" })) +
    "\n" +
    apply(p) +
    "\n" +
    waitPod("nginx"),
  [
    getCheck(
      "The Pod imports anotherone",
      "pod/nginx",
      '.spec.containers[0].envFrom | any(.configMapRef.name == "anotherone")',
    ),
    shellCheck(
      "Both values reach the container",
      'test "$(kubectl exec nginx -- printenv var6)" = val6\ntest "$(kubectl exec nginx -- printenv var7)" = val7',
    ),
  ],
  configWhy,
  {
    brief:
      "Create anotherone with var6=val6 and var7=val7. Load it through envFrom into nginx.",
  },
);
p = pod("nginx", "nginx:1.28", {
  volumeMounts: [{ name: "config", mountPath: "/etc/lala" }],
});
p.spec.volumes = [{ name: "config", configMap: { name: "cmvolume" } }];
add(
  79,
  "Mount settings as files",
  "Each key should become a readable file.",
  "",
  apply(cm("cmvolume", { var8: "val8", var9: "val9" })) +
    "\n" +
    apply(p) +
    "\n" +
    waitPod("nginx") +
    "\nkubectl exec nginx -- ls /etc/lala",
  [
    shellCheck(
      "The mounted files have the supplied values",
      'test "$(kubectl exec nginx -- cat /etc/lala/var8)" = val8\ntest "$(kubectl exec nginx -- cat /etc/lala/var9)" = val9',
    ),
  ],
  configWhy,
  {
    brief:
      "Mount ConfigMap cmvolume (var8=val8, var9=val9) into nginx at /etc/lala and inspect the files.",
  },
);
for (const [i, title, security, expr] of [
  [
    80,
    "Specify a process identity",
    { runAsUser: 101 },
    ".spec.containers[0].securityContext.runAsUser == 101",
  ],
  [
    81,
    "Declare Linux capabilities",
    { capabilities: { add: ["NET_ADMIN", "SYS_TIME"] } },
    '.spec.containers[0].securityContext.capabilities.add | (index("NET_ADMIN") != null and index("SYS_TIME") != null)',
  ],
])
  add(
    i,
    title,
    "Review the security configuration without starting the workload.",
    "",
    manifest(
      "pod.yaml",
      pod("nginx", "nginx:1.28", { securityContext: security }),
    ) + "\ncat pod.yaml",
    [
      shellCheck(
        "The manifest has the requested security context",
        `kubectl create --dry-run=client -f pod.yaml -o json | jq -e '${expr}' >/dev/null`,
      ),
      absent("The manifest was not applied", "pod/nginx"),
    ],
    "A securityContext changes process identity or privileges. This is manifest practice only; default nginx may require additional filesystem changes to run under another UID, and added capabilities should only be granted when required.",
    {
      brief:
        i === 80
          ? "Save pod.yaml for nginx with container runAsUser 101. Do not apply it."
          : "Save pod.yaml for nginx with added NET_ADMIN and SYS_TIME capabilities. Do not apply it.",
    },
  );
const resources = {
  requests: { cpu: "100m", memory: "256Mi" },
  limits: { cpu: "200m", memory: "512Mi" },
};
add(
  82,
  "Reserve and limit resources",
  "Scheduling reservations differ from runtime ceilings.",
  "",
  apply(pod("nginx", "nginx:1.28", { resources })) + "\n" + waitPod("nginx"),
  [
    getCheck(
      "CPU requests and limits are set",
      "pod/nginx",
      '.spec.containers[0].resources | .requests.cpu == "100m" and .limits.cpu == "200m"',
    ),
    getCheck(
      "Memory requests and limits are set",
      "pod/nginx",
      '.spec.containers[0].resources | .requests.memory == "256Mi" and .limits.memory == "512Mi"',
    ),
  ],
  "Requests guide scheduling; limits constrain consumption. CPU and memory quantities have different units and enforcement behavior.",
  {
    brief:
      "Create nginx with requests 100m CPU/256Mi memory and limits 200m CPU/512Mi memory.",
  },
);
const range = {
  apiVersion: "v1",
  kind: "LimitRange",
  metadata: { name: "memory", namespace: "limitrange" },
  spec: {
    limits: [
      { type: "Pod", min: { memory: "100Mi" }, max: { memory: "500Mi" } },
    ],
  },
};
const rangeSetup = ns("limitrange") + "\n" + apply(range);
add(
  83,
  "Set namespace admission bounds",
  "Reject Pod memory budgets outside a declared range.",
  "",
  rangeSetup,
  [
    getCheck(
      "The Pod memory bounds are set",
      "limitrange/memory",
      '.spec.limits | any(.type == "Pod" and .min.memory == "100Mi" and .max.memory == "500Mi")',
      "limitrange",
    ),
  ],
  "A LimitRange validates per-object resource settings during admission. A Pod-level range checks the aggregate resource allocation of that Pod.",
  {
    namespace: "limitrange",
    brief:
      "Create namespace limitrange and LimitRange memory with Pod memory min 100Mi and max 500Mi.",
  },
);
add(
  84,
  "Inspect namespace policy",
  "Describe shows the installed resource bounds.",
  rangeSetup,
  report("kubectl describe namespace limitrange"),
  [contains("100Mi"), contains("500Mi")],
  "Namespace description summarizes quota and limit-range policies, helping explain why a workload may be rejected.",
  {
    namespace: "limitrange",
    brief:
      "Describe namespace limitrange and save its policy summary to answer.txt.",
  },
);
p = pod("nginx", "nginx:1.28", {
  resources: { requests: { memory: "250Mi" }, limits: { memory: "400Mi" } },
});
p.metadata.namespace = "limitrange";
add(
  85,
  "Fit within the allowed range",
  "The Pod needs a memory request that admission accepts.",
  rangeSetup,
  apply(p) + "\n" + waitPod("nginx", "limitrange"),
  [
    getCheck(
      "The memory request is 250Mi",
      "pod/nginx",
      '.spec.containers[0].resources.requests.memory == "250Mi"',
      "limitrange",
    ),
    readyCheck("nginx", "limitrange"),
  ],
  "The request lies between the supplied minimum and maximum. A 400Mi limit also stays within the namespace’s bounds.",
  {
    namespace: "limitrange",
    brief:
      "Create nginx in limitrange with a 250Mi memory request and 400Mi memory limit.",
  },
);
const quota = {
  apiVersion: "v1",
  kind: "ResourceQuota",
  metadata: { name: "budget", namespace: "one" },
  spec: {
    hard: {
      "requests.cpu": "1",
      "requests.memory": "1Gi",
      "limits.cpu": "2",
      "limits.memory": "2Gi",
    },
  },
};
const quotaSetup = ns("one") + "\n" + apply(quota);
add(
  86,
  "Budget the namespace",
  "Quota totals apply across workloads.",
  "",
  quotaSetup,
  [
    getCheck(
      "Requests fit the specified quota",
      "quota/budget",
      '.spec.hard["requests.cpu"] == "1" and .spec.hard["requests.memory"] == "1Gi"',
      "one",
    ),
    getCheck(
      "Limits fit the specified quota",
      "quota/budget",
      '.spec.hard["limits.cpu"] == "2" and .spec.hard["limits.memory"] == "2Gi"',
      "one",
    ),
  ],
  "ResourceQuota limits aggregate namespace reservations and limits. It is distinct from a LimitRange’s per-object defaults and bounds.",
  {
    namespace: "one",
    brief:
      "Create namespace one and ResourceQuota budget: requests cpu=1,memory=1Gi; limits cpu=2,memory=2Gi.",
  },
);
p = pod("over-budget", "nginx:1.28", {
  resources: {
    requests: { cpu: "2", memory: "3Gi" },
    limits: { cpu: "3", memory: "4Gi" },
  },
});
p.metadata.namespace = "one";
add(
  87,
  "Explain an admission rejection",
  "The workload asks for more than the namespace can reserve.",
  quotaSetup,
  manifest("over-budget.yaml", p) +
    '\nif kubectl apply -f over-budget.yaml > answer.txt 2>&1; then echo "Unexpected admission"; exit 1; fi\ncat answer.txt',
  [
    contains("exceeded quota"),
    absent("The over-budget Pod was not admitted", "pod/over-budget", "one"),
  ],
  "Admission rejects requests that exceed quota before scheduling. The failure is the expected outcome here; increasing quota would bypass the lesson.",
  {
    namespace: "one",
    brief:
      "Attempt to create over-budget with requests 2 CPU/3Gi and limits 3 CPU/4Gi in one. Save the rejection to answer.txt; keep the quota unchanged.",
  },
);
p = pod("within-budget", "nginx:1.28", {
  resources: {
    requests: { cpu: "500m", memory: "1Gi" },
    limits: { cpu: "1", memory: "2Gi" },
  },
});
p.metadata.namespace = "one";
add(
  88,
  "Admit a workload within quota",
  "All requested totals must fit.",
  quotaSetup,
  apply(p) + "\n" + waitPod("within-budget", "one"),
  [
    getCheck(
      "The declared resources match the budget",
      "pod/within-budget",
      '.spec.containers[0].resources | .requests.cpu == "500m" and .requests.memory == "1Gi" and .limits.cpu == "1" and .limits.memory == "2Gi"',
      "one",
    ),
    readyCheck("within-budget", "one"),
  ],
  "Each quota dimension must fit independently. CPU and memory requests can satisfy quota but still require actual node capacity.",
  {
    namespace: "one",
    brief:
      "Create within-budget in one with requests 500m CPU/1Gi and limits 1 CPU/2Gi.",
  },
);
const secretWhy =
  "A Secret supplies sensitive values by reference. Base64 encoding is not encryption; these labs use artificial practice values only. Never paste real credentials into recordings or saved answers.";
add(
  89,
  "Create a practice Secret",
  "Keep credentials out of the Pod template.",
  "",
  "kubectl create secret generic mysecret --from-literal=password=mypass",
  [
    getCheck(
      "The Secret contains the practice password",
      "secret/mysecret",
      '.data.password == "bXlwYXNz"',
    ),
  ],
  secretWhy,
  {
    brief:
      "Create Opaque Secret mysecret with password=mypass. This is a practice-only value.",
  },
);
add(
  90,
  "Create a Secret from a file",
  "A filename becomes a data key.",
  file("username", "practice-user"),
  "kubectl create secret generic mysecret2 --from-file=username",
  [
    getCheck(
      "The file is stored under username",
      "secret/mysecret2",
      '.data.username | @base64d | contains("practice-user")',
    ),
  ],
  secretWhy,
  { brief: "Create mysecret2 from the supplied username file." },
);
add(
  91,
  "Decode the practice value",
  "Read one key without confusing encoding with encryption.",
  apply(secret("mysecret2", { username: "practice-user" })),
  report(
    "kubectl get secret mysecret2 -o jsonpath='{.data.username}' | base64 -d",
  ),
  [contains("practice-user")],
  secretWhy,
  {
    brief:
      "Decode mysecret2’s username and save it to answer.txt. Only synthetic values are used here.",
  },
);
p = pod("nginx", "nginx:1.28", {
  volumeMounts: [
    { name: "credentials", mountPath: "/etc/foo", readOnly: true },
  ],
});
p.spec.volumes = [{ name: "credentials", secret: { secretName: "mysecret2" } }];
add(
  92,
  "Mount a Secret file",
  "The process reads the referenced value through a volume.",
  apply(secret("mysecret2", { username: "practice-user" })),
  apply(p) + "\n" + waitPod("nginx"),
  [
    shellCheck(
      "The mounted file exposes the practice value",
      'test "$(kubectl exec nginx -- cat /etc/foo/username)" = practice-user',
    ),
  ],
  secretWhy,
  {
    brief:
      "Create nginx mounting mysecret2 read-only at /etc/foo. Confirm username is readable there.",
  },
);
const volumePod = structuredClone(p);
p = pod("nginx", "nginx:1.28", {
  env: [
    {
      name: "USERNAME",
      valueFrom: { secretKeyRef: { name: "mysecret2", key: "username" } },
    },
  ],
});
add(
  93,
  "Switch Secret consumption style",
  "A replacement Pod can read the same key as an environment variable.",
  apply(secret("mysecret2", { username: "practice-user" })) +
    "\n" +
    apply(volumePod) +
    "\n" +
    waitPod("nginx"),
  "kubectl delete pod nginx\n" + apply(p) + "\n" + waitPod("nginx"),
  [
    getCheck(
      "The env reference is present",
      "pod/nginx",
      '.spec.containers[0].env | any(.name == "USERNAME" and .valueFrom.secretKeyRef.name == "mysecret2")',
    ),
    shellCheck(
      "USERNAME contains the practice value",
      'test "$(kubectl exec nginx -- printenv USERNAME)" = practice-user',
    ),
  ],
  secretWhy,
  {
    brief:
      "Replace the supplied volume-consuming nginx Pod with one that reads mysecret2/username into USERNAME.",
  },
);
const extSecret = secret("ext-service-secret", { API_KEY: "practice-api-key" });
extSecret.metadata.namespace = "secret-ops";
add(
  94,
  "Scope a Secret to its consumer",
  "The credential belongs to the workload namespace.",
  "",
  ns("secret-ops") + "\n" + apply(extSecret),
  [
    getCheck(
      "The namespaced key is present",
      "secret/ext-service-secret",
      '.data.API_KEY == "cHJhY3RpY2UtYXBpLWtleQ=="',
      "secret-ops",
    ),
  ],
  secretWhy,
  {
    namespace: "secret-ops",
    brief:
      "Create namespace secret-ops and Secret ext-service-secret with API_KEY=practice-api-key.",
  },
);
p = pod("consumer", "nginx:1.28", {
  envFrom: [{ secretRef: { name: "ext-service-secret" } }],
});
p.metadata.namespace = "secret-ops";
add(
  95,
  "Deliver a Secret to the process",
  "The reference must resolve in the Pod namespace.",
  ns("secret-ops") + "\n" + apply(extSecret),
  apply(p) +
    "\n" +
    waitPod("consumer", "secret-ops") +
    "\n" +
    report("kubectl exec -n secret-ops consumer -- printenv API_KEY"),
  [
    getCheck(
      "The Pod references the Secret",
      "pod/consumer",
      '.spec.containers[0].envFrom | any(.secretRef.name == "ext-service-secret")',
      "secret-ops",
    ),
    contains("practice-api-key"),
  ],
  secretWhy,
  {
    namespace: "secret-ops",
    brief:
      "Create consumer in secret-ops using ext-service-secret through envFrom. Save printenv API_KEY to answer.txt.",
  },
);
const sshFile = "KUBEQUEST_SYNTHETIC_KEY_NOT_A_REAL_CREDENTIAL";
add(
  96,
  "Declare an SSH-auth Secret",
  "The Secret type specifies a required key.",
  ns("secret-ops") + "\n" + file("id_rsa", sshFile),
  `kubectl create secret generic my-secret -n secret-ops --type=kubernetes.io/ssh-auth --from-file=ssh-privatekey=id_rsa`,
  [
    getCheck(
      "Type and key are correct",
      "secret/my-secret",
      '.type == "kubernetes.io/ssh-auth" and (.data["ssh-privatekey"] | @base64d | contains("KUBEQUEST_SYNTHETIC_KEY"))',
      "secret-ops",
    ),
  ],
  secretWhy,
  {
    namespace: "secret-ops",
    brief:
      "Create my-secret in secret-ops with type kubernetes.io/ssh-auth and key ssh-privatekey from the supplied synthetic id_rsa file.",
  },
);
const ssh = secret("my-secret", { "ssh-privatekey": sshFile });
ssh.type = "kubernetes.io/ssh-auth";
ssh.metadata.namespace = "secret-ops";
p = pod("consumer", "nginx:1.28", {
  volumeMounts: [{ name: "ssh", mountPath: "/var/app", readOnly: true }],
});
p.metadata.namespace = "secret-ops";
p.spec.volumes = [{ name: "ssh", secret: { secretName: "my-secret" } }];
add(
  97,
  "Mount a typed Secret",
  "The consumer needs a read-only credential file.",
  ns("secret-ops") + "\n" + apply(ssh),
  apply(p) +
    "\n" +
    waitPod("consumer", "secret-ops") +
    "\n" +
    report(
      "kubectl exec -n secret-ops consumer -- cat /var/app/ssh-privatekey",
    ),
  [
    getCheck(
      "The mount is read-only",
      "pod/consumer",
      '.spec.containers[0].volumeMounts | any(.mountPath == "/var/app" and .readOnly == true)',
      "secret-ops",
    ),
    contains(sshFile),
  ],
  secretWhy,
  {
    namespace: "secret-ops",
    brief:
      "Create consumer mounting my-secret read-only at /var/app. Save the synthetic ssh-privatekey content to answer.txt.",
  },
);
add(
  98,
  "Inventory workload identities",
  "Every namespace can have its own ServiceAccounts.",
  "",
  report("kubectl get serviceaccounts --all-namespaces"),
  [contains("kube-system"), contains("default")],
  "ServiceAccounts are namespaced identities for workloads. Listing them does not reveal their permissions; bindings determine authorization.",
  {
    brief:
      "List ServiceAccounts across all namespaces and save the table to answer.txt.",
  },
);
add(
  99,
  "Create a workload identity",
  "Give this application its own ServiceAccount.",
  "",
  "kubectl create serviceaccount myuser",
  [
    getCheck(
      "myuser exists",
      "serviceaccount/myuser",
      '.metadata.name == "myuser"',
    ),
  ],
  "Creating a ServiceAccount gives a named workload identity. It does not automatically grant broad API permissions.",
  { brief: "Create ServiceAccount myuser in quest." },
);
p = pod();
p.spec.serviceAccountName = "myuser";
add(
  100,
  "Assign the workload identity",
  "The Pod must opt into its ServiceAccount.",
  "kubectl create serviceaccount myuser",
  apply(p) + "\n" + waitPod("nginx"),
  [
    getCheck(
      "nginx uses myuser",
      "pod/nginx",
      '.spec.serviceAccountName == "myuser"',
    ),
    readyCheck("nginx"),
  ],
  "serviceAccountName selects the identity used for projected API credentials. The permissions still come from RBAC bindings.",
  { brief: "Create nginx using the supplied myuser ServiceAccount." },
);
add(
  101,
  "Request a short-lived API token",
  "Modern tokens come from the TokenRequest API.",
  "kubectl create serviceaccount myuser",
  'kubectl create token myuser --duration=10m > token.txt\nchmod 600 token.txt\nprintf "Token saved locally; do not share it.\\n"',
  [
    shellCheck(
      "A JWT-shaped token was saved",
      "test -s token.txt\nawk -F. 'NF == 3 {ok=1} END {exit !ok}' token.txt",
    ),
    shellCheck(
      "The token belongs to myuser",
      `TOKEN=$(cat token.txt)\nkubectl --kubeconfig=/dev/null --server=https://127.0.0.1:6443 --certificate-authority=/var/lib/rancher/k3s/server/tls/server-ca.crt --token="$TOKEN" auth whoami -o json | jq -e '.status.userInfo.username == "system:serviceaccount:quest:myuser"' >/dev/null`,
    ),
  ],
  "TokenRequest issues a bounded credential for a ServiceAccount. Keep it in the disposable VM and avoid printing it in public output.",
  {
    brief:
      "Request a 10-minute token for myuser, store it in token.txt with mode 600, and keep it out of the transcript.",
  },
);
