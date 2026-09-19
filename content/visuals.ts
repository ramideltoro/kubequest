/** Reviewed teaching diagrams. All states are illustrations, never cluster observations. */
export type VisualNode = {
  icon: string;
  label: string;
  note: string;
  detail: string;
};
export type VisualEdge = { from: number; to: number; label: string };
export type Visual = {
  title: string;
  summary: string;
  nodes: VisualNode[];
  edges: VisualEdge[];
  layout?: "branch" | "cycle";
  contrast?: {
    label: string;
    summary: string;
    focus: number[];
    blocked?: number[];
  };
};
const n = (
  icon: string,
  label: string,
  note: string,
  detail: string,
): VisualNode => ({ icon, label, note, detail });
const e = (from: number, to: number, label: string): VisualEdge => ({
  from,
  to,
  label,
});
const browser = () =>
  n(
    "ui-browser",
    "Browser",
    "The part you use",
    "The browser draws the page and sends requests. It does not directly control the server’s files or database.",
  );
const app = () =>
  n(
    "ui-app",
    "Application",
    "The working program",
    "The app receives a request, checks what is allowed, does the work, and returns a result.",
  );
const database = () =>
  n(
    "ui-data",
    "Database",
    "Saved information",
    "The database stores and finds notes. The application talks to it on the user’s behalf.",
  );
const server = () =>
  n(
    "ui-server",
    "Server",
    "A computer for the app",
    "A server supplies CPU, memory, disk, and networking. A running program must listen for incoming requests.",
  );
const pod = (label = "Pod", note = "Runs the app") =>
  n(
    "pod",
    label,
    note,
    "A Pod is the unit Kubernetes places on a node. It contains one or more containers sharing networking and, when configured, volumes.",
  );
const service = () =>
  n(
    "svc",
    "Service",
    "A stable destination",
    "A Service selects Pods by labels. Normal traffic goes to ready endpoints; the Service itself is not the application.",
  );
const deployment = () =>
  n(
    "deploy",
    "Deployment",
    "Keeps copies running",
    "A Deployment manages ReplicaSets, which maintain the requested Pods. The diagram shortens that chain; it does not show every controller.",
  );
const volume = () =>
  n(
    "pvc",
    "Storage claim",
    "A request for a volume",
    "A PersistentVolumeClaim connects a workload to provisioned storage. Keeping data through a Pod replacement does not make a backup.",
  );
