import {
  add,
  pod,
  busy,
  deploy,
  apply,
  manifest,
  waitPod,
  waitDeploy,
  getCheck,
  readyCheck,
  shellCheck,
  absent,
  runPod,
  report,
  contains,
  reportCheck,
  q,
} from "./helpers.mjs";
const trio = (v2 = false) =>
  [1, 2, 3]
    .map((n) => {
      const p = pod("nginx" + n);
      p.metadata.labels = { app: v2 && n === 2 ? "v2" : "v1" };
      return apply(p);
    })
    .join("\n");
const labelsWhy =
  "Labels are selectable metadata. Exact-match and set-based selectors operate on their values; annotations store descriptive information and cannot substitute for selector labels.";
add(
  20,
  "Label the web fleet",
  "Three workloads need one shared selector.",
  "",
  trio(),
  [
    getCheck(
      "Three named Pods carry app=v1",
      "pods",
      '.items | map(select(.metadata.name | test("^nginx[123]$"))) | length == 3',
    ),
    getCheck(
      "All fleet labels match",
      "pods",
      '.items | map(select(.metadata.name | test("^nginx[123]$"))) | all(.metadata.labels.app == "v1")',
    ),
  ],
  labelsWhy,
  {
    brief:
      "Create nginx1, nginx2 and nginx3 with nginx:1.28 and app=v1 labels.",
  },
);
add(
  21,
  "Inspect the fleet labels",
  "Names alone do not explain selection.",
  trio(),
  report("kubectl get pods --show-labels"),
  [contains("nginx1"), contains("app=v1")],
  labelsWhy,
  {
    brief:
      "Show all labels for the provided Pods and save the table to answer.txt.",
  },
);
add(
  22,
  "Relabel one replica",
  "Only nginx2 belongs to the new version.",
  trio(),
  `kubectl label pod nginx2 app=v2 --overwrite`,
  [
    getCheck("nginx2 is v2", "pod/nginx2", '.metadata.labels.app == "v2"'),
    getCheck(
      "The other Pods stay v1",
      "pods",
      '.items | map(select(.metadata.name == "nginx1" or .metadata.name == "nginx3")) | all(.metadata.labels.app == "v1")',
    ),
  ],
  labelsWhy,
  {
    brief:
      "Change only nginx2 from app=v1 to app=v2. Keep the other two Pods at v1.",
  },
);
add(
  23,
  "Make labels a report column",
  "The version should be visible at a glance.",
  trio(true),
  report("kubectl get pods -L app"),
  [contains("APP"), contains("v2")],
  labelsWhy,
  { brief: "Save a Pod table with an APP label column to answer.txt." },
);
add(
  24,
  "Select the new version",
  "A focused query should exclude the old replicas.",
  trio(true),
  report("kubectl get pods -l app=v2 -o name"),
  [contains("pod/nginx2"), reportCheck(`! grep -E 'nginx1|nginx3' answer.txt`)],
  labelsWhy,
  {
    brief:
      "Save the names of Pods with app=v2 to answer.txt. Do not include v1 Pods.",
  },
);
add(
  25,
  "Combine inclusion and exclusion",
  "The frontend must be left out of this query.",
  trio(true) + "\nkubectl label pod nginx3 app=v2 tier=frontend --overwrite",
  report("kubectl get pods -l 'app=v2,tier!=frontend' -o name"),
  [contains("pod/nginx2"), reportCheck(`! grep -E 'nginx1|nginx3' answer.txt`)],
  labelsWhy,
  {
    brief:
      "Select app=v2 Pods whose tier is not frontend and save their names to answer.txt.",
  },
);
add(
  26,
  "Label a set of versions",
  "Both versions belong to the web tier.",
  trio(true),
  "kubectl label pods -l 'app in (v1,v2)' tier=web",
  [
    getCheck(
      "All three Pods are in tier web",
      "pods",
      '.items | all(.metadata.labels.tier == "web")',
    ),
  ],
  labelsWhy,
  { brief: "Add tier=web to all Pods matching app in (v1,v2)." },
);
add(
  27,
  "Record ownership",
  "Ownership is descriptive metadata, not a traffic selector.",
  trio(true),
  "kubectl annotate pods -l app=v2 owner=marketing",
  [
    getCheck(
      "The selected Pod has an owner",
      "pod/nginx2",
      '.metadata.annotations.owner == "marketing"',
    ),
    getCheck(
      "The unselected Pod is unchanged",
      "pod/nginx1",
      ".metadata.annotations.owner == null",
    ),
  ],
  labelsWhy,
  { brief: "Annotate only app=v2 Pods with owner=marketing." },
);
add(
  28,
  "Remove a stale label",
  "Old selectors should stop matching the fleet.",
  trio(),
  "kubectl label pods nginx1 nginx2 nginx3 app-",
  [
    getCheck(
      "All three app labels are removed",
      "pods",
      ".items | all(.metadata.labels.app == null)",
    ),
  ],
  labelsWhy,
  {
    brief:
      "Remove the app label from nginx1, nginx2 and nginx3 without deleting the Pods.",
  },
);
add(
  29,
  "Describe the fleet",
  "Add a human-readable note to each Pod.",
  trio(),
  "kubectl annotate pods nginx1 nginx2 nginx3 description='my description'",
  [
    getCheck(
      "All descriptions are present",
      "pods",
      '.items | all(.metadata.annotations.description == "my description")',
    ),
  ],
  labelsWhy,
  {
    brief: "Add description=my description to each of the three provided Pods.",
  },
);
add(
  30,
  "Read an annotation",
  "Retrieve the note directly from metadata.",
  trio() + "\nkubectl annotate pod nginx1 description='my description'",
  report(
    "kubectl get pod nginx1 -o jsonpath='{.metadata.annotations.description}{\"\\n\"}'",
  ),
  [contains("my description")],
  labelsWhy,
  { brief: "Save nginx1’s description annotation to answer.txt." },
);
add(
  31,
  "Clear the annotation",
  "Remove only the note that is no longer needed.",
  trio() +
    "\nkubectl annotate pods nginx1 nginx2 nginx3 description='my description'",
  "kubectl annotate pods nginx1 nginx2 nginx3 description-",
  [
    getCheck(
      "The annotation is absent",
      "pods",
      ".items | all(.metadata.annotations.description == null)",
    ),
  ],
  labelsWhy,
  {
    brief:
      "Remove description from all three provided Pods. Keep their labels and Pods.",
  },
);
add(
  32,
  "Clean up the fleet",
  "The temporary workloads have finished their job.",
  trio(),
  "kubectl delete pods nginx1 nginx2 nginx3",
  [
    absent("nginx1 is deleted", "pod/nginx1"),
    absent("nginx2 is deleted", "pod/nginx2"),
    absent("nginx3 is deleted", "pod/nginx3"),
  ],
  "Deleting the Pods removes the resources; deleting labels or annotations would leave the workloads running.",
  { brief: "Delete nginx1, nginx2 and nginx3." },
);
const selected = pod("scheduled");
selected.spec.nodeSelector = { accelerator: "nvidia-tesla-p100" };
add(
  33,
  "Schedule by a node label",
  "The workload needs the labeled node.",
  "NODE=$(kubectl get nodes -o jsonpath='{.items[0].metadata.name}'); kubectl label node \"$NODE\" accelerator=nvidia-tesla-p100 --overwrite",
  apply(selected) + "\n" + waitPod("scheduled"),
  [
    getCheck(
      "The selector is configured",
      "pod/scheduled",
      '.spec.nodeSelector.accelerator == "nvidia-tesla-p100"',
    ),
    readyCheck("scheduled"),
  ],
  "A nodeSelector matches node labels during scheduling. This label is a fixture for placement practice; it does not install or request a real GPU.",
  {
    brief:
      "Create scheduled with nodeSelector accelerator=nvidia-tesla-p100 on the pre-labeled practice node.",
  },
);
add(
  34,
  "Choose the node directly",
  "Use the actual node name, not an assumed hostname.",
  "",
  `NODE=$(kubectl get nodes -o jsonpath='{.items[0].metadata.name}')\nkubectl run pinned --image=nginx:1.28 --dry-run=client -o json | jq --arg node "$NODE" '.spec.nodeName = $node' | kubectl apply -f -\n${waitPod("pinned")}`,
  [
    shellCheck(
      "The Pod is bound to the practice node",
      `test "$(kubectl get pod pinned -o jsonpath='{.spec.nodeName}')" = "$(kubectl get nodes -o jsonpath='{.items[0].metadata.name}')"`,
    ),
    readyCheck("pinned"),
  ],
  "nodeName directly binds a Pod to a named node and bypasses scheduler selection. Node names are environment-specific; discover the name instead of assuming node01.",
  {
    brief:
      "Discover the single practice node name and create pinned with spec.nodeName set to it.",
  },
);
const toleration = {
  key: "tier",
  operator: "Equal",
  value: "frontend",
  effect: "NoSchedule",
};
const tolerate = pod("tolerant");
tolerate.spec.tolerations = [toleration];
add(
  35,
  "Tolerate the scheduling boundary",
  "A taint excludes workloads unless they tolerate it.",
  "",
  `NODE=$(kubectl get nodes -o jsonpath='{.items[0].metadata.name}')\nkubectl taint node "$NODE" tier=frontend:NoSchedule\n${apply(tolerate)}\n${waitPod("tolerant")}`,
  [
    getCheck(
      "The Pod tolerates the taint",
      "pod/tolerant",
      '.spec.tolerations | any(.key == "tier" and .value == "frontend" and .effect == "NoSchedule")',
    ),
    getCheck(
      "The node retains the taint",
      "nodes",
      '.items[0].spec.taints | any(.key == "tier" and .value == "frontend")',
    ),
    readyCheck("tolerant"),
  ],
  "A toleration permits scheduling onto a tainted node; it does not force placement. NoSchedule does not evict Pods already running there.",
  {
    brief:
      "Taint the practice node tier=frontend:NoSchedule and create tolerant with the matching toleration. Keep the taint in place.",
  },
);
const target = structuredClone(tolerate);
target.metadata.name = "targeted";
target.spec.nodeSelector = { "kubequest/target": "controlplane" };
add(
  36,
  "Combine selection with permission",
  "The workload must target and tolerate the same node.",
  `NODE=$(kubectl get nodes -o jsonpath='{.items[0].metadata.name}')\nkubectl label node "$NODE" kubequest/target=controlplane --overwrite\nkubectl taint node "$NODE" tier=frontend:NoSchedule`,
  apply(target) + "\n" + waitPod("targeted"),
  [
    getCheck(
      "The target selector is present",
      "pod/targeted",
      '.spec.nodeSelector["kubequest/target"] == "controlplane"',
    ),
    getCheck(
      "The target taint is tolerated",
      "pod/targeted",
      '.spec.tolerations | any(.key == "tier" and .value == "frontend")',
    ),
    readyCheck("targeted"),
  ],
  "Selection narrows the candidate nodes; toleration permits the workload through the taint. Both constraints must be satisfied.",
  {
    brief:
      "Create targeted using nodeSelector kubequest/target=controlplane and the tier=frontend:NoSchedule toleration. The practice node is already labeled and tainted.",
  },
);
const d = deploy();
const setupDeployment = apply(d) + "\n" + waitDeploy("nginx");
const changedDeployment =
  setupDeployment +
  "\nkubectl set image deployment/nginx nginx=nginx:1.19.8\n" +
  waitDeploy("nginx");
