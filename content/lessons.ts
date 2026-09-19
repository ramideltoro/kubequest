export type Lesson = {
  activity?: string;
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  minutes: number;
  problem: string;
  learn: string[];
  paragraphs: string[];
  try: string;
  why: string;
  analogy: string;
  terms: [string, string][];
  code: string;
  question: string;
  answers: string[];
  correct: number;
  explanation: string;
  docs: string;
};
export const lessons: Lesson[] = [
  {
    id: "apps-and-servers",
    title: "Where does an app live?",
    subtitle: "From a tap on your phone to a computer somewhere else.",
    icon: "node",
    minutes: 6,
    problem:
      "You open Little Notes, a tiny website for saving ideas. What happens between clicking its address and seeing your notes?",
    learn: [
      "Tell the difference between a browser and a server.",
      "Follow a request from a visitor to an application.",
    ],
    paragraphs: [
      "Your browser is the program you use to visit a website. A server is a computer that waits for requests and sends back responses. When you visit Little Notes, your browser asks a server for the page. The application running there decides what to send back.",
      "A request is a message asking for something. A response is the answer. The server might return a web page, a saved note, or an error. The internet connects the computers; it does not automatically run or repair the application.",
      "An application needs a running computer, its code, and any supporting software. If that computer stops, the application on it stops too. Having a second computer helps only if you have arranged for it to run a working copy and receive requests.",
      "Throughout this course, Little Notes will grow from one application on one computer into a small service that can recover from failures. You do not need to write the application code. We will focus on where it runs and what keeps it available.",
    ],
    try: "Send a request, then stop the server. Predict what the next visitor will see. Restart the server and try again.",
    why: "A successful request needs both a reachable server and a working application. An icon labeled “server” does not mean the application is healthy.",
    analogy:
      "A server is like a shop that receives orders. The analogy ends at the software: one real server can run many unrelated applications.",
    terms: [
      ["Browser", "The application you use to visit websites."],
      ["Server", "A computer or program that answers requests."],
      ["Request", "A message asking a program to do or return something."],
    ],
    code: "curl https://example.com\n# curl asks a website for a response from your terminal.",
    question: "The only server running Little Notes shuts down. What happens?",
    answers: [
      "The internet automatically starts a replacement.",
      "Visitors cannot reach that running copy until it returns or another copy takes over.",
      "Every saved note is necessarily deleted.",
    ],
    correct: 1,
    explanation:
      "Availability and stored data are different. The app becomes unavailable, but whether notes survive depends on where they were stored.",
    docs: "https://kubernetes.io/docs/concepts/overview/",
  },
  {
    id: "containers",
    title: "Pack an app into a container",
    subtitle: "Give your application a predictable place to run.",
    icon: "pod",
    minutes: 7,
    problem:
      "Little Notes works on your laptop but fails on a server because a required library is missing.",
    learn: [
      "Distinguish an image from a running container.",
      "Understand what containers package—and what they do not.",
    ],
    paragraphs: [
      "An image is a package containing an application and the files it needs. A container is a running instance created from that image. You can start several containers from the same image, just as you can open several copies of the same document template.",
      "A container runtime is the software that starts and stops containers. It gives the application its own view of processes and files. Containers share the host operating system kernel; they are not complete computers like virtual machines.",
      "Images improve consistency, but they do not contain everything an application might need. Network access, configuration, credentials, and persistent data often come from outside the image. A Linux image also needs a compatible operating system and CPU architecture.",
      "When a container is replaced, files written only inside that container can disappear. Keep this distinction in mind: packaging an application and protecting its data are separate jobs. We will return to storage later.",
    ],
    try: "Start two containers from the Little Notes image. Stop one, then start another from the same image.",
    why: "The image stays available even after a container stops. Starting again creates a new running instance; it does not recover arbitrary files from the old one.",
    analogy:
      "An image is like a recipe plus the ingredients; a container is a meal being prepared. Unlike a recipe, the image contains actual executable files.",
    terms: [
      ["Image", "A packaged application and its supporting files."],
      ["Container", "A running instance made from an image."],
      ["Runtime", "Software that starts and manages containers."],
    ],
    code: "docker run --name little-notes nginx:1.27-alpine\n# Example only: Docker runs a container from an image.\n# Kubernetes uses a container runtime on each node.",
    question: "You delete a container. What must also be deleted?",
    answers: [
      "The image it came from.",
      "All other containers from the same image.",
      "Neither of those things necessarily disappears.",
    ],
    correct: 2,
    explanation:
      "Images and running containers have separate lifecycles. A replacement container starts from the image, not from the deleted container’s writable files.",
    docs: "https://kubernetes.io/docs/concepts/containers/",
  },
  {
    id: "why-kubernetes",
    title: "Why do we need Kubernetes?",
    subtitle: "Tell the system what you want. Let it keep checking.",
    icon: "kubernetes",
    minutes: 7,
    problem:
      "You want three working copies of Little Notes. One crashes while you are asleep. Who notices and starts another?",
    learn: [
      "Explain desired state and reconciliation.",
      "Recognize when Kubernetes adds unnecessary complexity.",
    ],
    paragraphs: [
      "With a few containers, you can start and restart them yourself. As applications grow, someone has to place them on machines, replace failures, manage updates, and connect visitors to healthy copies. Kubernetes coordinates that work.",
      "You describe a desired state: for example, “keep three copies of this app running.” Kubernetes repeatedly compares that request with the current state. If it finds only two copies, a controller tries to create another. This checking and correcting is called reconciliation.",
      "Recovery is not magic or instantaneous. A replacement needs a working node, enough CPU and memory, and an image it can start. If the app has a bug that makes every copy crash, Kubernetes can keep restarting it without fixing the bug.",
      "Kubernetes is valuable for teams running many services or needing its deployment and infrastructure controls. A small static website or a simple application may be easier to run on a managed platform or a single server. Learning Kubernetes includes knowing when not to use it.",
    ],
    try: "Choose three desired copies. Break one. Compare what happens with automatic recovery switched off and on.",
    why: "A controller works toward the desired number. It does not know how to rewrite broken application code.",
    analogy:
      "Think of a caretaker who checks that three lamps are lit and replaces failed bulbs. If the power supply is broken, replacing bulbs will not help.",
    terms: [
      ["Desired state", "What you ask the system to maintain."],
      ["Controller", "A loop that checks and corrects part of the system."],
      ["Reconciliation", "Bringing what exists closer to what was requested."],
    ],
    code: "kubectl scale deployment little-notes --replicas=3\n# Ask the Deployment to maintain three copies.",
    question:
      "All copies crash because the app contains a bug. What does Kubernetes do?",
    answers: [
      "Rewrite the application to remove the bug.",
      "Try to restart or replace them, but the bug still needs fixing.",
      "Guarantee that all requests still succeed.",
    ],
    correct: 1,
    explanation:
      "Kubernetes manages workloads. Repeated restarts can reveal a problem, but they do not repair faulty application code.",
    docs: "https://kubernetes.io/docs/concepts/overview/working-with-objects/",
  },
  {
    id: "meet-the-cluster",
    title: "Meet the cluster",
    subtitle:
      "The computers that run the work, and the system that coordinates it.",
    icon: "node",
    minutes: 7,
    problem:
      "Little Notes has several copies. How does Kubernetes choose where each one should run?",
    learn: [
      "Identify nodes and the control plane.",
      "Explain scheduling without assuming every node has room.",
    ],
    paragraphs: [
      "A cluster is a group of computers managed together by Kubernetes. A node is one of those computers; it can be physical or virtual. Nodes provide CPU, memory, networking, and a container runtime.",
      "The control plane coordinates the cluster. Its API server receives requests, its scheduler chooses nodes for new Pods, and controllers work toward the desired state. A database called etcd stores cluster state. You do not need to memorize these components yet.",
      "Each node has an agent called the kubelet. It makes sure the assigned Pods are running. The scheduler considers requirements and available capacity. A Pod can remain Pending if no node can meet those requirements.",
      "For learning, one computer can run both the control plane and application workloads. In production, teams often separate and replicate components for reliability. A single-node cluster can teach Kubernetes, but cannot demonstrate surviving the loss of its only machine.",
    ],
    try: "Select the control plane and each node to inspect their jobs. Fill the available slots and notice when the next copy must wait.",
    why: "Kubernetes cannot create physical memory or CPU. Asking for more capacity than the cluster has leaves work waiting.",
    analogy:
      "The scheduler resembles a dispatcher assigning jobs to teams. It chooses placement; the kubelet on each node handles execution.",
    terms: [
      ["Cluster", "Computers managed as one Kubernetes system."],
      ["Node", "A computer that can run Kubernetes workloads."],
      ["Control plane", "Components that coordinate the cluster."],
      ["Scheduler", "The component that chooses a node for a new Pod."],
    ],
    code: "kubectl get nodes\nkubectl describe node <node-name>\n# View nodes and inspect their available resources.",
    question:
      "A new Pod needs more memory than any available node can provide. What can happen?",
    answers: [
      "It stays Pending until suitable capacity is available.",
      "Kubernetes downloads extra RAM.",
      "It always runs on the control plane.",
    ],
    correct: 0,
    explanation:
      "The scheduler needs a node that meets the Pod’s requirements. Pending is useful evidence: inspect the scheduling events to learn why.",
    docs: "https://kubernetes.io/docs/concepts/architecture/",
  },
  {
    id: "first-pod",
    title: "Your first Pod",
    subtitle: "Meet the smallest thing Kubernetes schedules.",
    icon: "pod",
    minutes: 6,
    problem:
      "You have an application image. What do you ask Kubernetes to run?",
    learn: [
      "Understand the relationship between Pods and containers.",
      "Distinguish restarting a container from replacing a Pod.",
    ],
    paragraphs: [
      "A Pod wraps one or more containers that need to run together. Kubernetes schedules the Pod onto a node. Most simple applications start with one application container per Pod.",
      "Containers inside the same Pod share a network address and can share volumes. They can talk to each other through localhost. Putting two containers in the same Pod is useful when they have tightly related jobs; unrelated applications usually belong in separate Pods.",
      "A Pod has a lifecycle and an identity. A container can restart inside an existing Pod. A replacement Pod is a new object with a new identity and often a different IP address. You should not rely on a particular Pod living forever.",
      "A standalone Pod is useful for exploration. For an application that should keep running, you normally use a higher-level workload such as a Deployment. Deleting a standalone Pod does not make a Deployment appear to replace it.",
    ],
    try: "Create a standalone Pod, inspect the container inside it, and delete the Pod. Notice that it does not recreate itself.",
    why: "A Pod defines a unit of work. A Deployment provides the controller that maintains replacement copies.",
    analogy:
      "A Pod is a shared workspace for closely related containers. They share networking, but a Pod is not itself a full virtual machine.",
    terms: [
      ["Pod", "The smallest unit Kubernetes schedules onto a node."],
      [
        "localhost",
        "The current network environment; containers in a Pod share it.",
      ],
      [
        "Lifecycle",
        "The stages an object passes through as it starts and stops.",
      ],
    ],
    code: "apiVersion: v1\nkind: Pod\nmetadata:\n  name: little-notes\nspec:\n  containers:\n    - name: web\n      image: nginx:1.27-alpine",
    question:
      "Two containers in one Pod need to communicate. Which address can they use?",
    answers: [
      "Only an external internet address.",
      "localhost, using the appropriate port.",
      "They cannot communicate with each other.",
    ],
    correct: 1,
    explanation:
      "Containers in a Pod share a network namespace. They use different ports when both need to listen for connections.",
    docs: "https://kubernetes.io/docs/concepts/workloads/pods/",
  },
  {
    id: "keep-it-running",
    title: "Keep the app running",
    subtitle: "Let a Deployment look after your copies.",
    icon: "deploy",
    minutes: 8,
    problem:
      "You delete a Little Notes Pod during maintenance. You want its replacement to appear automatically.",
    learn: [
      "Connect Deployments, replicas, and Pods.",
      "Observe recovery and the gap before a replacement is ready.",
    ],
    paragraphs: [
      "A Deployment describes an application’s Pod template and desired number of replicas. A replica is a copy. The Deployment manages ReplicaSets, which maintain the requested number of Pods.",
      "If a managed Pod disappears, the controller creates a replacement. It uses the Pod template rather than recovering the old Pod’s identity. If you want fewer copies permanently, change the desired replica count instead of repeatedly deleting Pods.",
      "More replicas can improve availability and share traffic, but they do not automatically copy application data. If Little Notes saves notes only inside each container, different copies may see different data. Stateful applications need a deliberate storage design.",
      "Recovery takes time. Scheduling, image startup, and health checks happen before the replacement can serve traffic. Extra healthy replicas help during this interval. The system still needs sufficient capacity and a working application.",
    ],
    try: "Set three replicas, break one, and observe the replacement. Then reduce the desired count to one and explain why the extra copies disappear.",
    why: "Deleting one managed Pod changes the current state. Scaling changes the desired state that controllers maintain.",
    analogy:
      "A Deployment is like a staffing plan that requests three workers. It can request replacements, but it cannot guarantee that replacements become productive instantly.",
    terms: [
      ["Deployment", "A workload that manages application Pods and updates."],
      ["Replica", "One copy of a workload."],
      ["Pod template", "The specification used when creating new Pods."],
    ],
    code: "kubectl create deployment little-notes --image=nginx:1.27-alpine\nkubectl scale deployment little-notes --replicas=3\nkubectl get pods -w",
    question:
      "You want exactly one copy instead of three. What should you change?",
    answers: [
      "Delete two Pods and keep deleting replacements.",
      "Set the Deployment’s replica count to one.",
      "Delete the Service.",
    ],
    correct: 1,
    explanation:
      "Scaling updates the desired state. The controller then removes extra Pods rather than recreating them.",
    docs: "https://kubernetes.io/docs/concepts/workloads/controllers/deployment/",
  },
  {
    id: "find-the-app",
    title: "Help visitors find the app",
    subtitle: "Give changing Pods one dependable destination.",
    icon: "svc",
    minutes: 8,
    problem:
      "A replacement Pod has a new IP address. You do not want every caller to update its settings.",
    learn: [
      "Understand Services and label selectors.",
      "Separate internal service access from public access.",
    ],
    paragraphs: [
      "A Service gives clients a stable way to reach a group of Pods. Instead of using a particular Pod’s changing address, callers use the Service’s name or address. Kubernetes tracks the current endpoints behind it.",
      "Labels are key-value tags on objects, such as app=little-notes. A Service’s selector chooses Pods whose labels match. This is exact matching: app=notes and app=little-notes are different values. A Service can exist while selecting no Pods.",
      "Readiness tells Kubernetes whether a Pod should receive normal Service traffic. A running container is not necessarily ready to serve requests. A wrong selector, wrong target port, or failed readiness check can all leave visitors unable to reach the app.",
      "A default ClusterIP Service is reachable within the cluster. Public access is a separate choice. An Ingress describes HTTP routing rules and needs an ingress controller to implement them. Creating a Service alone does not publish an application to the internet.",
    ],
    try: "Change the Service selector so it matches the Pod label, then send a request. Break the match and inspect the route again.",
    why: "The Service follows labels and readiness. It does not infer the right Pods from their names or from what you intended.",
    analogy:
      "A Service resembles a stable reception number that reaches available staff. Labels determine which staff belong to that reception desk.",
    terms: [
      ["Service", "A stable destination for a selected group of Pods."],
      ["Label", "A key-value tag used to identify and group objects."],
      ["Selector", "A rule matching objects by their labels."],
      [
        "Ingress",
        "Rules for routing incoming HTTP traffic through a controller.",
      ],
    ],
    code: "apiVersion: v1\nkind: Service\nmetadata:\n  name: little-notes\nspec:\n  selector:\n    app: little-notes\n  ports:\n    - port: 80\n      targetPort: 80",
    question:
      "A Service selects app=notes, but the Pods have app=little-notes. What happens?",
    answers: [
      "Kubernetes guesses the intended match.",
      "The Service automatically renames the Pods.",
      "Those Pods are not selected by that Service.",
    ],
    correct: 2,
    explanation:
      "Selectors match labels exactly. Comparing selectors, Pod labels, and EndpointSlices is a useful first diagnostic step.",
    docs: "https://kubernetes.io/docs/concepts/services-networking/service/",
  },
  {
    id: "settings-and-storage",
    title: "Settings, secrets, and saved notes",
    subtitle: "Separate your application from its configuration and data.",
    icon: "cm",
    minutes: 9,
    problem:
      "Little Notes needs a greeting, a database password, and a place to keep notes when a Pod is replaced.",
    learn: [
      "Choose ConfigMaps, Secrets, and persistent storage for different needs.",
      "Avoid confusing encoding with encryption.",
    ],
    paragraphs: [
      "A ConfigMap holds non-secret settings, such as a greeting or a feature flag. A Secret is intended for sensitive values such as a password or API credential. Applications can receive both as files or environment variables. Keep real credentials out of example manifests and source control.",
      "Secret values are commonly shown as base64-encoded data. Base64 is an encoding, not encryption. Protecting Secrets also requires appropriate access controls and, where configured, encryption at rest. Calling an object Secret does not make every use of it safe.",
      "Files inside a container’s writable layer can disappear when it is replaced. An emptyDir volume survives a container restart within the same Pod, but is deleted when that Pod is removed. A PersistentVolumeClaim requests storage with a lifecycle separate from an individual Pod.",
      "Persistence is not a backup or a guarantee of availability. Storage can fail, and access modes constrain how applications use it. Also, changing a ConfigMap does not refresh existing environment variables: those containers usually need to be restarted.",
    ],
    try: "Choose temporary or persistent storage. Save a note, replace the Pod, and check whether your note survives.",
    why: "Data survival depends on the storage lifecycle. Our simulation shows Pod replacement; it does not claim a disk failure or accidental deletion is harmless.",
    analogy:
      "A container’s files are like notes on a disposable desk. A persistent volume is a separate filing cabinet, which still needs access controls and backups.",
    terms: [
      ["ConfigMap", "Non-sensitive configuration supplied to workloads."],
      ["Secret", "An object intended to hold sensitive configuration."],
      ["PVC", "A PersistentVolumeClaim: a request for persistent storage."],
    ],
    code: "env:\n  - name: GREETING\n    valueFrom:\n      configMapKeyRef:\n        name: notes-settings\n        key: greeting\n  - name: DB_PASSWORD\n    valueFrom:\n      secretKeyRef:\n        name: notes-credentials\n        key: password",
    question: "Does base64 encoding make a Secret’s value confidential?",
    answers: [
      "Yes, base64 is strong encryption.",
      "No, base64 is easily decoded; access controls and other protections still matter.",
      "Only if the Secret is in the default namespace.",
    ],
    correct: 1,
    explanation:
      "Encoding is reversible without a secret key. Treat access to Secret objects as access to their values.",
    docs: "https://kubernetes.io/docs/concepts/configuration/",
  },
  {
    id: "safe-updates",
    title: "Update without the surprise outage",
    subtitle: "Introduce a new version, check it, and keep a way back.",
    icon: "deploy",
    minutes: 8,
    problem:
      "Version 2 of Little Notes is ready. Replacing every healthy copy at once would risk an outage.",
    learn: [
      "Explain rolling updates and readiness.",
      "Understand what rollback does and does not restore.",
    ],
    paragraphs: [
      "A rolling update gradually replaces old Pods with new ones. The Deployment’s strategy controls how many extra Pods may be created and how many can be unavailable. The cluster needs enough capacity for the chosen strategy.",
      "A readiness probe checks whether a container should receive traffic. A liveness probe checks whether it should be restarted. A startup probe gives a slow-starting application time before other probes take over. Using the wrong check can cause avoidable restarts or send traffic too early.",
      "When new Pods fail readiness, an appropriate rolling strategy keeps old healthy copies serving while the update stalls. You still need to inspect the failure: perhaps the image is wrong, a setting is missing, or the readiness path does not exist.",
      "A rollout undo restores a previous Pod template revision. It does not rewind database migrations, restore deleted notes, or reverse every external change. Plan application and data compatibility alongside deployment mechanics.",
    ],
    try: "Release a healthy version, then try a broken version. Watch which Pods are ready and which version still serves visitors. Roll back the broken release.",
    why: "Readiness determines eligibility for traffic. A new Pod appearing is not proof that a release succeeded.",
    analogy:
      "A rolling update is like replacing buses on a route gradually, after checking the new buses. The route still fails if the replacement plan removes too much capacity.",
    terms: [
      ["Readiness", "Whether a container is ready to receive traffic."],
      ["Liveness", "Whether a container should be restarted."],
      ["Rollback", "Returning to an earlier configuration revision."],
    ],
    code: "kubectl set image deployment/little-notes web=nginx:1.27-alpine\nkubectl rollout status deployment/little-notes\nkubectl rollout undo deployment/little-notes",
    question:
      "A new version is running but its readiness probe fails. Should it normally receive Service traffic?",
    answers: [
      "Yes, running always means ready.",
      "No; investigate why it is not ready.",
      "Only if its name contains “production”.",
    ],
    correct: 1,
    explanation:
      "Running describes process state. Readiness is a separate signal about serving traffic.",
    docs: "https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#rolling-update-deployment",
  },
  {
    id: "bring-it-together",
    title: "Your first Kubernetes story",
    subtitle: "Connect the pieces and explain the result in your own words.",
    icon: "kubernetes",
    minutes: 10,
    problem:
      "Make Little Notes available, keep two copies running, route visitors correctly, and recover after a failure.",
    learn: [
      "Connect the core concepts without memorizing commands.",
      "Identify a sensible next step toward real Kubernetes practice.",
    ],
    paragraphs: [
      "Start with the whole request: run two copies of the application, give callers a stable destination, and avoid losing notes when a Pod is replaced. A Deployment, a Service, and suitable persistent storage solve different parts of that request.",
      "Set the desired replica count, check the Service selector, and choose persistent storage in the exercise. Send a request before and after deleting a Pod. Describe what changed and what stayed stable: the replacement has a new identity, while the desired count and Service name stay the same.",
      "Then introduce a broken update. Look at readiness and keep healthy capacity available. Recovery and rolling updates are controller behavior, not application backups. A useful explanation says both what Kubernetes does and what the application or operator still needs to do.",
      "You now have a starting model of Kubernetes. Next, read a small manifest and follow a recorded real-cluster mission. CKAD preparation adds command-line fluency, detailed workload configuration, debugging, and time pressure; it is a separate path, not a required final exam for this course.",
    ],
    try: "Complete all four goals in the visual challenge: two ready copies, a matching Service, persistent storage, and a successful request after a failure.",
    why: "Good Kubernetes reasoning follows dependencies. If a request fails, inspect the route, selected Pods, readiness, and application evidence rather than changing random settings.",
    analogy:
      "There is no single perfect analogy for a cluster. Use the real names now: Deployment maintains Pods, Service routes to selected ready Pods, and storage has its own lifecycle.",
    terms: [
      [
        "Namespace",
        "A named scope that helps organize many Kubernetes objects.",
      ],
      ["Manifest", "A file describing Kubernetes objects you want."],
      ["kubectl", "The command-line client used to talk to Kubernetes."],
    ],
    code: "kubectl get deployments,pods,services -n quest\nkubectl describe pod <pod-name> -n quest\nkubectl logs <pod-name> -n quest\n# Observe first. Change one thing. Verify the outcome.",
    question: "Which explanation correctly connects the pieces?",
    answers: [
      "A Service stores notes and creates missing Pods.",
      "A Deployment maintains Pods; a Service routes traffic; storage keeps data according to its lifecycle.",
      "A Pod is a permanent computer with a fixed address.",
    ],
    correct: 1,
    explanation:
      "Each resource has a distinct responsibility. Understanding the connections makes both learning and troubleshooting easier.",
    docs: "https://kubernetes.io/docs/tutorials/kubernetes-basics/",
  },
];