export const visuals: Record<string, Visual> = {
  "what-is-an-app": {
    title: "One app. Three different jobs.",
    summary:
      "Little Notes has a visible page, a program that makes decisions, and a place to keep notes. Follow the arrows to see who asks whom.",
    nodes: [
      browser(),
      app(),
      database(),
      n(
        "ui-browser",
        "Updated page",
        "Your note appears",
        "The browser updates the screen after the app confirms the result. Drawing a note alone is not proof that it was saved.",
      ),
    ],
    edges: [
      e(0, 1, "save a note"),
      e(1, 2, "store it"),
      e(2, 3, "reply via app"),
    ],
    contrast: {
      label: "One server can do both",
      summary:
        "The backend and database are different jobs, but they can run on the same computer. Boxes represent responsibilities, not a required number of machines.",
      focus: [1, 2],
    },
  },
  "request-and-response": {
    title: "A request makes a round trip",
    summary:
      "A successful save needs the request to arrive, the work to finish, and the response to return.",
    nodes: [
      browser(),
      app(),
      database(),
      n(
        "ui-network",
        "Response",
        "Saved: note 42",
        "The result travels back through the application to the browser. If the reply is lost, the browser may not know whether the note was saved.",
      ),
    ],
    edges: [
      e(0, 1, "please save"),
      e(1, 2, "write note"),
      e(2, 3, "saved result"),
      e(3, 0, "confirmation"),
    ],
    layout: "cycle",
    contrast: {
      label: "Lose the reply",
      summary:
        "The note may already be stored even though the browser sees a timeout. Check the outcome before retrying a request that could create a duplicate.",
      focus: [3],
      blocked: [3],
    },
  },
  "http-and-https": {
    title: "Read a web conversation",
    summary:
      "A request names an action and a path. The server replies with a status and, often, some content.",
    nodes: [
      n(
        "ui-browser",
        "GET /notes",
        "Read my notes",
        "GET asks to read a resource. POST /notes can submit a new note. The application defines exactly what each route does.",
      ),
      n(
        "ui-lock",
        "HTTPS connection",
        "Protected in transit",
        "TLS protects the connection and checks the server’s certificate. It does not grant the visitor permission to read private notes.",
      ),
      app(),
      n(
        "ui-file",
        "200 + notes",
        "Status and content",
        "200 indicates a successful read in this example. 201 means created, 404 means not found, and 503 means currently unavailable.",
      ),
    ],
    edges: [e(0, 1, "request"), e(1, 2, "deliver"), e(2, 3, "response")],
    contrast: {
      label: "An unknown path",
      summary:
        "GET /missing can reach the server over a secure connection and still return 404. Connection security and the application’s result are separate ideas.",
      focus: [0, 3],
    },
  },
  "dns-and-addresses": {
    title: "A name points to an address",
    summary:
      "DNS helps the browser find an address. The browser then makes its own connection to the server.",
    nodes: [
      browser(),
      n(
        "ui-network",
        "DNS resolver",
        "Looks up the name",
        "A resolver finds a record for a name such as notes.example. DNS is a lookup, not a tunnel carrying all the website’s traffic.",
      ),
      n(
        "ui-file",
        "IP address",
        "192.0.2.10 · example",
        "An IP address identifies a network destination. This address is reserved for documentation; it is not a real lab host.",
      ),
      server(),
    ],
    edges: [e(0, 1, "lookup"), e(1, 2, "returns"), e(0, 3, "connects")],
    contrast: {
      label: "Point to the wrong address",
      summary:
        "The server may be healthy while the name points somewhere else. Correcting the DNS record fixes the lookup; cached answers can take time to refresh.",
      focus: [1, 2],
      blocked: [2],
    },
  },
  "network-ports": {
    title: "The address gets you to the computer",
    summary:
      "The port selects a listening program. Network rules must also allow the connection.",
    nodes: [
      browser(),
      n(
        "ui-shield",
        "Network rule",
        "Allows TCP 443",
        "A firewall decides which connections may pass. An open rule does not start an application for you.",
      ),
      server(),
      n(
        "ui-app",
        "Listening app",
        "Port 443",
        "The destination port must match a program that is actually listening, or a configured forwarding rule.",
      ),
    ],
    edges: [e(0, 1, "connect"), e(1, 2, "allowed"), e(2, 3, "port 443")],
    contrast: {
      label: "Block the connection",
      summary:
        "A running application can still be unreachable when a network rule blocks its port. Check the route, the rule, and the listener separately.",
      focus: [1],
      blocked: [1],
    },
  },
  "server-processes": {
    title: "Files become a running process",
    summary:
      "Copying code onto a server is only part of the job. Something must start it and keep it running.",
    nodes: [
      n(
        "ui-file",
        "Application files",
        "Instructions on disk",
        "Files describe the program. They do not serve requests while sitting on disk.",
      ),
      n(
        "ui-settings",
        "Runtime",
        "Runs the instructions",
        "Some apps need a runtime such as Node.js. The app’s required version must be available.",
      ),
      n(
        "ui-activity",
        "Process",
        "An app in motion",
        "A process is a running instance of a program. It uses CPU and memory and may listen on a network port.",
      ),
      browser(),
    ],
    edges: [e(0, 1, "load"), e(1, 2, "start"), e(3, 2, "request")],
    contrast: {
      label: "Stop the process",
      summary:
        "The files are still on disk, but nobody is answering requests. A service manager can restart a process; it cannot repair a bug in the code.",
      focus: [2],
      blocked: [2],
    },
  },
  "deploy-an-app": {
    title: "From your files to a working service",
    summary:
      "A deployment prepares the environment, starts the release, and checks that people can actually use it.",
    nodes: [
      n(
        "ui-package",
        "Release",
        "Code you intend to run",
        "Choose a known version. Keeping the previous release makes recovery easier.",
      ),
      n(
        "ui-settings",
        "Server setup",
        "Runtime and settings",
        "Install the required runtime and provide configuration. Keep passwords out of source code.",
      ),
      n(
        "ui-activity",
        "Start the app",
        "A running process",
        "Start the program on the intended port. Starting successfully does not prove every feature works.",
      ),
      n(
        "ui-check",
        "Health check",
        "Try a real request",
        "Check the public path and important dependencies. Revert the release if the new version cannot serve users.",
      ),
    ],
    edges: [e(0, 1, "prepare"), e(1, 2, "start"), e(2, 3, "verify")],
    contrast: {
      label: "A release fails its check",
      summary:
        "A failed check means the deployment is not finished. Investigate the evidence and restore a known working version when needed.",
      focus: [3],
      blocked: [2],
    },
  },
  "git-history": {
    title: "A commit is not a deployment",
    summary:
      "Git records changes. Pushing shares them. A separate deployment process puts a release in front of users.",
    nodes: [
      n(
        "ui-file",
        "Working files",
        "Your local edits",
        "Edits live on your computer until you record and share them. Uncommitted changes are not a saved Git snapshot.",
      ),
      n(
        "ui-git",
        "Local commits",
        "Recorded checkpoints",
        "A commit records a snapshot. Branches let changes develop separately; merging combines histories.",
      ),
      n(
        "ui-git",
        "Shared repository",
        "Your team’s copy",
        "Push sends commits to a remote repository. Pull retrieves and integrates changes according to your Git settings.",
      ),
      n(
        "ui-server",
        "Production",
        "The deployed release",
        "Production changes only when a deployment runs. A pushed commit and the live release can be different versions.",
      ),
    ],
    edges: [e(0, 1, "commit"), e(1, 2, "push"), e(2, 3, "deploy")],
    contrast: {
      label: "Keep a change local",
      summary:
        "A local commit gives you a checkpoint. Until you push it, the shared repository does not have it—and production has not changed.",
      focus: [1],
      blocked: [1, 2],
    },
  },
  "build-and-test": {
    title: "Check first. Package second.",
    summary:
      "Tests check chosen behaviors. A build turns source files into a package the server can run.",
    nodes: [
      n(
        "ui-file",
        "Source code",
        "A proposed change",
        "This is the input to the pipeline. Dependencies and their versions are inputs too.",
      ),
      n(
        "ui-check",
        "Tests",
        "Does it behave as expected?",
        "Tests exercise specific examples. Passing them increases confidence but cannot prove an application has no bugs.",
      ),
      n(
        "ui-package",
        "Build artifact",
        "A versioned package",
        "A build produces the files or image that will be deployed. Reuse the verified artifact rather than rebuilding something different.",
      ),
      n(
        "ui-server",
        "Deployment",
        "Run that same artifact",
        "The delivery step installs the verified result. Live checks still matter after deployment.",
      ),
    ],
    edges: [e(0, 1, "check"), e(1, 2, "if passing"), e(2, 3, "release")],
    contrast: {
      label: "Fail a test",
      summary:
        "This pipeline stops before publishing a new artifact. Fix the behavior or the test’s mistaken expectation, then run the checks again.",
      focus: [1],
      blocked: [1],
    },
  },
  "cicd-pipelines": {
    title: "A safe path from change to release",
    summary:
      "Automation repeats the delivery steps in a known order. Each gate decides whether the change can continue.",
    nodes: [
      n(
        "ui-git",
        "Push a change",
        "Shared source history",
        "A repository event can trigger the pipeline. It does not automatically mean the change is live.",
      ),
      n(
        "ui-check",
        "CI checks",
        "Test and build",
        "Continuous integration checks changes together. A failed gate stops this example pipeline.",
      ),
      n(
        "ui-package",
        "Approved artifact",
        "One tested release",
        "Keep the exact tested package. Some delivery pipelines require a person to approve deployment.",
      ),
      n(
        "ui-server",
        "Deploy and check",
        "Watch the real result",
        "Deployment updates the running app. Health checks can trigger recovery to a previous release.",
      ),
    ],
    edges: [e(0, 1, "trigger"), e(1, 2, "checks pass"), e(2, 3, "approval")],
    contrast: {
      label: "Hold at a gate",
      summary:
        "If checks fail or approval is missing, the new artifact does not move forward. The previous live release keeps serving visitors.",
      focus: [1, 2],
      blocked: [2],
    },
  },
  "config-and-environments": {
    title: "Same program. Different settings.",
    summary:
      "Use the same release in testing and production, with the right settings for each environment.",
    layout: "branch",
    nodes: [
      n(
        "ui-package",
        "App image",
        "Reusable release",
        "The image contains the program, not the password or database address for every environment.",
      ),
      n(
        "ui-settings",
        "Configuration",
        "Chosen at startup",
        "Settings tell a running copy which environment and dependencies to use. Some settings require a restart to take effect.",
      ),
      n(
        "ui-data",
        "Test database",
        "Practice data",
        "Staging should use separate test data and suitable credentials.",
      ),
      n(
        "ui-data",
        "Production data",
        "Real users’ notes",
        "Production must use the intended database. A running app pointed at the wrong data is still a broken deployment.",
      ),
    ],
    edges: [e(0, 1, "configure"), e(1, 2, "test copy"), e(1, 3, "live copy")],
    contrast: {
      label: "Inspect the environment",
      summary:
        "Check the database address and credentials without printing secrets. Correct a mismatch and reload or restart the app if it reads settings only at startup.",
      focus: [1, 2, 3],
    },
  },
  "storage-and-backups": {
    title: "Surviving a restart is not a backup",
    summary:
      "Memory, durable storage, and a separate backup protect against different kinds of loss.",
    nodes: [
      n(
        "ui-activity",
        "Memory",
        "Temporary working space",
        "An unsaved note in process memory is lost when that process stops.",
      ),
      n(
        "ui-data",
        "Saved data",
        "Written to disk",
        "A disk or database can outlive the process. Deleting a saved note still removes the current copy.",
      ),
      n(
        "ui-backup",
        "Backup",
        "An earlier separate copy",
        "A usable backup preserves data from an earlier point. Keep it separate enough to survive the failures you plan for.",
      ),
      n(
        "ui-data",
        "Restored data",
        "Recovered from a backup",
        "Restoring proves the backup can be read. Changes after the backup may be missing.",
      ),
    ],
    edges: [e(0, 1, "save"), e(1, 2, "back up"), e(2, 3, "restore")],
    contrast: {
      label: "Restart the app",
      summary:
        "A restart clears working memory but should not erase properly saved disk data. A backup is needed for other failures, such as accidental deletion or disk loss.",
      focus: [0, 1],
    },
  },
  "container-packages": {
    title: "Build once. Run the package.",
    summary:
      "An image packages an app and its user-space dependencies. A container is a running instance of that image.",
    nodes: [
      n(
        "ui-file",
        "Code + recipe",
        "Build instructions",
        "The recipe describes what to put into the image. Avoid including secrets in its layers.",
      ),
      n(
        "ui-package",
        "Container image",
        "The packaged program",
        "An image is a template, not a running process. Compatible hosts can create containers from it.",
      ),
      n(
        "ui-server",
        "Image registry",
        "Stores image versions",
        "Publish an image so another machine can pull it. A registry does not itself run your application.",
      ),
      n(
        "ui-box",
        "Running container",
        "An image brought to life",
        "A container runs through the host runtime and shares the host kernel. It is not a complete virtual machine.",
      ),
    ],
    edges: [e(0, 1, "build"), e(1, 2, "publish"), e(2, 3, "pull + run")],
    contrast: {
      label: "Image versus container",
      summary:
        "Deleting a running container does not delete the image in the registry. Starting a new container from the image does not recover unsaved runtime data.",
      focus: [1, 3],
    },
  },
  "traffic-and-copies": {
    title: "One front door, several workers",
    summary:
      "A traffic router spreads requests across available copies. Each copy still needs a healthy app and working dependencies.",
    layout: "branch",
    nodes: [
      browser(),
      n(
        "ui-network",
        "Traffic router",
        "Chooses a ready copy",
        "A load balancer or proxy distributes requests. It needs useful health information to avoid broken copies.",
      ),
      n(
        "ui-app",
        "App copy A",
        "Ready for requests",
        "A copy handles a share of the work. Capacity depends on what the app and its dependencies can actually do.",
      ),
      n(
        "ui-app",
        "App copy B",
        "Ready for requests",
        "Multiple copies reduce reliance on one process. A shared database can still become a bottleneck.",
      ),
    ],
    edges: [e(0, 1, "request"), e(1, 2, "route"), e(1, 3, "route")],
    contrast: {
      label: "One copy is not ready",
      summary:
        "The router should skip copy B while it cannot serve requests. Copy A takes the remaining traffic, so total capacity is lower.",
      focus: [3],
      blocked: [2],
    },
  },
  "read-the-signals": {
    title: "Turn a symptom into a small investigation",
    summary:
      "Status, logs, and measurements answer different questions. Use them together before changing anything.",
    nodes: [
      n(
        "ui-browser",
        "Symptom",
        "The page will not load",
        "Start with what the user sees. A symptom tells you something is wrong, but does not identify the cause.",
      ),
      n(
        "ui-activity",
        "Status + metrics",
        "What is happening?",
        "Status shows the current condition. Metrics show quantities over time, such as requests or memory use.",
      ),
      n(
        "ui-file",
        "Logs + events",
        "What happened nearby?",
        "Logs describe application actions; system events can explain start or scheduling failures.",
      ),
      n(
        "ui-check",
        "Small fix + check",
        "Test your explanation",
        "Change the suspected cause, repeat the request, and compare the evidence. Random restarts can hide clues.",
      ),
    ],
    edges: [e(0, 1, "observe"), e(1, 2, "investigate"), e(2, 3, "verify")],
    contrast: {
      label: "A green process can still fail",
      summary:
        "A program can be running while its database is unavailable. A process status alone is not the same as a successful user request.",
      focus: [1, 2],
    },
  },
  "why-orchestration": {
    title: "Who keeps checking all these moving parts?",
    summary:
      "Kubernetes coordinates desired workloads. The application, network, and storage still each have their own job.",
    nodes: [
      n(
        "ui-file",
        "Your request",
        "Keep three copies",
        "Describe the workload you want. Kubernetes does not decide your application’s business rules.",
      ),
      n(
        "control-plane",
        "Control plane",
        "Observe and coordinate",
        "Controllers repeatedly compare desired and observed state. The scheduler chooses suitable nodes for new Pods.",
      ),
      n(
        "node",
        "Worker nodes",
        "Run assigned Pods",
        "Node agents and container runtimes run the work. Placement needs enough real CPU and memory.",
      ),
      n(
        "ui-activity",
        "Observed state",
        "How many are ready?",
        "Readiness and status reveal what exists now. Controllers keep checking; recovery is not instantaneous.",
      ),
    ],
    edges: [
      e(0, 1, "declare"),
      e(1, 2, "coordinate"),
      e(2, 3, "report"),
      e(3, 1, "observe"),
    ],
    contrast: {
      label: "What it cannot fix",
      summary:
        "A controller can replace a failed copy, but a bug shared by every copy still needs a code fix. A small app may be simpler on one server.",
      focus: [1, 2],
    },
  },
  "apps-and-servers": {
    title: "Your screen is the start of the journey",
    summary:
      "Little Notes runs across a client and a server. The network carries messages between them.",
    nodes: [
      browser(),
      n(
        "ui-network",
        "Network",
        "Carries messages",
        "Networks connect computers. A working connection does not guarantee that the destination application is healthy.",
      ),
      server(),
      app(),
    ],
    edges: [e(0, 1, "request"), e(1, 2, "deliver"), e(2, 3, "runs")],
    contrast: {
      label: "Disconnect the client",
      summary:
        "The server can keep running while this browser cannot reach it. The request needs both a working route and a responding application.",
      focus: [1],
      blocked: [0],
    },
  },
  containers: {
    title: "An image is a recipe for running copies",
    summary:
      "An image is the packaged template. Containers are the running copies made from it.",
    layout: "branch",
    nodes: [
      n(
        "ui-file",
        "App + dependencies",
        "What the program needs",
        "Include the program and required user-space libraries. Configuration and saved data can stay separate.",
      ),
      n(
        "ui-package",
        "Image",
        "A reusable package",
        "An image provides a repeatable starting point. Architecture and host compatibility still matter.",
      ),
      n(
        "ui-box",
        "Container A",
        "A running copy",
        "This process has its own writable layer. Changes here do not rewrite the original image.",
      ),
      n(
        "ui-box",
        "Container B",
        "Another running copy",
        "Another copy starts from the same image. It does not automatically share copy A’s runtime files.",
      ),
    ],
    edges: [e(0, 1, "build"), e(1, 2, "run"), e(1, 3, "run")],
    contrast: {
      label: "Replace a copy",
      summary:
        "A new container can start from the same image. Data written only into the old container’s writable layer is not a reliable place for saved notes.",
      focus: [2, 3],
    },
  },
  "why-kubernetes": {
    title: "Ask, observe, compare, correct",
    summary:
      "Reconciliation is a repeating check. The goal is to bring the real system closer to what you asked for.",
    layout: "cycle",
    nodes: [
      n(
        "ui-file",
        "Desired: 3",
        "What you asked for",
        "A workload specification states the intended number of copies.",
      ),
      n(
        "control-plane",
        "Controller",
        "Keeps checking",
        "A controller compares the desired state with what it can observe and requests changes.",
      ),
      n(
        "pod",
        "Observed: 2",
        "One copy is missing",
        "The controller sees fewer existing copies than the workload needs. Readiness is a separate condition.",
      ),
      n(
        "pod",
        "Replacement",
        "Try to create a copy",
        "A replacement needs a suitable node, a usable image, and enough resources. It may take time to become ready.",
      ),
    ],
    edges: [
      e(0, 1, "desired"),
      e(2, 1, "observed"),
      e(1, 3, "create"),
      e(3, 2, "check again"),
    ],
    contrast: {
      label: "No room for the replacement",
      summary:
        "The request stays unfulfilled if no node has suitable capacity. Kubernetes can keep trying, but it cannot create physical memory by itself.",
      focus: [3],
      blocked: [2],
    },
  },
  "meet-the-cluster": {
    title: "Coordination above. Work on the nodes.",
    summary:
      "The control plane chooses and maintains workloads. Node agents run the Pods assigned to their computers.",
    layout: "branch",
    nodes: [
      n(
        "ui-file",
        "Workload request",
        "Create a Pod",
        "The API receives your requested object. Being accepted does not mean the Pod is already running.",
      ),
      n(
        "control-plane",
        "Control plane",
        "API, scheduler, controllers",
        "The scheduler selects a suitable node. Controllers maintain state; etcd stores the cluster’s control-plane data.",
      ),
      n(
        "node",
        "Node A",
        "Kubelet + runtime",
        "The kubelet works with the runtime to run assigned containers. The node provides CPU, memory, and networking.",
      ),
      n(
        "node",
        "Node B",
        "Kubelet + runtime",
        "Another node provides more capacity. If none meets the Pod’s requirements, it can stay Pending.",
      ),
    ],
    edges: [e(0, 1, "API"), e(1, 2, "assign"), e(1, 3, "assign")],
    contrast: {
      label: "A Pod must wait",
      summary:
        "If neither node meets the request, the Pod stays Pending. Read its scheduling events to find the missing resource or unmet constraint.",
      focus: [2, 3],
    },
  },
  "first-pod": {
    title: "A Pod groups things that run together",
    summary:
      "A node runs a Pod. Inside the Pod, containers share a network space and can mount the same volume.",
    layout: "branch",
    nodes: [
      n(
        "node",
        "Node",
        "The host computer",
        "The scheduler places the whole Pod on one node; it does not split that Pod’s containers across nodes.",
      ),
      pod(),
      n(
        "ui-box",
        "App container",
        "Inside this Pod",
        "Most simple Pods have one app container. Containers in this Pod can reach each other through localhost.",
      ),
      n(
        "vol",
        "Shared volume",
        "Mounted when configured",
        "Containers can share a volume if their volume mounts point to the same Pod volume. They do not automatically share all files.",
      ),
    ],
    edges: [e(0, 1, "hosts"), e(1, 2, "contains"), e(1, 3, "defines")],
    contrast: {
      label: "Delete a standalone Pod",
      summary:
        "A standalone Pod has no Deployment maintaining it. Deleting it does not automatically create a replacement Pod.",
      focus: [1],
      blocked: [0],
    },
  },
  "keep-it-running": {
    title: "A Deployment keeps the requested copies",
    summary:
      "A Deployment manages Pods through ReplicaSets. Here, that middle controller is omitted so you can focus on the goal.",
    layout: "branch",
    nodes: [
      n(
        "ui-file",
        "Desired replicas",
        "Keep two copies",
        "The replica count is a target, not a guarantee that every copy is ready at this moment.",
      ),
      deployment(),
      pod("Pod A", "One app copy"),
      pod("Pod B", "Another app copy"),
    ],
    edges: [e(0, 1, "specify"), e(1, 2, "maintains"), e(1, 3, "maintains")],
    contrast: {
      label: "One Pod disappears",
      summary:
        "The workload controller requests a replacement for the missing Pod. The replacement has a new identity and must become ready before serving normal traffic.",
      focus: [3],
      blocked: [2],
    },
  },
  "find-the-app": {
    title: "Labels connect a stable name to changing Pods",
    summary:
      "The Service chooses matching Pods. Readiness decides which matching endpoints normally receive traffic.",
    layout: "branch",
    nodes: [
      browser(),
      service(),
      pod("Pod A", "app=little-notes"),
      pod("Pod B", "app=little-notes"),
    ],
    edges: [e(0, 1, "request"), e(1, 2, "matches"), e(1, 3, "matches")],
    contrast: {
      label: "The selector no longer matches",
      summary:
        "Healthy Pods are not enough. A Service with the wrong selector has no matching app endpoints, so this request cannot reach either copy.",
      focus: [1],
      blocked: [1, 2],
    },
  },
  "settings-and-storage": {
    title: "Three things the image should not own",
    summary:
      "Settings, credentials, and saved data have different purposes and lifetimes.",
    layout: "branch",
    nodes: [
      n(
        "cm",
        "ConfigMap",
        "Ordinary settings",
        "Store configuration such as a greeting or feature setting. Do not use a ConfigMap for passwords.",
      ),
      pod(),
      n(
        "secret",
        "Secret",
        "Sensitive values",
        "A Secret supplies credentials. Base64 encoding alone is not encryption; protect access and storage appropriately.",
      ),
      volume(),
    ],
    edges: [e(0, 1, "settings"), e(2, 1, "credentials"), e(1, 3, "mount")],
    contrast: {
      label: "Replace the Pod",
      summary:
        "The new Pod can read the same configuration and mount the same persistent storage. Environment variables are read when a container starts; they do not update an already running process automatically.",
      focus: [1, 3],
    },
  },
  "safe-updates": {
    title: "Let the new copy prove it is ready",
    summary:
      "A rolling update introduces new Pods while controlling how much old capacity can disappear.",
    nodes: [
      pod("Old version", "Still serving visitors"),
      pod("New version", "Starting up"),
      n(
        "ui-check",
        "Readiness check",
        "Can it handle requests?",
        "Readiness controls normal Service endpoint eligibility. It is different from liveness, which can trigger a container restart.",
      ),
      service(),
    ],
    edges: [e(1, 2, "check"), e(2, 3, "ready"), e(0, 3, "old capacity")],
    contrast: {
      label: "New version is not ready",
      summary:
        "The new copy should not receive normal Service traffic yet. Keeping old capacity depends on the rollout settings and enough available resources.",
      focus: [1, 2],
      blocked: [1],
    },
  },
  "bring-it-together": {
    title: "Two paths: managing Pods and reaching them",
    summary:
      "The Deployment maintains the copies. The Service routes requests to ready, matching Pods.",
    layout: "branch",
    nodes: [
      deployment(),
      service(),
      pod("Pod A", "Ready and matching"),
      pod("Pod B", "Ready and matching"),
    ],
    edges: [
      e(0, 2, "maintains"),
      e(1, 2, "routes"),
      e(1, 3, "routes"),
      e(0, 3, "maintains"),
    ],
    contrast: {
      label: "Lose one copy",
      summary:
        "The Service skips an unavailable endpoint while the Deployment works toward a replacement. These are two different responsibilities cooperating.",
      focus: [3],
      blocked: [2],
    },
  },
  "namespaces-and-labels": {
    title: "Names tell you where. Labels help you select.",
    summary:
      "Namespaces scope many object names. Labels are key-value tags used to organize and select objects.",
    layout: "branch",
    nodes: [
      n(
        "ns",
        "Namespace: test",
        "A scope for names",
        "A namespace separates namespaced objects. It is not, by itself, a network firewall.",
      ),
      n(
        "svc",
        "Service: notes",
        "Select app=notes",
        "An ordinary Service selector matches Pods in the same namespace, using the requested labels.",
      ),
      pod("test / notes", "app=notes"),
      pod("production / notes", "app=notes"),
    ],
    edges: [e(0, 1, "contains"), e(1, 2, "same scope")],
    contrast: {
      label: "Same label, another namespace",
      summary:
        "The production Pod has the same label, but this test Service does not select it across the namespace boundary. Network isolation requires additional policy.",
      focus: [3],
    },
  },
  "resource-budgets": {
    title: "Placement and runtime use different rules",
    summary:
      "A request helps the scheduler choose a node. A limit bounds what a container can use while running.",
    nodes: [
      n(
        "ui-file",
        "Resource request",
        "Example: 128 MiB",
        "The scheduler accounts for requested memory when placing Pods. A request is not the same as current measured use.",
      ),
      n(
        "node",
        "Node capacity",
        "Can it fit?",
        "Placement considers allocatable capacity and other workload requests. If no node fits, the Pod can remain Pending.",
      ),
      pod("Running Pod", "Uses CPU and memory"),
      n(
        "ui-gauge",
        "Resource limit",
        "Example: 256 MiB",
        "Exceeding a memory limit can lead to termination. CPU limits can throttle work; they do not behave like memory limits.",
      ),
    ],
    edges: [e(0, 1, "placement"), e(1, 2, "schedule"), e(3, 2, "bounds use")],
    contrast: {
      label: "Too large to place",
      summary:
        "A Pod whose request cannot fit stays Pending. Lowering a request only helps if it honestly reflects the workload’s needs, or the cluster needs more capacity.",
      focus: [0, 1],
      blocked: [1],
    },
  },
  "jobs-that-finish": {
    title: "Some work has a finish line",
    summary:
      "A CronJob schedules Jobs. A Job runs Pods to complete a task. Saved output needs its own storage plan.",
    nodes: [
      n(
        "cronjob",
        "CronJob",
        "When to start",
        "A CronJob creates Jobs on a schedule. It is not the process that performs the work.",
      ),
      n(
        "job",
        "Job",
        "Track completion",
        "A Job tracks successful task completion and can retry failures according to its settings.",
      ),
      pod("Task Pod", "Write the daily report"),
      volume(),
    ],
    edges: [e(0, 1, "schedule"), e(1, 2, "run"), e(2, 3, "save output")],
    contrast: {
      label: "Complete is not backed up",
      summary:
        "A successful exit only says the task finished. Output stored in a temporary Pod volume can disappear when that Pod is deleted.",
      focus: [2, 3],
    },
  },
  "observe-and-debug": {
    title: "Follow the evidence to a fix",
    summary:
      "Move from what is visible to the smallest explanation you can test.",
    nodes: [
      n(
        "pod",
        "Pod status",
        "Pending? Ready? Restarting?",
        "A phase or condition narrows the problem. Running alone does not prove that the application can serve requests.",
      ),
      n(
        "ui-file",
        "Events + logs",
        "Why did it happen?",
        "Events can explain scheduling or image failures. Logs can explain the application’s own errors.",
      ),
      n(
        "ui-settings",
        "Focused change",
        "Fix one suspected cause",
        "Change the configuration or code that the evidence points to. Avoid destroying useful evidence with random changes.",
      ),
      n(
        "ui-check",
        "Real request",
        "Did the user’s path recover?",
        "Repeat the failing behavior. A valid-looking manifest is weaker evidence than a working application path.",
      ),
    ],
    edges: [e(0, 1, "inspect"), e(1, 2, "explain"), e(2, 3, "verify")],
    contrast: {
      label: "Still failing after a restart",
      summary:
        "A restart does not correct a wrong port, missing key, or broken image name. Return to the evidence and revise the explanation.",
      focus: [1, 2],
    },
  },
  "lost-in-routing": {
    title: "Trace the missing connection",
    summary:
      "The client reaches a Service, but the Service needs a matching selector and usable endpoints to reach the app.",
    layout: "branch",
    nodes: [
      n(
        "pod",
        "Probe client",
        "Tests HTTP",
        "The lab client sends a real request to the notes Service.",
      ),
      service(),
      pod("notes Pod A", "app=little-notes"),
      pod("notes Pod B", "app=little-notes"),
    ],
    edges: [e(0, 1, "HTTP"), e(1, 2, "selector"), e(1, 3, "selector")],
    contrast: {
      label: "Broken starting state",
      summary:
        "The Service selector still names the old app label. The Pods can be healthy while the Service has no matching endpoints. Inspect the labels and selector before changing them.",
      focus: [1],
      blocked: [1, 2],
    },
  },
  "running-not-ready": {
    title: "A running process is only one piece",
    summary:
      "Probes ask specific questions of the container. Their paths and ports must match what the app actually serves.",
    layout: "branch",
    nodes: [
      n(
        "node",
        "Kubelet",
        "Performs probes",
        "The node agent runs the configured probes. Liveness failures can restart a container; readiness failures remove normal Service eligibility.",
      ),
      pod("Web Pod", "nginx listens on 80"),
      n(
        "ui-check",
        "Readiness",
        "Can it serve traffic?",
        "A readiness check must succeed before this Pod receives normal Service traffic.",
      ),
      n(
        "ui-activity",
        "Liveness",
        "Should it be restarted?",
        "A misconfigured liveness check can restart a perfectly usable application. Fix the probe rather than deleting its purpose.",
      ),
    ],
    edges: [e(0, 1, "checks"), e(1, 2, "ready?"), e(1, 3, "alive?")],
    contrast: {
      label: "Broken starting state",
      summary:
        "The probes point to the wrong path or port. Compare the configured checks with the app’s real HTTP response; do not confuse Running with Ready.",
      focus: [2, 3],
      blocked: [1, 2],
    },
  },
  "configuration-drift": {
    title: "Names and keys must line up",
    summary:
      "The Pod template references configuration objects and keys. A new container reads those values at startup.",
    layout: "branch",
    nodes: [
      n(
        "cm",
        "ConfigMap",
        "Greeting setting",
        "The expected object and key must exist in the workload’s namespace.",
      ),
      pod("New container", "Reads environment at start"),
      n(
        "secret",
        "Secret",
        "Practice credential",
        "A Secret reference must name an existing object and key. Do not print actual credentials while debugging.",
      ),
      n(
        "ui-check",
        "Ready app",
        "Expected settings loaded",
        "Verify both readiness and the requested behavior after the replacement container starts.",
      ),
    ],
    edges: [
      e(0, 1, "key reference"),
      e(2, 1, "key reference"),
      e(1, 3, "start + check"),
    ],
    contrast: {
      label: "Broken starting state",
      summary:
        "A missing or mismatched reference prevents the workload from reading what it needs. Changing a ConfigMap does not rewrite environment variables inside an already running process.",
      focus: [0, 2],
      blocked: [0, 1],
    },
  },
  "release-rescue": {
    title: "A rollout needs both a valid image and capacity",
    summary:
      "The Deployment replaces the old version gradually. Availability settings control how many copies may be added or lost.",
    nodes: [
      deployment(),
      pod("Old replicas", "Keep healthy capacity"),
      n(
        "ui-package",
        "New image",
        "Must exist and be usable",
        "This isolated lab uses preloaded images. An unavailable tag cannot produce a ready application.",
      ),
      pod("New replicas", "Become ready before cutover"),
    ],
    edges: [e(0, 1, "retain"), e(0, 2, "new version"), e(2, 3, "start")],
    contrast: {
      label: "Broken starting state",
      summary:
        "The image tag is unavailable and the strategy permits all copies to be unavailable. Restore a valid image and preserve healthy capacity while replacements start.",
      focus: [2],
      blocked: [2],
    },
  },
  "handoff-between-containers": {
    title: "One Pod, a file passed between two containers",
    summary:
      "The init container finishes its preparation before the app container starts. Both must mount the same volume.",
    nodes: [
      n(
        "ui-box",
        "Init container",
        "Writes /work/index.html",
        "The prepare container generates the welcome page, then exits successfully before the web container starts.",
      ),
      n(
        "vol",
        "Shared emptyDir",
        "One shared Pod volume",
        "Both paths must map to this same volume. It outlives a container restart but is removed with the Pod.",
      ),
      n(
        "ui-box",
        "Web container",
        "Reads its web root",
        "nginx serves files from /usr/share/nginx/html, where the same shared volume must be mounted.",
      ),
      service(),
    ],
    edges: [e(0, 1, "write"), e(1, 2, "read"), e(3, 2, "HTTP")],
    contrast: {
      label: "Broken starting state",
      summary:
        "The init container writes somewhere the app does not share. A file in one container’s private writable layer does not appear in the other container.",
      focus: [0, 1],
      blocked: [0],
    },
  },
  "report-that-disappeared": {
    title: "The writer and reader need the same storage",
    summary:
      "A Job can finish successfully even when its output is saved in the wrong place.",
    nodes: [
      n(
        "job",
        "Daily report Job",
        "Creates the task Pod",
        "The Job’s Pod template is immutable. Recreate this Job when changing its volume wiring.",
      ),
      pod("Report writer", "Writes /data/report.txt"),
      volume(),
      pod("Report reader", "Reads the same file"),
    ],
    edges: [e(0, 1, "run"), e(1, 2, "write"), e(2, 3, "read")],
    contrast: {
      label: "Broken starting state",
      summary:
        "The writer uses temporary storage instead of the reports claim. The reader cannot find the report on its own mounted volume, even if the Job says Complete.",
      focus: [1],
      blocked: [1],
    },
  },
  "least-privilege": {
    title: "Several small boundaries protect one workload",
    summary:
      "Identity, privilege controls, API credentials, and resource budgets each restrict something different.",
    layout: "branch",
    nodes: [
      n(
        "ui-shield",
        "Non-root identity",
        "UID 1000",
        "runAsNonRoot and a suitable runAsUser define the intended identity. Verify the real running process too.",
      ),
      pod("Worker", "Processes local files"),
      n(
        "ui-lock",
        "Fewer privileges",
        "No escalation; drop ALL",
        "Prevent privilege escalation and drop unnecessary Linux capabilities. Non-root alone does not apply all of these controls.",
      ),
      n(
        "ui-gauge",
        "Bounded access",
        "No token + resource limits",
        "Disable the automatic service-account token when unnecessary. Set meaningful CPU and memory requests and limits.",
      ),
    ],
    edges: [e(0, 1, "identity"), e(2, 1, "restrict"), e(3, 1, "bound")],
    contrast: {
      label: "Check all the boundaries",
      summary:
        "A running worker is not enough to pass. Verify the process identity, capability and token settings, and positive resource budgets together.",
      focus: [0, 2, 3],
    },
  },
  "open-the-right-door": {
    title: "Routing and permission are separate checks",
    summary:
      "Ingress supplies an HTTP route. NetworkPolicy controls which connections can reach the selected destination Pods.",
    nodes: [
      n(
        "ing",
        "Ingress rule",
        "notes.quest.test",
        "This rule tells the installed Ingress controller to route the host name to the notes Service. Traffic originates from the controller, which also needs policy permission.",
      ),
      service(),
      n(
        "netpol",
        "NetworkPolicy",
        "Allows chosen sources",
        "The policy is enforced by the network implementation on traffic to the selected Pods. This is a rule boundary, not an extra proxy hop.",
      ),
      pod("Notes Pods", "Receive allowed traffic"),
    ],
    edges: [e(0, 1, "host route"), e(1, 3, "endpoints"), e(2, 3, "enforces")],
    contrast: {
      label: "Broken starting state",
      summary:
        "The destination policy allows nobody, and the Ingress points at the wrong backend. Permit the intended frontend and controller traffic while proving the unrelated caller remains blocked.",
      focus: [0, 2],
      blocked: [0, 1],
    },
  },
  "path-foundations": {
    title: "The world underneath Kubernetes",
    summary:
      "Start with a request, meet the server that handles it, then learn how changes safely reach that server.",
    nodes: [
      browser(),
      n(
        "ui-network",
        "Web + networks",
        "HTTP, DNS, ports",
        "Learn how a name becomes a connection, how messages travel, and why a working network is not the same as a healthy app.",
      ),
      n(
        "ui-server",
        "Apps + data",
        "Processes, settings, storage",
        "Learn what a running app needs, where notes are saved, and what survives a restart.",
      ),
      n(
        "ui-pipeline",
        "Software delivery",
        "Git, tests, CI/CD",
        "Learn how people record, check, package, and deploy changes. These are the building blocks Kubernetes helps operate.",
      ),
    ],
    edges: [e(0, 1, "asks"), e(1, 2, "reaches"), e(3, 2, "updates")],
  },
  "path-basics": {
    title: "Four pieces you will learn to connect",
    summary:
      "Kubernetes gives your app a place to run, a way to maintain copies, and a stable way to reach them.",
    nodes: [
      n(
        "ui-package",
        "Container image",
        "Package the application",
        "First understand what is in the app’s image and what belongs in external configuration or storage.",
      ),
      pod(),
      deployment(),
      service(),
    ],
    edges: [e(0, 1, "run inside"), e(2, 1, "maintains"), e(3, 1, "routes")],
  },
  "path-ckad": {
    title: "Practice the whole incident, not just the command",
    summary:
      "Each mission starts with a broken system and ends with evidence that the intended behavior works.",
    nodes: [
      n(
        "ui-activity",
        "Observe",
        "Read the incident",
        "Inspect real objects and behavior. Public visitors can explore the diagrams and recorded walkthroughs.",
      ),
      n(
        "ui-file",
        "Explain",
        "Form a hypothesis",
        "Connect the symptom with a likely cause. Guided mode offers progressive hints.",
      ),
      n(
        "ui-settings",
        "Repair",
        "Make a focused change",
        "Use the owner-only terminal or YAML editor in a disposable real Kubernetes lab.",
      ),
      n(
        "ui-check",
        "Verify",
        "Configuration + behavior",
        "Authored validators check actual cluster state and behavior. The AI coach does not assign grades.",
      ),
    ],
    edges: [e(0, 1, "evidence"), e(1, 2, "hypothesis"), e(2, 3, "proof")],
  },
  "site-journey": {
    title: "From your first request to a real cluster",
    summary:
      "Follow the same Little Notes app as your understanding grows. Enter at the point that feels useful to you.",
    nodes: [
      n(
        "ui-browser",
        "Understand the web",
        "Before Kubernetes",
        "Start with a browser, a server, and a request. Then explore Git, deployment, networking, and data.",
      ),
      n(
        "ui-package",
        "Package the app",
        "Images and settings",
        "Separate a reusable application image from the settings and data it uses at runtime.",
      ),
      n(
        "kubernetes",
        "Coordinate copies",
        "Kubernetes Basics",
        "Learn how Pods, Deployments, Services, and storage work together through browser exercises.",
      ),
      n(
        "ui-terminal",
        "Solve an incident",
        "CKAD Practice",
        "Inspect a real failure, explain it, repair it, and prove the result. Live labs require owner authorization.",
      ),
    ],
    edges: [e(0, 1, "prepare"), e(1, 2, "orchestrate"), e(2, 3, "practice")],
  },
  "site-access": {
    title: "Learn openly. Practice privately.",
    summary:
      "Beginner lessons and recordings are public. Real lab actions require the authorized owner account.",
    nodes: [
      n(
        "ui-book",
        "Public learning",
        "No account needed",
        "Read lessons, explore diagrams, run browser simulations, and watch captioned recordings.",
      ),
      n(
        "ui-lock",
        "Google sign-in",
        "Verified identity",
        "The backend verifies the signed-in account against the configured owner. A visible page or button does not grant access.",
      ),
      n(
        "ui-shield",
        "Server authorization",
        "Checked on each private request",
        "The backend protects live sessions, terminal connections, grading, private progress, and the local coach.",
      ),
      n(
        "kubernetes",
        "Disposable lab",
        "One private session",
        "A real Kubernetes VM provides the practice environment. Reset discards lab changes; idle sessions expire.",
      ),
    ],
    edges: [e(1, 2, "verify"), e(2, 3, "authorize")],
  },
  "site-hosting": {
    title: "How KubeQuest reaches your browser",
    summary:
      "The public portal runs on the home server. The private lab stays in a separate disposable virtual machine.",
    nodes: [
      browser(),
      n(
        "ui-network",
        "Cloudflare Tunnel",
        "Public HTTPS entry",
        "The existing tunnel connects the public hostname to the portal on the home server.",
      ),
      n(
        "ui-server",
        "KubeQuest server",
        "Pages, API, progress",
        "The backend serves learning content and protects private APIs. SQLite stores private progress; the local model only offers guidance.",
      ),
      n(
        "kubernetes",
        "Lab VM",
        "Isolated Kubernetes",
        "Authorized backend operations manage one disposable K3s VM. Cluster credentials remain on the backend.",
      ),
    ],
    edges: [e(0, 1, "HTTPS"), e(1, 2, "tunnel"), e(2, 3, "private API")],
  },
  "site-privacy": {
    title: "Different data has different homes",
    summary:
      "Anonymous lesson progress stays on this device. Authorized practice records stay on the server.",
    layout: "branch",
    nodes: [
      browser(),
      n(
        "ui-data",
        "Browser storage",
        "Anonymous completion",
        "Completing a beginner lesson saves its ID in local storage. Clearing that storage removes local progress.",
      ),
      n(
        "ui-lock",
        "Private progress",
        "Owner-only server records",
        "After authorization, the backend can save lesson completion and real mission attempts in SQLite.",
      ),
      n(
        "ui-activity",
        "Local coach",
        "Temporary question context",
        "The local model receives bounded context. The app does not persist tutor conversations or terminal transcripts.",
      ),
    ],
    edges: [
      e(0, 1, "save locally"),
      e(0, 2, "signed in"),
      e(0, 3, "signed in"),
    ],
  },
};