const failedDeployment =
  changedDeployment + "\nkubectl set image deployment/nginx nginx=nginx:1.91";
const imageCheck = (img) =>
  getCheck(
    "The requested image is configured",
    "deployment/nginx",
    `.spec.template.spec.containers[0].image == "${img}"`,
  );
const replicasCheck = (n) =>
  getCheck(
    "The desired replicas are available",
    "deployment/nginx",
    `.spec.replicas == ${n} and .status.availableReplicas == ${n} and .status.observedGeneration == .metadata.generation`,
  );
const rolloutWhy =
  "A Deployment creates ReplicaSets for changes to its Pod template. Observe rollout status to confirm the new template became available; desired state and running state are separate evidence.";
add(
  37,
  "Declare the application Deployment",
  "Two replicas should be managed as one release.",
  "",
  setupDeployment,
  [imageCheck("nginx:1.18.0"), replicasCheck(2)],
  rolloutWhy,
  {
    brief:
      "Create nginx Deployment with two replicas, nginx:1.18.0 and declared container port 80. Do not create a Service.",
  },
);
for (const [i, title, cmd, kind] of [
  [
    38,
    "Read the Deployment manifest",
    "kubectl get deployment nginx -o yaml",
    "Deployment",
  ],
  [
    39,
    "Inspect the owned ReplicaSet",
    "kubectl get replicasets -l app=nginx -o yaml",
    "ReplicaSet",
  ],
  [
    40,
    "Inspect a managed Pod",
    "kubectl get pod $(kubectl get pods -l app=nginx -o jsonpath='{.items[0].metadata.name}') -o yaml",
    "Pod",
  ],
])
  add(
    i,
    title,
    "Follow the workload ownership chain.",
    setupDeployment,
    report(cmd),
    [contains("kind: " + kind)],
    rolloutWhy,
    { brief: "Run " + cmd + " and save the result to answer.txt." },
  );
