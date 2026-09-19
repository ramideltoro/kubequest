export type Mission = {
  id: string;
  title: string;
  tagline: string;
  icon: string;
  domain: string;
  minutes: number;
  difficulty: string;
  brief: string;
  objectives: string[];
  hints: string[];
  solution: string;
  why: string;
  docs: string;
  starter: string;
};
export const missions: Mission[] = [
  {
    id: "lost-in-routing",
    title: "The case of the missing endpoints",
    tagline: "The Pods are healthy. The checkout is not.",
    icon: "svc",
    domain: "Services & Networking",
    minutes: 12,
    difficulty: "Warm-up",
    brief:
      "Little Notes has just been renamed during a release. Both web Pods are healthy, but callers of the notes Service get no response. Restore service without deleting the Deployment or changing the Pod labels.",
    objectives: [
      "Keep two healthy notes replicas with app=little-notes.",
      "Make the notes Service select those Pods.",
      "Keep Service port 80 targeting the application on port 80.",
      "Verify that HTTP requests through the Service succeed.",
    ],
    hints: [
      "A Service can exist without having any usable endpoints. Compare the selector with the Pod labels.",
      "Run kubectl get svc notes -n quest -o yaml and kubectl get pods -n quest --show-labels.",
      "Patch the Service selector to app: little-notes, then check EndpointSlices and curl the Service.",
    ],
    solution:
      'kubectl patch service notes -n quest --type merge -p \'{"spec":{"selector":{"app":"little-notes"}}}\'\nkubectl get endpointslices -n quest\nkubectl exec -n quest probe -- wget -qO- http://notes',
    why: "The Service selector used the old app name. A selector follows exact label values, so healthy Pods were never candidates. Changing the selector restores routing without restarting the workload.",
    docs: "https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/",
    starter:
      "apiVersion: v1\nkind: Service\nmetadata:\n  name: notes\n  namespace: quest\nspec:\n  selector:\n    app: old-notes\n  ports:\n    - port: 80\n      targetPort: 80",
  },
  {
    id: "running-not-ready",
    title: "Running is not ready",
    tagline: "A health check has taken a healthy app out of service.",
    icon: "pod",
    domain: "Observability & Maintenance",
    minutes: 15,
    difficulty: "Intermediate",
    brief:
      "The notes Deployment starts successfully, but the Service has no ready endpoints. The web server serves its homepage at /. Restore readiness and add a liveness check without removing health checks.",
    objectives: [
      "Make both replicas Ready.",
      "Use an HTTP readiness probe on / and port 80.",
      "Add a liveness probe on / and port 80.",
      "Verify the Service responds successfully.",
    ],
    hints: [
      "Inspect the Pod events. A failed readiness probe is different from a crashing application.",
      "Run kubectl describe pod -n quest and compare the probe path to the web server routes.",
      "Use kubectl edit deployment notes -n quest. Set readinessProbe.httpGet.path to / and add a livenessProbe with the same HTTP endpoint.",
    ],
    solution:
      'kubectl patch deployment notes -n quest --type=strategic -p \'{"spec":{"template":{"spec":{"containers":[{"name":"web","readinessProbe":{"httpGet":{"path":"/","port":80}},"livenessProbe":{"httpGet":{"path":"/","port":80},"initialDelaySeconds":5}}]}}}}\'\nkubectl rollout status deployment/notes -n quest',
    why: "The readiness probe requested a nonexistent path. Kubernetes correctly withheld traffic from those Pods. Liveness is a separate check: it requests a restart when a running container is unhealthy.",
    docs: "https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/",
    starter:
      "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: notes\n  namespace: quest\nspec:\n  replicas: 2\n  selector:\n    matchLabels: {app: little-notes}\n  template:\n    metadata:\n      labels: {app: little-notes}\n    spec:\n      containers:\n        - name: web\n          image: nginx:1.27-alpine\n          readinessProbe:\n            httpGet: {path: /ready, port: 80}",
  },
  {
    id: "configuration-drift",
    title: "The missing piece of configuration",
    tagline: "The credentials exist. The workload cannot find them.",
    icon: "secret",
    domain: "Configuration & Security",
    minutes: 15,
    difficulty: "Intermediate",
    brief:
      "The notes application requires GREETING from ConfigMap notes-settings (key greeting) and DB_PASSWORD from Secret notes-credentials (key password). The release wired the references incorrectly. Fix the references without hardcoding the values.",
    objectives: [
      "Reference the provided ConfigMap key for GREETING.",
      "Reference the provided Secret key for DB_PASSWORD.",
      "Restore two ready replicas.",
      "Confirm the app serves the configured greeting.",
    ],
    hints: [
      "CreateContainerConfigError often points to a missing object or key rather than an image problem.",
      "Inspect the Deployment env entries and the ConfigMap/Secret key names. Do not paste real secrets into the tutor.",
      "Use configMapKeyRef name notes-settings, key greeting; and secretKeyRef name notes-credentials, key password.",
    ],
    solution:
      'kubectl set env deployment/notes -n quest GREETING- DB_PASSWORD-\nkubectl patch deployment notes -n quest --type=strategic -p \'{"spec":{"template":{"spec":{"containers":[{"name":"web","env":[{"name":"GREETING","valueFrom":{"configMapKeyRef":{"name":"notes-settings","key":"greeting"}}},{"name":"DB_PASSWORD","valueFrom":{"secretKeyRef":{"name":"notes-credentials","key":"password"}}}]}]}}}}\'\nkubectl rollout status deployment/notes -n quest',
    why: "The workload consumes configuration by object name and key. Correcting those references keeps the image reusable and avoids embedding credentials in the Pod template. Existing environment variables refresh when new containers start.",
    docs: "https://kubernetes.io/docs/tasks/inject-data-application/define-environment-variable-container/",
    starter:
      "apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: notes-settings\n  namespace: quest\ndata:\n  greeting: Hello from Little Notes",
  },
  {
    id: "release-rescue",
    title: "Rescue a stalled release",
    tagline: "An image typo meets a risky rollout strategy.",
    icon: "deploy",
    domain: "Application Deployment",
    minutes: 18,
    difficulty: "Intermediate",
    brief:
      "A release references an unavailable image and allows every replica to go unavailable. Restore nginx:1.27-alpine, retain two replicas, and configure future rolling updates to keep all desired replicas available.",
    objectives: [
      "Use the available nginx:1.27-alpine image.",
      "Keep two ready replicas.",
      "Set RollingUpdate with maxUnavailable 0 and maxSurge 1.",
      "Verify successful HTTP traffic.",
    ],
    hints: [
      "Describe the failing Pod and inspect the Deployment update strategy.",
      "An ImagePullBackOff can be caused by a nonexistent tag. This isolated lab has its approved images preloaded.",
      "Set the image with kubectl set image, then patch the rollingUpdate settings and watch rollout status.",
    ],
    solution:
      'kubectl set image deployment/notes web=nginx:1.27-alpine -n quest\nkubectl patch deployment notes -n quest --type merge -p \'{"spec":{"strategy":{"type":"RollingUpdate","rollingUpdate":{"maxUnavailable":0,"maxSurge":1}}}}\'\nkubectl rollout status deployment/notes -n quest',
    why: "A valid image lets the new Pods start. maxUnavailable: 0 retains healthy capacity while maxSurge: 1 permits an extra Pod during the change. This requires enough spare resources and correct readiness checks.",
    docs: "https://kubernetes.io/docs/concepts/workloads/controllers/deployment/",
    starter:
      "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: notes\n  namespace: quest\nspec:\n  replicas: 2\n  selector:\n    matchLabels: {app: little-notes}\n  strategy:\n    type: RollingUpdate\n    rollingUpdate: {maxUnavailable: 2, maxSurge: 0}\n  template:\n    metadata:\n      labels: {app: little-notes}\n    spec:\n      containers:\n        - name: web\n          image: nginx:missing-release",
  },
  {
    id: "handoff-between-containers",
    title: "A broken handoff",
    tagline: "The init container wrote a page nobody can read.",
    icon: "pod",
    domain: "Application Design & Build",
    minutes: 18,
    difficulty: "Intermediate",
    brief:
      "An init container must create a welcome page before the nginx container starts. Repair their shared volume wiring so the Service returns WELCOME_TO_LITTLE_NOTES. Keep the init-container pattern.",
    objectives: [
      "Keep an init container that writes the welcome page.",
      "Mount the shared emptyDir at /work in the init container.",
      "Mount that same volume at /usr/share/nginx/html in the web container.",
      "Serve WELCOME_TO_LITTLE_NOTES through the Service.",
    ],
    hints: [
      "Containers have separate writable layers. A path existing in one does not make it appear in another.",
      "Inspect kubectl logs for the prepare init container and compare volumeMounts with spec.volumes.",
      "Mount volume shared at /work in prepare. The web container already expects shared at /usr/share/nginx/html.",
    ],
    solution:
      'kubectl patch deployment notes -n quest --type=strategic -p \'{"spec":{"template":{"spec":{"initContainers":[{"name":"prepare","volumeMounts":[{"name":"shared","mountPath":"/work"}]}]}}}}\'\nkubectl rollout status deployment/notes -n quest\nkubectl exec -n quest probe -- wget -qO- http://notes',
    why: "The init container completes before application containers start. An emptyDir shared by both containers carries the generated file across that boundary. It remains temporary storage tied to this Pod.",
    docs: "https://kubernetes.io/docs/concepts/workloads/pods/init-containers/",
    starter:
      'apiVersion: v1\nkind: Pod\nmetadata:\n  name: shared-volume-example\n  namespace: quest\nspec:\n  initContainers:\n    - name: prepare\n      image: busybox:1.37\n      command: [sh, -c, "echo WELCOME_TO_LITTLE_NOTES > /work/index.html"]\n      volumeMounts: [{name: shared, mountPath: /work}]\n  containers:\n    - name: web\n      image: nginx:1.27-alpine\n      volumeMounts: [{name: shared, mountPath: /usr/share/nginx/html}]\n  volumes: [{name: shared, emptyDir: {}}]',
  },
  {
    id: "report-that-disappeared",
    title: "The report that disappeared",
    tagline: "The Job succeeded. Its output did not survive.",
    icon: "job",
    domain: "Application Design & Build",
    minutes: 20,
    difficulty: "Intermediate",
    brief:
      "The daily-report Job writes DAILY_REPORT to /data/report.txt, but its output is on temporary storage. Recreate the Job using the existing reports PVC and prove that the report-reader Pod can read the result. Job Pod templates are immutable.",
    objectives: [
      "Use the existing Bound reports PersistentVolumeClaim.",
      "Make daily-report mount reports at /data.",
      "Complete the Job successfully.",
      "Read DAILY_REPORT from report-reader after the Job completes.",
    ],
    hints: [
      "A Job succeeding only proves that its command exited successfully. Check where the output was written.",
      "Compare the Job volume source with the report-reader Pod. The Job template cannot be edited in place.",
      "Export the Job manifest, replace emptyDir with persistentVolumeClaim.claimName: reports, remove generated metadata/selectors, and delete/recreate only the Job.",
    ],
    solution:
      "kubectl delete job daily-report -n quest\ncat <<'YAML' | kubectl apply -f -\napiVersion: batch/v1\nkind: Job\nmetadata:\n  name: daily-report\n  namespace: quest\nspec:\n  template:\n    spec:\n      restartPolicy: Never\n      containers:\n        - name: report\n          image: busybox:1.37\n          command: [sh, -c, \"echo DAILY_REPORT > /data/report.txt\"]\n          volumeMounts: [{name: data, mountPath: /data}]\n      volumes:\n        - name: data\n          persistentVolumeClaim: {claimName: reports}\nYAML\nkubectl wait --for=condition=complete job/daily-report -n quest --timeout=60s\nkubectl exec report-reader -n quest -- cat /data/report.txt",
    why: "The original Job wrote to emptyDir, whose lifecycle belongs to the Pod. Both the Job and reader must mount the same PVC. This single-node exercise verifies Pod-independent storage, not multi-node storage availability.",
    docs: "https://kubernetes.io/docs/concepts/workloads/controllers/job/",
    starter:
      'apiVersion: batch/v1\nkind: Job\nmetadata:\n  name: daily-report\n  namespace: quest\nspec:\n  template:\n    spec:\n      restartPolicy: Never\n      containers:\n        - name: report\n          image: busybox:1.37\n          command: [sh, -c, "echo DAILY_REPORT > /data/report.txt"]\n          volumeMounts: [{name: data, mountPath: /data}]\n      volumes:\n        - name: data\n          emptyDir: {}',
  },
  {
    id: "least-privilege",
    title: "A smaller set of privileges",
    tagline: "Keep the worker useful. Remove what it does not need.",
    icon: "sa",
    domain: "Configuration & Security",
    minutes: 20,
    difficulty: "Challenge",
    brief:
      "The notes-worker Deployment only processes local files. Run it as non-root UID 1000, prevent privilege escalation, drop all Linux capabilities, disable the service-account token, and give it explicit CPU/memory requests and limits.",
    objectives: [
      "Run UID 1000 with runAsNonRoot and allowPrivilegeEscalation false.",
      "Drop ALL capabilities and disable automountServiceAccountToken.",
      "Set positive CPU/memory requests and limits with requests ≤ limits.",
      "Keep one ready replica and verify UID 1000 in the running container.",
    ],
    hints: [
      "Container security settings and Pod settings live at different levels of the manifest.",
      "Use securityContext on the worker container, but automountServiceAccountToken belongs under spec.template.spec.",
      "Use runAsUser: 1000, runAsNonRoot: true, allowPrivilegeEscalation: false, capabilities.drop: [ALL], and modest requests/limits such as 50m/32Mi and 200m/64Mi.",
    ],
    solution:
      'kubectl patch deployment notes-worker -n quest --type=strategic -p \'{"spec":{"template":{"spec":{"automountServiceAccountToken":false,"containers":[{"name":"worker","securityContext":{"runAsUser":1000,"runAsNonRoot":true,"allowPrivilegeEscalation":false,"capabilities":{"drop":["ALL"]}},"resources":{"requests":{"cpu":"50m","memory":"32Mi"},"limits":{"cpu":"200m","memory":"64Mi"}}}]}}}}\'\nkubectl rollout status deployment/notes-worker -n quest',
    why: "These controls address different risks: identity, privilege escalation, kernel capabilities, API credentials, and resource consumption. A non-root UID alone does not provide all of them.",
    docs: "https://kubernetes.io/docs/tasks/configure-pod-container/security-context/",
    starter:
      'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: notes-worker\n  namespace: quest\nspec:\n  replicas: 1\n  selector:\n    matchLabels: {app: notes-worker}\n  template:\n    metadata:\n      labels: {app: notes-worker}\n    spec:\n      containers:\n        - name: worker\n          image: busybox:1.37\n          command: [sh, -c, "sleep 86400"]',
  },
  {
    id: "open-the-right-door",
    title: "Open the right door",
    tagline: "Let the frontend in. Keep an unrelated caller out.",
    icon: "netpol",
    domain: "Services & Networking",
    minutes: 22,
    difficulty: "Challenge",
    brief:
      "The notes Pods are isolated by a NetworkPolicy that allows nobody. Permit traffic on TCP 80 from role=frontend Pods and the ingress controller in kube-system, keep intruder blocked, and route notes.quest.test through the provided Traefik Ingress.",
    objectives: [
      "Select app=little-notes with an ingress NetworkPolicy.",
      "Allow the frontend probe, while the intruder request times out.",
      "Route host notes.quest.test to notes:80 using Ingress.",
      "Verify both permitted Service traffic and the Ingress response.",
    ],
    hints: [
      "NetworkPolicies are additive. Deleting the deny policy alone opens access to every caller.",
      "Inspect labels on probe and intruder. Ingress traffic originates from the controller, so account for that source as well.",
      "Allow podSelector role=frontend and namespaceSelector kubernetes.io/metadata.name=kube-system on TCP 80; correct the Ingress service backend to notes.",
    ],
    solution:
      'cat <<\'YAML\' | kubectl apply -f -\napiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:\n  name: notes-ingress\n  namespace: quest\nspec:\n  podSelector:\n    matchLabels: {app: little-notes}\n  policyTypes: [Ingress]\n  ingress:\n    - from:\n        - podSelector:\n            matchLabels: {role: frontend}\n        - namespaceSelector:\n            matchLabels: {kubernetes.io/metadata.name: kube-system}\n      ports: [{protocol: TCP, port: 80}]\nYAML\nkubectl patch ingress notes -n quest --type=json -p \'[{"op":"replace","path":"/spec/rules/0/http/paths/0/backend/service/name","value":"notes"}]\'\nkubectl exec probe -n quest -- wget -qO- -T 3 http://notes',
    why: "The policy makes the destination Pods ingress-isolated and permits specific sources. The Service still routes requests, while Ingress adds an HTTP host rule. A real connectivity test catches policies that look plausible but do not enforce the intended access.",
    docs: "https://kubernetes.io/docs/concepts/services-networking/network-policies/",
    starter:
      "apiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:\n  name: notes-ingress\n  namespace: quest\nspec:\n  podSelector:\n    matchLabels: {app: little-notes}\n  policyTypes: [Ingress]\n  ingress: []",
  },
];
export const domains = [
  {
    name: "Application Design & Build",
    weight: 20,
    covered: "Init containers, shared volumes, Jobs, PVCs",
    remaining:
      "Image building, CronJobs, DaemonSets, additional multi-container patterns",
  },
  {
    name: "Application Deployment",
    weight: 20,
    covered: "Rolling updates, image failures, rollout recovery",
    remaining: "Helm, Kustomize, canary and blue/green deployments",
  },
  {
    name: "Observability & Maintenance",
    weight: 15,
    covered: "Readiness, liveness, events, logs, debugging",
    remaining: "Startup probes and API deprecation exercises",
  },
  {
    name: "Configuration & Security",
    weight: 25,
    covered: "ConfigMaps, Secrets, security contexts, resource limits",
    remaining: "Quotas, RBAC, admission, CRDs and operators",
  },
  {
    name: "Services & Networking",
    weight: 20,
    covered: "Services, selectors, Ingress, NetworkPolicies",
    remaining: "Additional network and multi-namespace troubleshooting",
  },
];