lessons.push(
  {
    id: "namespaces-and-labels",
    title: "Give everything a clear home",
    subtitle: "Namespaces organize resources; labels help you find them.",
    icon: "ns",
    activity: "namespaces",
    minutes: 6,
    problem:
      "Little Notes has a practice copy and a production copy. You want to inspect one without confusing it with the other.",
    learn: [
      "Use a namespace to narrow your view.",
      "Explain the difference between grouping resources and protecting them.",
    ],
    paragraphs: [
      "A namespace is a named scope for many Kubernetes objects. You can have a Deployment called little-notes in the practice namespace and another with the same name in production. Some resources, such as nodes, belong to the whole cluster instead.",
      "A label is a key and value attached to an object, such as app=little-notes. A selector finds objects with matching labels. Labels do not create a hierarchy or a security boundary. They help Services, controllers, and people identify related resources.",
      "Always check the cluster and namespace before making a change. A command aimed at the wrong place can affect a working app. In the terminal, specifying a namespace explicitly makes that choice visible. A filtered view can also hide objects that still exist elsewhere.",
      "A namespace alone does not block network traffic or decide who may change resources. Teams combine it with authorization, resource quotas, and network policies. Think of organization and protection as different jobs that need to be configured deliberately.",
    ],
    try: "Switch between practice and production. Filter by app label. Remove the practice notes Pod, then confirm production remains visible.",
    why: "A narrow view helps you act on the intended objects. Access rules provide protection; the namespace name alone does not.",
    analogy:
      "Folders help organize documents, but naming one private does not give it a lock. Namespaces also need explicit controls.",
    terms: [
      ["Namespace", "A named scope for many cluster resources."],
      ["Label", "A key and value used to identify or group objects."],
      ["Selector", "A rule that finds objects with matching labels."],
    ],
    code: "kubectl get pods -n practice -l app=little-notes\n# Check the namespace and selector before changing anything.",
    question:
      "Does a namespace automatically block all traffic from other namespaces?",
    answers: [
      "Yes, every namespace is an isolated network.",
      "No. Traffic restrictions require configured network controls.",
      "Only if its name contains private.",
    ],
    correct: 1,
    explanation:
      "Namespaces organize objects. Network policies and the cluster’s networking implementation control allowed traffic.",
    docs: "https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/",
  },
  {
    id: "resource-budgets",
    title: "Leave enough room to run",
    subtitle: "Requests help placement; limits put boundaries on use.",
    icon: "node",
    activity: "resources",
    minutes: 8,
    problem:
      "A new Pod stays Pending even though you asked Kubernetes to run it. Another starts, then is killed when it uses too much memory.",
    learn: [
      "Distinguish resource requests from limits.",
      "Tell a placement problem from a memory-limit problem.",
    ],
    paragraphs: [
      "A resource request tells the scheduler how much CPU or memory to account for when placing a Pod. The scheduler needs a node with enough available requested capacity. A request is not a promise that extra capacity can appear whenever an app grows.",
      "A limit sets an upper boundary for a container’s use. CPU and memory behave differently. A CPU limit can throttle work, making it slower. If a container tries to use more memory than its limit, it can be terminated with an out-of-memory reason, often shown as OOMKilled.",
      "A memory request larger than the available capacity can leave a Pod Pending. That is different from a running container exceeding its limit. Look at scheduling events for the first problem and container status or memory observations for the second. MiB is a unit of memory; you do not need to convert it to learn the relationship here.",
      "Choose values based on observed workload needs and leave room for change. Setting tiny values just to make a warning disappear can create instability. Setting very large requests can stop other work fitting. Kubernetes manages finite resources; it does not fix leaks in application code.",
    ],
    try: "Make the request too large for the node. Then make it fit but set a limit below the app’s use. Finally find values that let the app run.",
    why: "Placement and runtime enforcement answer different questions: is there room to schedule, and how much may the container use?",
    analogy:
      "Reserving seats and setting a room’s safety capacity are different decisions. CPU and memory also need their own, distinct rules.",
    terms: [
      [
        "Request",
        "Resource capacity accounted for when scheduling a workload.",
      ],
      ["Limit", "An upper boundary applied to container resource use."],
      ["Pending", "A Pod has not yet reached its running state."],
      [
        "OOMKilled",
        "A process was killed because of an out-of-memory condition.",
      ],
    ],
    code: "resources:\n  requests:\n    memory: 256Mi\n    cpu: 100m\n  limits:\n    memory: 512Mi\n    cpu: 500m",
    question:
      "A Pod cannot fit its memory request on any node. What is a likely result?",
    answers: [
      "It stays Pending with a scheduling explanation.",
      "Kubernetes creates physical memory.",
      "It automatically ignores every request.",
    ],
    correct: 0,
    explanation:
      "The scheduler needs a suitable node. Inspect its events and capacity before adjusting requests or adding resources.",
    docs: "https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/",
  },
  {
    id: "jobs-that-finish",
    title: "Some work should finish",
    subtitle: "Use Jobs for tasks and Deployments for ongoing services.",
    icon: "job",
    activity: "jobs",
    minutes: 6,
    problem:
      "Little Notes needs a one-time export. You do not want the export program to keep starting forever after it succeeds.",
    learn: [
      "Choose a Job for work with a completion point.",
      "Understand retries and scheduled work without assuming exactly-once execution.",
    ],
    paragraphs: [
      "A web server normally keeps running and waits for more requests. A report export does a task and exits. A Deployment fits many ongoing application services. A Job manages Pods that work toward a successful completion target.",
      "If a Job’s Pod fails, Kubernetes can retry within configured limits. A successful task is allowed to stay finished. The application should communicate failure through an unsuccessful exit status, not simply print an error and pretend the work succeeded.",
      "A CronJob creates Jobs according to a schedule, such as a nightly report. Schedules and retries are not a guarantee that a business action happens exactly once. Write tasks so repeated attempts are safe, and decide what should happen if a previous run is still active.",
      "Task output also needs a home. A completed Pod is not a backup system. Save useful results to appropriate persistent storage or an external service, and set a cleanup policy for old completed work. The runtime object and the valuable data have different lifetimes.",
    ],
    try: "Run the export as a Job and observe completion. Compare a Deployment, then fail an attempt and retry the Job.",
    why: "The workload type should match the job: maintain a service, complete a task, or start tasks on a schedule.",
    analogy:
      "A shop stays open; a delivery has a finish line. You would not use the same rule to keep both continuously active.",
    terms: [
      ["Job", "A workload that runs tasks toward successful completion."],
      ["CronJob", "An object that creates Jobs on a schedule."],
      ["Retry", "Another attempt after a failure."],
    ],
    code: "kubectl get jobs\nkubectl get cronjobs\n# A Job can complete successfully rather than keep serving traffic.",
    question: "Which workload fits a single report export that should finish?",
    answers: [
      "A Service, because it stores reports.",
      "A Deployment that restarts the completed export forever.",
      "A Job with suitable retry and output-storage settings.",
    ],
    correct: 2,
    explanation:
      "A Job describes completion-oriented work. It still needs a safe retry strategy and somewhere durable to store useful output.",
    docs: "https://kubernetes.io/docs/concepts/workloads/controllers/job/",
  },
  {
    id: "observe-and-debug",
    title: "Read the clues, then make a change",
    subtitle: "A small investigation is better than a random restart.",
    icon: "pod",
    activity: "debug",
    minutes: 7,
    problem:
      "Little Notes says Running, but visitors receive errors. Decide what evidence would distinguish a routing issue from an app configuration issue.",
    learn: [
      "Use status, events, logs, and a real request together.",
      "Reject a superficial fix that only hides the warning.",
    ],
    paragraphs: [
      "Start with the symptom: what request failed, in which namespace, and after which change? Check the current workload state. A Pod marked Running has started its containers; that alone does not mean the app can serve useful responses or reach its dependencies.",
      "Events can explain scheduling or startup problems. Container logs can explain application behavior. Readiness tells you whether a Pod should receive traffic according to its configured check. Request results show what a client actually experiences. Each piece has a limited view.",
      "Form a hypothesis that fits the evidence. If the logs say the database port is wrong, adding replicas gives you more copies with the same error. Removing the readiness probe may hide a warning while sending traffic to a broken app. Fix the underlying setting and test the request again.",
      "Change one relevant thing at a time, keep sensitive data out of shared logs, and use a rollback when that is the safest recovery. Kubernetes gives you tools for observation and control. Understanding what those tools prove is a skill you can carry into the CKAD missions.",
    ],
    try: "Inspect the three evidence cards. Try a superficial repair and see why the request still fails. Apply the repair supported by the logs, then verify it.",
    why: "A useful repair changes the failing behavior, not merely the status you are watching.",
    analogy:
      "Covering a warning light does not repair a car. Removing a probe can hide evidence without restoring the application.",
    terms: [
      [
        "Event",
        "A cluster record explaining something that happened to a resource.",
      ],
      ["Log", "An application or system record of an event."],
      ["Verification", "Checking that the intended behavior now works."],
    ],
    code: "kubectl get pods -n quest\nkubectl describe pod <pod> -n quest\nkubectl logs <pod> -n quest\n# Compare these clues with the request a visitor is making.",
    question:
      "Removing a failing readiness check makes the Pod look ready, but requests still fail. Is the incident fixed?",
    answers: [
      "Yes, the green label is the only goal.",
      "No. Verify and repair the actual failing request path.",
      "Yes, because probes cause every application error.",
    ],
    correct: 1,
    explanation:
      "The probe was exposing a symptom. A real fix restores useful application behavior and an appropriate health signal.",
    docs: "https://kubernetes.io/docs/tasks/debug/debug-application/",
  },
);