add(
  41,
  "Wait for a release",
  "Creation returns before rollout completion.",
  setupDeployment,
  report("kubectl rollout status deployment/nginx --timeout=120s"),
  [contains("successfully rolled out")],
  rolloutWhy,
  { brief: "Save the successful rollout status for nginx to answer.txt." },
);
add(
  42,
  "Release the next image",
  "A template change should reach both replicas.",
  setupDeployment,
  "kubectl set image deployment/nginx nginx=nginx:1.19.8\n" +
    waitDeploy("nginx"),
  [imageCheck("nginx:1.19.8"), replicasCheck(2)],
  rolloutWhy,
  { brief: "Update nginx to nginx:1.19.8 and wait for both replicas." },
);
add(
  43,
  "Read the release history",
  "Inspect revisions and current availability.",
  changedDeployment,
  report(
    "kubectl rollout history deployment/nginx; kubectl get replicasets -l app=nginx",
  ),
  [contains("REVISION"), contains("nginx-")],
  rolloutWhy,
  { brief: "Save rollout history and ReplicaSet status to answer.txt." },
);
add(
  44,
  "Undo the last release",
  "Restore the last working Pod template.",
  changedDeployment,
  "kubectl rollout undo deployment/nginx\n" + waitDeploy("nginx"),
  [imageCheck("nginx:1.18.0"), replicasCheck(2)],
  rolloutWhy,
  { brief: "Undo nginx’s latest rollout and restore nginx:1.18.0." },
);
add(
  45,
  "Introduce a broken release",
  "Observe how an unavailable image stalls progress.",
  changedDeployment,
  "kubectl set image deployment/nginx nginx=nginx:1.91",
  [imageCheck("nginx:1.91")],
  rolloutWhy,
  {
    brief:
      "Deliberately update nginx to the nonexistent nginx:1.91 image. This lab expects a broken release; do not repair it.",
  },
);
add(
  46,
  "Diagnose the stalled rollout",
  "A desired image does not imply a running release.",
  failedDeployment,
  report("kubectl describe deployment nginx; kubectl get pods -l app=nginx"),
  [contains("nginx:1.91"), contains("Replicas:")],
  rolloutWhy,
  {
    brief:
      "Save Deployment diagnostics and Pod status for the supplied broken rollout to answer.txt.",
  },
);
add(
  47,
  "Return to a chosen revision",
  "Pick a known template from the history.",
  failedDeployment,
  "kubectl rollout undo deployment/nginx --to-revision=2\n" +
    waitDeploy("nginx"),
  [imageCheck("nginx:1.19.8"), replicasCheck(2)],
  rolloutWhy,
  {
    brief:
      "Restore revision 2 of nginx, which uses nginx:1.19.8, and verify availability.",
  },
);
add(
  48,
  "Inspect one historical template",
  "Revision details explain exactly what ran.",
  failedDeployment +
    "\nkubectl rollout undo deployment/nginx --to-revision=2\n" +
    waitDeploy("nginx"),
  report("kubectl rollout history deployment/nginx --revision=4"),
  [contains("nginx:1.19.8")],
  rolloutWhy,
  {
    brief:
      "Inspect revision 4 of the supplied Deployment and save its template details to answer.txt.",
  },
);
add(
  49,
  "Scale the application",
  "Increase capacity without changing the image.",
  setupDeployment,
  "kubectl scale deployment nginx --replicas=5\n" + waitDeploy("nginx"),
  [replicasCheck(5)],
  rolloutWhy,
  { brief: "Scale nginx to five available replicas." },
);
add(
  50,
  "Define autoscaling bounds",
  "The HPA needs an explicit operating range.",
  setupDeployment,
  "kubectl autoscale deployment nginx --min=5 --max=10 --cpu=80%",
  [
    getCheck(
      "The HPA targets nginx with the requested bounds",
      "hpa/nginx",
      '.spec.scaleTargetRef.name == "nginx" and .spec.minReplicas == 5 and .spec.maxReplicas == 10',
    ),
    getCheck(
      "The target utilization is 80 percent",
      "hpa/nginx",
      '.spec.metrics | any(.resource.name == "cpu" and .resource.target.averageUtilization == 80)',
    ),
  ],
  "An HPA describes a control target. CPU utilization also requires CPU requests and working metrics; creating the object alone does not prove dynamic scaling under load.",
  {
    brief:
      "Create an HPA for nginx with min 5, max 10 and CPU utilization target 80%. This task checks the policy, not a load test.",
  },
);
add(
  51,
  "Pause release reconciliation",
  "Queue a template change without rolling it out.",
  setupDeployment,
  "kubectl rollout pause deployment/nginx",
  [
    getCheck(
      "The rollout is paused",
      "deployment/nginx",
      ".spec.paused == true",
    ),
  ],
  rolloutWhy,
  { brief: "Pause the nginx Deployment rollout." },
);
add(
  52,
  "Change a paused template",
  "The desired image changes while running Pods stay on the old release.",
  setupDeployment + "\nkubectl rollout pause deployment/nginx",
  "kubectl set image deployment/nginx nginx=nginx:1.19.9",
  [
    imageCheck("nginx:1.19.9"),
    getCheck(
      "The rollout stays paused",
      "deployment/nginx",
      ".spec.paused == true",
    ),
    getCheck(
      "Running Pods retain the old image",
      "pods",
      '.items | map(select(.metadata.labels.app == "nginx")) | all(.spec.containers[0].image == "nginx:1.18.0")',
    ),
  ],
  rolloutWhy,
  {
    brief:
      "While nginx is paused, update its template to nginx:1.19.9. Keep it paused and confirm existing Pods remain on nginx:1.18.0.",
  },
);
add(
  53,
  "Resume the queued release",
  "Allow the new template to reach the cluster.",
  setupDeployment +
    "\nkubectl rollout pause deployment/nginx\nkubectl set image deployment/nginx nginx=nginx:1.19.9",
  "kubectl rollout resume deployment/nginx\n" + waitDeploy("nginx"),
  [
    imageCheck("nginx:1.19.9"),
    replicasCheck(2),
    getCheck(
      "The rollout is resumed",
      "deployment/nginx",
      ".spec.paused != true",
    ),
  ],
  rolloutWhy,
  {
    brief:
      "Resume the paused nginx Deployment and wait for nginx:1.19.9 to become available.",
  },
);
add(
  54,
  "Remove the scaling workload",
  "Clean up both the workload and its controller.",
  setupDeployment +
    "\nkubectl autoscale deployment nginx --min=2 --max=5 --cpu=80%",
  "kubectl delete deployment nginx\nkubectl delete hpa nginx",
  [
    absent("The Deployment is removed", "deployment/nginx"),
    absent("The HPA is removed", "hpa/nginx"),
  ],
  "Deleting the Deployment does not automatically delete an independently created HPA; remove both objects.",
  { brief: "Delete the supplied nginx Deployment and HPA." },
);
const stable = deploy("stable", 3, "nginx:1.28");
const canary = deploy("canary", 1, "nginx:1.24.0");
for (const [obj, version] of [
  [stable, "v1"],
  [canary, "v2"],
]) {
  obj.spec.selector.matchLabels = { app: "web", version };
  obj.spec.template.metadata.labels = { app: "web", version };
}
const svc = {
  apiVersion: "v1",
  kind: "Service",
  metadata: { name: "web" },
  spec: { selector: { app: "web" }, ports: [{ port: 80, targetPort: 80 }] },
};
add(
  55,
  "Share traffic with a canary",
  "A shared selector includes three stable Pods and one canary.",
  "",
  [
    apply(stable),
    apply(canary),
    apply(svc),
    waitDeploy("stable"),
    waitDeploy("canary"),
  ].join("\n"),
  [
    getCheck(
      "Stable has three replicas",
      "deployment/stable",
      ".spec.replicas == 3 and .status.availableReplicas == 3",
    ),
    getCheck(
      "Canary has one replica",
      "deployment/canary",
      ".spec.replicas == 1 and .status.availableReplicas == 1",
    ),
    getCheck(
      "The Service selects both versions",
      "service/web",
      '.spec.selector.app == "web" and .spec.selector.version == null',
    ),
  ],
  "A 3:1 endpoint count gives approximate 75/25 distribution for new connections. It is not a guarantee for each small sample, and connection reuse can skew observed requests.",
  {
    brief:
      "Create stable (three nginx:1.28 replicas, version=v1) and canary (one nginx:1.24.0 replica, version=v2), both app=web. Expose both with Service web on port 80.",
  },
);
const job = (name = "hello", extra = {}) => ({
  apiVersion: "batch/v1",
  kind: "Job",
  metadata: { name },
  spec: {
    ...extra,
    template: {
      spec: {
        restartPolicy: "Never",
        containers: [
          {
            name: "worker",
            image: "busybox:1.37",
            command: ["sh", "-c", "echo hello; sleep 3; echo world"],
          },
        ],
      },
    },
  },
});
const pi = job("pi");
pi.spec.template.spec.containers[0] = {
  name: "pi",
  image: "perl:5.34",
  command: ["perl", "-Mbignum=bpi", "-wle", "print bpi(2000)"],
};
const jobWait = (name) =>
  `kubectl wait --for=condition=Complete job/${name} --timeout=180s`;
add(
  56,
  "Calculate with a Job",
  "The controller should track work through completion.",
  "",
  apply(pi) + "\n" + jobWait("pi"),
  [
    getCheck("The pi Job completed", "job/pi", ".status.succeeded == 1"),
    shellCheck(
      "The result begins with pi",
      "kubectl logs job/pi | grep -q '^3.14159'",
    ),
  ],
  "A Job tracks successful completions. The container command is an argument array, so quoting must preserve the Perl expression as one argument.",
  {
    brief:
      'Create Job pi with perl:5.34 and command perl -Mbignum=bpi -wle "print bpi(2000)". Wait for successful completion.',
  },
);
add(
  57,
  "Collect the completed result",
  "Completion and output answer different questions.",
  apply(pi),
  jobWait("pi") + "\n" + report("kubectl logs job/pi"),
  [contains("3.14159")],
  "Wait for completion before collecting the final output; a running Pod may not have finished producing it.",
  {
    brief:
      "Wait for the supplied pi Job to complete and save its logs to answer.txt.",
  },
);
add(
  58,
  "Run a staged task",
  "Observe output before and after a delay.",
  "",
  apply(job()) + "\n" + jobWait("hello"),
  [getCheck("The hello Job completed", "job/hello", ".status.succeeded == 1")],
  "The shell interprets sequential commands inside one argument. restartPolicy Never lets the Job controller decide how to retry failed Pods.",
  {
    brief:
      "Create Job hello using busybox:1.37 to echo hello, sleep 3 seconds, then echo world. The shorter delay makes this lab quick to repeat.",
  },
);
add(
  59,
  "Follow the worker logs",
  "Stream both stages of the task.",
  apply(job()),
  `kubectl wait --for=condition=Ready pod -l job-name=hello --timeout=90s || true\n${report("kubectl logs -f job/hello")}`,
  [contains("hello"), contains("world")],
  "Following logs streams additional output until the container exits; the saved output lets you verify both stages.",
  {
    brief:
      "Follow logs from the supplied hello Job and save them to answer.txt.",
  },
);
add(
  60,
  "Inspect work and its output",
  "Check status, events and logs together.",
  apply(job()),
  jobWait("hello") +
    "\n" +
    report(
      "kubectl get job hello; kubectl describe job hello; kubectl logs job/hello",
    ),
  [contains("Completions:"), contains("world")],
  "Job status, events and logs provide distinct evidence: controller progress, lifecycle issues, and application output.",
  { brief: "Save get, describe and logs output for Job hello to answer.txt." },
);
add(
  61,
  "Remove completed work",
  "The Job is no longer needed.",
  apply(job()) + "\n" + jobWait("hello"),
  "kubectl delete job hello",
  [absent("The Job is removed", "job/hello")],
  "Deleting the Job normally garbage-collects its owned Pods. Keep any required results before cleanup.",
  { brief: "Delete the supplied hello Job." },
);
for (const [i, parallel, title] of [
  [62, 1, "Repeat the Job sequentially"],
  [63, 5, "Run completions in parallel"],
]) {
  const j = job("repeat", { completions: 5, parallelism: parallel });
  add(
    i,
    title,
    "Five successful runs are required.",
    "",
    apply(j) + "\n" + jobWait("repeat"),
    [
      getCheck(
        "The completion and parallelism policy matches",
        "job/repeat",
        `.spec.completions == 5 and .spec.parallelism == ${parallel}`,
      ),
      getCheck("Five runs succeeded", "job/repeat", ".status.succeeded == 5"),
    ],
    "completions counts required successes; parallelism caps concurrent Pods. They are separate controls.",
    {
      brief: `Create Job repeat with five completions and parallelism ${parallel}, using busybox:1.37 to echo hello, sleep 3, echo world. Keep it for grading.`,
    },
  );
}
const deadline = job("deadline", { activeDeadlineSeconds: 30 });
deadline.spec.template.spec.containers[0].command = ["sleep", "3600"];
add(
  64,
  "Bound a Job’s running time",
  "A stuck worker must not run forever.",
  "",
  apply(deadline) +
    "\nkubectl wait --for=condition=Failed job/deadline --timeout=90s",
  [
    getCheck(
      "The deadline is configured",
      "job/deadline",
      ".spec.activeDeadlineSeconds == 30",
    ),
    getCheck(
      "The Job stopped at its deadline",
      "job/deadline",
      '.status.conditions | any(.type == "Failed" and .reason == "DeadlineExceeded")',
    ),
  ],
  "activeDeadlineSeconds bounds the Job’s total active time. It is different from retry limits or CronJob scheduling deadlines.",
  {
    brief:
      "Create Job deadline running sleep 3600 with activeDeadlineSeconds 30, then observe DeadlineExceeded.",
  },
);
const cron = (extra = {}) => ({
  apiVersion: "batch/v1",
  kind: "CronJob",
  metadata: { name: "clock" },
  spec: {
    schedule: "* * * * *",
    ...extra,
    jobTemplate: {
      spec: {
        template: {
          spec: {
            restartPolicy: "Never",
            containers: [
              {
                name: "clock",
                image: "busybox:1.37",
                command: [
                  "sh",
                  "-c",
                  "date; echo Hello from the Kubernetes cluster",
                ],
              },
            ],
          },
        },
      },
    },
  },
});
add(
  65,
  "Schedule a recurring task",
  "The controller should create a new Job each minute.",
  "",
  apply(cron()),
  [
    getCheck(
      "The minute schedule is configured",
      "cronjob/clock",
      '.spec.schedule == "* * * * *"',
    ),
    getCheck(
      "The task command is defined",
      "cronjob/clock",
      '.spec.jobTemplate.spec.template.spec.containers[0].command[2] | contains("Hello from the Kubernetes cluster")',
    ),
  ],
  "A CronJob creates Jobs on a schedule. Its jobTemplate describes each run, not a continuously running Pod.",
  {
    brief:
      "Create CronJob clock running every minute with busybox:1.37, printing date and Hello from the Kubernetes cluster.",
  },
);
for (const i of [66, 67])
  add(
    i,
    i === 66 ? "Keep the scheduled output" : "Inspect a scheduled run",
    "Capture the result before cleaning up.",
    apply(cron()),
    `for i in $(seq 1 45); do JOB=$(kubectl get jobs -o json | jq -r '.items[] | select(.metadata.ownerReferences[]?.name == "clock") | .metadata.name' | head -1); test -n "$JOB" && break; sleep 2; done\ntest -n "$JOB"\nkubectl wait --for=condition=Complete "job/$JOB" --timeout=90s\nkubectl logs "job/$JOB" > answer.txt\nkubectl delete cronjob clock\ncat answer.txt`,
    [
      contains("Hello from the Kubernetes cluster"),
      absent("The CronJob is removed", "cronjob/clock"),
    ],
    "The owner reference identifies the Job created by this CronJob. Capture its output before deleting the schedule and dependent objects.",
    {
      brief:
        "Wait for clock to create a Job, collect its logs into answer.txt, then delete the CronJob. A new run can take up to a minute.",
    },
  );
add(
  68,
  "Limit a missed start",
  "Late scheduling needs its own deadline.",
  "",
  apply(cron({ startingDeadlineSeconds: 17 })),
  [
    getCheck(
      "The scheduling deadline is 17 seconds",
      "cronjob/clock",
      ".spec.startingDeadlineSeconds == 17",
    ),
  ],
  "startingDeadlineSeconds determines how late a missed scheduled run may start. It does not terminate a Job after it has started.",
  {
    brief:
      "Create clock with the minute schedule and startingDeadlineSeconds 17.",
  },
);
const bounded = cron();
bounded.spec.jobTemplate.spec.activeDeadlineSeconds = 12;
add(
  69,
  "Limit each scheduled run",
  "Runtime limits belong inside the Job template.",
  "",
  apply(bounded),
  [
    getCheck(
      "Each Job has a 12-second active deadline",
      "cronjob/clock",
      ".spec.jobTemplate.spec.activeDeadlineSeconds == 12",
    ),
  ],
  "The Job active deadline lives under jobTemplate.spec. A scheduling deadline at the CronJob level solves a different problem.",
  { brief: "Create clock with activeDeadlineSeconds 12 in its Job template." },
);
add(
  70,
  "Retain a small run history",
  "Successful and failed histories have separate limits.",
  apply(cron()),
  `kubectl patch cronjob clock --type=merge -p '{"spec":{"successfulJobsHistoryLimit":2,"failedJobsHistoryLimit":1}}'`,
  [
    getCheck(
      "The history limits are set",
      "cronjob/clock",
      ".spec.successfulJobsHistoryLimit == 2 and .spec.failedJobsHistoryLimit == 1",
    ),
  ],
  "History limits bound retained completed Jobs; they do not change how often the task runs.",
  { brief: "Set clock to retain two successful Jobs and one failed Job." },
);
add(
  71,
  "Run the schedule on demand",
  "Reuse the template without waiting for the next minute.",
  apply(cron({ suspend: true })),
  "kubectl create job manual --from=cronjob/clock\n" + jobWait("manual"),
  [
    getCheck(
      "The manual Job completed",
      "job/manual",
      ".status.succeeded == 1",
    ),
    shellCheck(
      "The output matches the schedule",
      "kubectl logs job/manual | grep -F 'Hello from the Kubernetes cluster' >/dev/null",
    ),
  ],
  "Creating a Job from a CronJob copies its job template. Suspending the schedule does not prevent this manual invocation.",
  {
    brief:
      "Create and complete Job manual from the supplied suspended CronJob clock.",
  },
);
