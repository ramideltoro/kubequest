import type { Lesson } from "./lessons";
const webDocs =
  "https://developer.mozilla.org/en-US/docs/Learn_web_development";
export const foundations: Lesson[] = [
  {
    id: "what-is-an-app",
    title: "What is an application?",
    subtitle: "A useful job, split into smaller parts.",
    icon: "ui-app",
    activity: "parts",
    minutes: 5,
    problem:
      "You want a place to save your ideas. Little Notes has a page, a Save button, and a list of notes. Which part does each job?",
    learn: [
      "Recognize the visible page, the behind-the-scenes logic, and saved data.",
      "Explain why one application can need several programs.",
    ],
    paragraphs: [
      "Software is a set of instructions that a computer follows. An application is software that helps someone do a job: write a note, book a ticket, or send a message. Code is the text developers write to describe those instructions.",
      "The frontend is the part you see and use. In Little Notes, it is the page in your browser. The backend is the part that handles requests behind the scenes. It decides whether a note can be saved. A database keeps information so it can be found again.",
      "These are jobs, not necessarily three separate computers. A small app can put its backend and database on one machine. A larger app can split them across many machines. A static page may have no application backend at all.",
      "We will follow Little Notes throughout this path. You do not need to write its code. First, learn what each part needs to work. Later, Kubernetes will help run some of those parts.",
    ],
    try: "Choose a job, then choose the part that does it. Match all three jobs and inspect the request path.",
    why: "The page shows things, the backend makes decisions, and the database keeps the notes.",
    analogy:
      "Think of a restaurant: a menu, a kitchen, and a record of orders. Real software can combine or split these jobs; there is no rule that each needs a separate computer.",
    terms: [
      ["Code", "Instructions written for a computer."],
      ["Frontend", "The part a person sees and interacts with."],
      ["Backend", "Software that handles work behind the scenes."],
      ["Database", "Software for storing and finding organized information."],
    ],
    code: "Browser page → application backend → database\n          ← response containing the saved note ←",
    question:
      "Which part should decide whether a visitor is allowed to read a private note?",
    answers: [
      "Only the color of the button.",
      "The backend must check permission before returning the note.",
      "The network cable.",
    ],
    correct: 1,
    explanation:
      "Hiding a button is not access control. The backend must check permission even if someone sends a request without using the page.",
    docs: webDocs,
  },
  {
    id: "request-and-response",
    title: "Follow a request",
    subtitle: "A browser asks. A server answers.",
    icon: "ui-browser",
    activity: "request",
    minutes: 6,
    problem:
      "You tap Save. Your friend thinks the note jumps straight into a database. Let’s slow down the journey.",
    learn: [
      "Follow a request and its response.",
      "Tell an unreachable server from an application error.",
    ],
    paragraphs: [
      "A client is a program asking for a service. Your browser is one kind of client. A server is a program that receives requests, or the computer running that program. The same computer can be a client for one task and a server for another.",
      "A request is a message asking for something. Little Notes sends the note to its backend. The backend checks the request, asks the database to save the note, and sends a response. The browser then updates what you see.",
      "Requests travel through network connections. Each step takes time. A response may say that the request worked or explain an error. If no response arrives, the client eventually stops waiting; that is a timeout.",
      "The browser does not prove a note was saved just by drawing it on screen. The backend should confirm success. If a response is lost after saving, retrying blindly can create duplicates unless the application handles repeated requests safely.",
    ],
    try: "Step through the request. Stop the application and try again. Restart it, then break the database to see a different failure.",
    why: "A reachable computer, a running app, and working dependencies are separate parts of a successful request.",
    analogy:
      "Sending an order and receiving a receipt is similar. But a missing receipt does not prove the order was never processed.",
    terms: [
      ["Client", "A program that asks another program for something."],
      ["Response", "The answer to a request."],
      ["Timeout", "Stopping the wait after a time limit."],
    ],
    code: "Request: please save this note\nBackend: validate → save → reply\nResponse: saved, note number 42",
    question:
      "The browser did not receive a reply. What can you safely conclude?",
    answers: [
      "The note definitely was not saved.",
      "The whole internet is broken.",
      "The outcome is uncertain; inspect what happened before retrying.",
    ],
    correct: 2,
    explanation:
      "The request may have failed before reaching the app, or its response may have been lost after the work finished.",
    docs: webDocs,
  },
  {
    id: "http-and-https",
    title: "Speak HTTP",
    subtitle: "Give web messages a method, an address, and a result.",
    icon: "ui-network",
    activity: "http",
    minutes: 7,
    problem:
      "Little Notes must distinguish “show my notes” from “save a new note.” Both are requests, but they ask for different work.",
    learn: [
      "Read a simple HTTP request and response status.",
      "Understand what HTTPS protects and what it cannot guarantee.",
    ],
    paragraphs: [
      "HTTP is a shared set of rules for web requests and responses. A method describes the kind of action: GET asks to read something; POST often submits something new. The path identifies the resource, such as /notes. An API is an agreed way for programs to talk; an HTTP API uses these web messages.",
      "A response has a status code. In our example, 200 means the read succeeded, 201 means a note was created, 404 means the path was not found, and 503 means the service cannot handle the request now. The exact behavior belongs to the application.",
      "Headers carry extra information, such as the kind of content. A body carries content such as a note or a web page. An empty page and a failed request are not the same thing; inspecting the status helps explain what happened.",
      "HTTPS uses TLS to protect messages in transit and check the server’s identity through certificates. It does not prove the website is honest or that every user has permission. Signing in and checking access are separate jobs. Never put real passwords into a learning exercise.",
    ],
    try: "Send GET and POST requests to /notes. Try a missing path and an unavailable app. Switch to HTTPS and inspect what changes.",
    why: "Methods describe intent; status codes describe a result. HTTPS protects the connection, while the app still has to check access.",
    analogy:
      "HTTP resembles a standard form everyone agrees to read. HTTPS adds protection during delivery, but cannot make the recipient trustworthy.",
    terms: [
      ["HTTP", "Rules for web requests and responses."],
      ["API", "An agreed interface that lets programs talk."],
      ["TLS", "Technology that protects a network connection."],
      ["Status code", "A short numeric description of a response result."],
    ],
    code: 'GET /notes HTTP/1.1\n\nHTTP/1.1 200 OK\nContent-Type: application/json\n\n["Remember the milk"]',
    question: "Does HTTPS mean every visitor is allowed to read every note?",
    answers: [
      "No. The application still needs to check identity and permission.",
      "Yes, encryption grants access.",
      "Only if the response is 200.",
    ],
    correct: 0,
    explanation:
      "Transport protection and access control solve different problems. A secure connection can still carry a request that must be rejected.",
    docs: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview",
  },
  {
    id: "dns-and-addresses",
    title: "Find a server by name",
    subtitle: "Turn a readable name into a network address.",
    icon: "ui-network",
    activity: "dns",
    minutes: 6,
    problem:
      "Your browser knows notes.example.test. The network needs an address. How does it connect those two things?",
    learn: [
      "Tell a name from an IP address.",
      "Explain why changing DNS does not start an application.",
    ],
    paragraphs: [
      "An IP address identifies a network destination. A domain name is a readable name, such as notes.example.test. DNS is the system that helps clients look up addresses for names. The example name here is for practice, not a real service.",
      "The browser usually asks a resolver to look up the name. A resolver is a program that finds DNS answers. Answers can be kept for a while in a cache, so a changed record may not be visible to every client immediately.",
      "The internet is a network of networks. Routers move packets—small pieces of data—toward their destination. Having the correct address is only one step. A route, a permitted connection, and a listening application must also exist.",
      "Private addresses are used inside private networks. They are not automatically reachable from the public internet. A proxy, address translation, or other deliberately configured entry point may connect visitors to an internal app. Kubernetes also needs networking and name lookup.",
    ],
    try: "Look up the name with the wrong address, then correct it. Follow the route again and see where the request stops.",
    why: "DNS helps find an address. It does not install, start, or repair the application at that address.",
    analogy:
      "DNS is like looking up a building’s address. A correct address does not tell you whether the shop is open.",
    terms: [
      ["IP address", "An address used to send data across a network."],
      ["DNS", "A system for looking up information about names."],
      ["Packet", "A small piece of data sent over a network."],
      ["Cache", "A saved answer reused for a while."],
    ],
    code: "notes.example.test → DNS lookup → 192.0.2.10\n192.0.2.10 is a documentation-only example address.",
    question:
      "You correct a DNS record. What else must be true for the app to respond?",
    answers: [
      "Nothing else; DNS runs the app.",
      "The destination must be reachable and the application must be running.",
      "The name must contain the word server.",
    ],
    correct: 1,
    explanation:
      "Name lookup is one link in the chain. The network, listening port, and application still need to work.",
    docs: "https://www.cloudflare.com/learning/dns/what-is-dns/",
  },
  {
    id: "network-ports",
    title: "Choose the right door",
    subtitle: "Ports, listeners, and firewalls.",
    icon: "ui-network",
    activity: "ports",
    minutes: 7,
    problem:
      "You found the right computer, but Little Notes is listening on port 8080 and your request goes to port 3000.",
    learn: [
      "Explain why an address also needs a port.",
      "Distinguish a firewall rule from a listening application.",
    ],
    paragraphs: [
      "A computer can run many programs. A port is a number used to direct network traffic to a service. A program listens on a port when it is ready to accept connections there. Knowing the computer’s address is not enough if you choose the wrong port.",
      "A protocol defines how the programs communicate. HTTP often uses port 80, and HTTPS often uses 443. Apps can use other ports, such as 8080. A proxy can accept a public request on 443 and forward it to an internal app on 8080.",
      "A firewall allows or blocks traffic using rules. Opening a port in a firewall does not start an app. Starting an app does not automatically open a firewall. Both must match the connection you want to allow.",
      "localhost means the current machine or network environment. It is useful for services that should only accept local connections. In a container system, localhost may refer to the container’s shared network environment, not your laptop. Kubernetes Services later connect a stable port to the app’s actual port.",
    ],
    try: "Try the wrong port. Fix it, then block the firewall. Restore only the rule this example needs and send another request.",
    why: "Traffic needs an allowed path to the port where the intended application is listening.",
    analogy:
      "An IP address is a building; a port is a numbered door. The analogy is limited: ports are software numbers, not physical entrances.",
    terms: [
      ["Port", "A number used to identify a network service."],
      ["Listener", "A program accepting connections at an address and port."],
      ["Firewall", "Rules that allow or block network traffic."],
      ["Proxy", "A program that forwards requests to another service."],
    ],
    code: "Browser → HTTPS :443 → proxy → Little Notes :8080\nOpening :3000 does not move an app listening on :8080.",
    question:
      "The firewall allows port 8080, but no program listens there. What happens?",
    answers: [
      "The firewall starts the application.",
      "The request becomes a database query.",
      "There is still no application ready to answer on that port.",
    ],
    correct: 2,
    explanation:
      "Permission to connect and a running listener are separate requirements.",
    docs: webDocs,
  },
  {
    id: "server-processes",
    title: "What runs on a server?",
    subtitle: "Files become useful when a process runs them.",
    icon: "ui-server",
    activity: "process",
    minutes: 6,
    problem:
      "You copied Little Notes onto a server. Visitors still cannot reach it. Copying files was only the beginning.",
    learn: [
      "Distinguish files, processes, CPU, and memory.",
      "Understand the operating system and a safe service account.",
    ],
    paragraphs: [
      "An operating system manages the computer’s files, programs, memory, and devices. Linux is common on servers. A file containing application code sits on storage. A process is a running program using CPU time and memory.",
      "CPU time is the work the processor can do. Memory is the working space a running program uses. Storage keeps files when the process stops. Turning an app off releases its working memory; it does not normally delete every file on the computer.",
      "A runtime is supporting software that can run an application, such as Node.js for many JavaScript apps. The app also needs permission to read its files. A dedicated account with only the access it needs is safer than running everything as the system administrator.",
      "A service manager can start an app when a server boots and restart it after a failure. You can inspect logs to learn why it stopped. Restarting may help a temporary problem, but repeated restarts do not fix missing files, wrong settings, or faulty code.",
    ],
    try: "Inspect the server. Start the process with a missing runtime, install the runtime in the simulation, then start and stop the app.",
    why: "Files are the ingredients. A compatible runtime, permissions, and a running process make them serve visitors.",
    analogy:
      "A recipe on a shelf is not a meal being cooked. In a computer, the process does the work while files remain on storage.",
    terms: [
      ["Process", "A running program."],
      ["CPU", "The part of a computer that carries out instructions."],
      ["Memory", "Working space used by running programs."],
      [
        "Operating system",
        "Software that manages the computer’s basic resources.",
      ],
    ],
    code: "# Optional Linux examples, not needed for this lesson\nps            # show processes\npwd           # show the current folder\nls            # list files",
    question:
      "You copy the app’s files onto a server. Is it serving requests now?",
    answers: [
      "Only if a suitable process has been started with the things it needs.",
      "Yes, a folder is always a running service.",
      "Only after renaming the folder Kubernetes.",
    ],
    correct: 0,
    explanation:
      "Deployment includes making the application run. Files alone do not listen for requests.",
    docs: "https://training.linuxfoundation.org/training/introduction-to-linux/",
  },
  {
    id: "deploy-an-app",
    title: "Make your first deployment",
    subtitle: "Move a known version to a place where it can run.",
    icon: "ui-server",
    activity: "deploy",
    minutes: 7,
    problem:
      "Little Notes works on your laptop. Now a friend needs to use it while your laptop is closed.",
    learn: [
      "Describe deployment as more than uploading files.",
      "Check an app after starting it and restore a working version.",
    ],
    paragraphs: [
      "Deploying means making a version of an application available in an environment where it should run. An environment is a place with its own machines, settings, and data. A server in a data center is still a computer; cloud hosting means someone else operates the underlying infrastructure.",
      "A simple deployment copies a known release, provides its runtime and settings, starts the process, and checks it. You also arrange networking and a way to restart after a reboot. Managed hosting can do many of these jobs for you.",
      "An artifact is the packaged output you intend to deploy. Using the same tested artifact avoids accidentally rebuilding something different for production. Record which version is running so you can connect a problem to a specific change.",
      "A rollback puts a previous application version back into service. It does not automatically undo data changes. If a release changes how the database is organized, you need a plan that keeps old and new code compatible. Start small: one server can be a sensible home for a small app.",
    ],
    try: "Prepare the runtime and configuration, copy a release, then start it. Deploy the broken release and recover with the previous one.",
    why: "A deployment is successful when the intended version actually works for a visitor, not when the file transfer finishes.",
    analogy:
      "Moving a shop to a new location also needs electricity, staff, and a working entrance. Similarly, an uploaded app still needs its runtime and configuration.",
    terms: [
      ["Deployment", "Making an application version available to run."],
      ["Artifact", "A packaged output ready for testing or deployment."],
      ["Rollback", "Returning to an earlier application version."],
    ],
    code: "Choose version → copy artifact → provide settings\n→ start app → check response → keep or roll back",
    question:
      "A file upload succeeded. What should you do before calling the deployment healthy?",
    answers: [
      "Delete the previous version immediately.",
      "Check that the intended version starts and serves a useful response.",
      "Assume the upload tool tested every feature.",
    ],
    correct: 1,
    explanation:
      "A health check and a real request provide evidence that the application works in its destination environment.",
    docs: webDocs,
  },
  {
    id: "git-history",
    title: "Keep a history with Git",
    subtitle: "Save meaningful changes, then share them.",
    icon: "ui-git",
    activity: "git",
    minutes: 8,
    problem:
      "Two people edit Little Notes. A folder called final-final-really-final no longer tells anyone which version works.",
    learn: [
      "Explain a repository, commit, branch, and merge.",
      "Distinguish saving locally from publishing or deploying.",
    ],
    paragraphs: [
      "Git records versions of a project. A repository contains the project and its history. A commit records a snapshot of selected changes with a message explaining them. Editing a file is not the same as making a commit.",
      "A branch is a movable name for a line of work. You can work on a feature branch while the main branch stays unchanged. A merge combines histories. If two changes disagree about the same part of a file, someone must resolve the conflict rather than guess which one to keep.",
      "Git works on your own computer. GitHub is a service that can host Git repositories and help people review changes. Pushing sends commits to a remote repository. A pull request proposes changes for review. None of these actions inherently deploys the app; a configured pipeline may do that later.",
      "A revert makes a new commit that undoes selected changes while keeping the history. It does not automatically restore a database or change a running server. Never commit passwords or secret keys. Removing a secret from the latest file does not remove it from the old history.",
    ],
    try: "Edit a greeting, commit it on a feature branch, merge it, and push. Then revert the change. Watch which copies change at each step.",
    why: "Git history, the shared repository, and the running app are different things. A deployment is the step that updates the running app.",
    analogy:
      "A commit resembles a labeled checkpoint. Git records selected project changes, not a complete backup of your computer or database.",
    terms: [
      ["Repository", "A project together with its Git history."],
      ["Commit", "A recorded snapshot of selected changes."],
      ["Branch", "A name pointing to a line of work."],
      ["Merge", "Combining lines of work."],
    ],
    code: 'git status\ngit add app.js\ngit commit -m "Improve the greeting"\n# push shares commits; it does not inherently deploy them',
    question: "You made a commit locally. What has definitely happened?",
    answers: [
      "Every production server has updated.",
      "GitHub has received it automatically.",
      "Git has recorded your selected changes in the local repository.",
    ],
    correct: 2,
    explanation:
      "Sharing requires a push, and deployment requires a separate configured action.",
    docs: "https://git-scm.com/book/en/v2",
  },
  {
    id: "build-and-test",
    title: "Check it before shipping",
    subtitle: "Dependencies, builds, and tests.",
    icon: "ui-pipeline",
    activity: "build",
    minutes: 6,
    problem:
      "A small change to the Save button looks fine, but it stops new notes from being stored.",
    learn: [
      "Explain what a build produces and what a test checks.",
      "Recognize that passing tests are evidence, not a guarantee.",
    ],
    paragraphs: [
      "Applications often use libraries: reusable code written by others. Those libraries are dependencies. A lockfile records chosen dependency versions so another machine can install the same set. You still need to review updates and known security problems.",
      "A build turns source code into an output that is ready to run or deliver. Some apps compile code; a web frontend may bundle files for the browser. Not every language needs the same build steps. A successful build means those steps worked, not that the app behaves correctly.",
      "A test checks an expectation. A small test may check a single function. An integration test checks parts working together. A browser test may act like a visitor saving a note. Useful tests catch behavior that matters rather than merely repeat the code.",
      "If a test fails, inspect the cause before shipping. If all tests pass, untested mistakes can still exist. A release also needs checks in its real environment, monitoring, and a recovery plan. Kubernetes cannot tell whether a Save button does what people intended.",
    ],
    try: "Run a build with a failing save-note test. Repair the example, rerun the pipeline, and inspect the artifact it produces.",
    why: "A package can build successfully and still contain a broken feature. Tests check specific expectations.",
    analogy:
      "A packed suitcase is ready to carry, but checking its contents answers a different question: did you bring what you need?",
    terms: [
      ["Dependency", "Other software an app relies on."],
      ["Build", "A process that prepares code for use."],
      ["Test", "An automated check of an expected behavior."],
    ],
    code: "Install locked dependencies → build → test\nIf the save-note test fails, stop and inspect the cause.",
    question: "All tests pass. What does that tell you?",
    answers: [
      "The behaviors those tests checked worked under their test conditions.",
      "No bug can exist anywhere.",
      "The app no longer needs monitoring.",
    ],
    correct: 0,
    explanation:
      "Tests are valuable, but their coverage and environment limit what they can prove.",
    docs: "https://docs.github.com/en/actions/about-github-actions/understanding-github-actions",
  },
  {
    id: "cicd-pipelines",
    title: "Build a delivery pipeline",
    subtitle: "Make the repeated steps visible and reliable.",
    icon: "ui-pipeline",
    activity: "pipeline",
    minutes: 8,
    problem:
      "Each release depends on someone remembering six commands. One person forgets the tests and deploys a broken change.",
    learn: [
      "Read the stages of a CI/CD pipeline.",
      "Distinguish continuous delivery from automatic deployment.",
    ],
    paragraphs: [
      "A pipeline is a series of automated steps triggered by an event, such as a push or a pull request. Continuous integration, or CI, combines frequent changes with builds and tests so problems appear earlier. It only does the checks you configure.",
      "Continuous delivery keeps a tested release ready to deploy, often with a person approving production. Continuous deployment goes further and automatically releases changes that pass the required gates. People use CD for both terms, so ask which meaning a team intends.",
      "A simple pipeline checks out a commit, installs dependencies, tests, packages an artifact, deploys it, and checks the result. A failed required step should block later release steps. Production credentials should be limited to the release job and kept out of code and logs.",
      "A pipeline and Kubernetes have different jobs. The pipeline builds and delivers a version. Kubernetes can keep that delivered version running. Kubernetes does not automatically review your code or run your tests. Even automated delivery needs monitoring and a way to recover.",
    ],
    try: "Run the pipeline with a failing test and see production stay unchanged. Fix the test, run again, then approve the release. Introduce an unhealthy release and observe rollback.",
    why: "Automation follows rules you wrote. A meaningful test gate and a post-deployment check catch different kinds of failure.",
    analogy:
      "A checklist carried out by a machine can be more consistent than memory. A bad checklist is still a bad checklist.",
    terms: [
      ["CI", "Frequent integration supported by automated builds and tests."],
      [
        "CD",
        "Delivery of releasable changes, or automatic deployment, depending on context.",
      ],
      ["Pipeline", "An ordered set of automated steps."],
      ["Gate", "A condition that must pass before work continues."],
    ],
    code: "Push → test → package → approval → deploy → verify\nFailed test: do not deploy\nFailed health check: recover the previous release",
    question: "A required test fails. What should this pipeline do?",
    answers: [
      "Deploy faster to hide the result.",
      "Stop the release and show the failure for investigation.",
      "Ask Kubernetes to rewrite the application.",
    ],
    correct: 1,
    explanation:
      "A release gate protects production only if a failure actually blocks release.",
    docs: "https://docs.github.com/en/actions/about-github-actions/understanding-github-actions",
  },
  {
    id: "config-and-environments",
    title: "Same app, different settings",
    subtitle: "Keep practice separate from production.",
    icon: "ui-settings",
    activity: "config",
    minutes: 6,
    problem:
      "A practice release accidentally connects to the real notes database. The code is the same, but the setting is wrong.",
    learn: [
      "Separate code, configuration, and secrets.",
      "Explain why development, staging, and production need different settings.",
    ],
    paragraphs: [
      "Configuration is information that changes how an app runs without changing its code. A port number, database address, or feature setting can be configuration. An environment variable is one way to provide a setting to a process when it starts.",
      "A secret is sensitive configuration, such as a password or an access token. Keep secrets out of the repository and container image. Supply them through a controlled mechanism and give the application only the access it needs. The practice token shown here is fake.",
      "Development is where you work on changes. Staging is a separate place to test a release in conditions closer to production. Production serves real users. Separate data and permissions help keep experiments from affecting those users.",
      "Changing a setting does not always change an already-running process. Many apps read environment variables only at startup. You may need a controlled restart or a feature designed to reload settings. Kubernetes has configuration tools, but the application still determines when it reads them.",
    ],
    try: "Choose staging, point it at the production database, and check the mismatch. Select the matching database and restart to load the new settings.",
    why: "A correct app with incorrect settings can still be unsafe or unavailable. Check the environment as well as the code.",
    analogy:
      "The same appliance can use different settings. Some changes apply immediately; others need a restart. Software has that distinction too.",
    terms: [
      ["Configuration", "Settings that affect how an app runs."],
      ["Secret", "Sensitive information that needs restricted access."],
      ["Staging", "A separate environment used to check a release."],
      ["Production", "The environment serving real users."],
    ],
    code: "APP_ENV=staging\nDATABASE_HOST=notes-staging\n# Supply a real password securely; never commit it.",
    question: "Where should a real database password go?",
    answers: [
      "In a public Git commit.",
      "In the image so everyone can reuse it.",
      "In a controlled secret mechanism with limited access.",
    ],
    correct: 2,
    explanation:
      "Keeping secrets outside code and images reduces accidental disclosure. It does not replace access control and careful handling.",
    docs: "https://kubernetes.io/docs/concepts/configuration/",
  },
  {
    id: "storage-and-backups",
    title: "Keep the notes when the app stops",
    subtitle: "Memory, persistent storage, and backups are different.",
    icon: "ui-data",
    activity: "storage",
    minutes: 7,
    problem:
      "The app restarts and yesterday’s notes disappear. Where were they actually stored?",
    learn: [
      "Distinguish temporary memory from persistent storage.",
      "Explain why persistence is not the same as a backup.",
    ],
    paragraphs: [
      "Memory is working space for a running program. If Little Notes keeps a note only in memory, a process restart loses it. Persistent storage is designed to outlive that process. A database usually writes data to persistent storage so it can be read later.",
      "An app can keep data on a local disk or use a separate database service. Local storage may survive a process restart but still be lost if the machine or disk fails. When you add app copies, decide how they will share or access the same data.",
      "A backup is a separate recoverable copy made for restoration. It can help with accidental deletion or corruption. A backup is only useful if it contains the needed data and you know how to restore it. New changes after the backup may still be lost.",
      "Kubernetes can attach storage to workloads. It does not automatically make every file durable, create a backup plan, or fix a damaged database. Applications and operators still need to choose where data lives and test recovery.",
    ],
    try: "Save a note in memory and restart. Switch to persistent storage and repeat. Make a backup, delete the note, then restore it.",
    why: "Persistence helps data survive a process restart. Backups help recover an earlier copy after a different kind of failure.",
    analogy:
      "A desk is working memory, a filing cabinet is storage, and a separate copy of the files is a backup. One cabinet can still be damaged.",
    terms: [
      ["Persistent", "Designed to outlive the current process or container."],
      ["Backup", "A recoverable copy of data."],
      ["Restore", "Recovering data from a backup."],
    ],
    code: "App memory: lost on restart\nPersistent disk: survives this process restart\nSeparate backup: can restore the earlier saved note",
    question: "A note is on persistent storage. Is it automatically backed up?",
    answers: [
      "No. A separate backup and a tested restore process are still needed.",
      "Yes, the word persistent means every copy is safe.",
      "Only if the app has two buttons.",
    ],
    correct: 0,
    explanation:
      "A disk can persist across restarts and still be damaged or have its contents accidentally deleted.",
    docs: "https://kubernetes.io/docs/concepts/storage/",
  },
  {
    id: "container-packages",
    title: "Package once, run it again",
    subtitle: "Images, containers, and registries.",
    icon: "ui-package",
    activity: "package",
    minutes: 7,
    problem:
      "Little Notes needs a particular runtime and library. Installing them differently on each server keeps producing surprises.",
    learn: [
      "Distinguish an image, a container, and a registry.",
      "Understand what still needs to be supplied outside the package.",
    ],
    paragraphs: [
      "A container image packages an application and supporting files. A container is a running instance started from an image. Two containers can start from the same image without sharing everything they later write.",
      "A registry stores and distributes images. A build pipeline can create an image, test it, and push it to a registry. A server pulls the chosen image and uses a container runtime to start it. A tag is a readable image label; a digest identifies exact image content.",
      "Images improve consistency, but still need a compatible operating system and processor architecture. Containers share the host kernel, a core part of the operating system. They are not complete virtual computers, and packaging does not make untrusted software safe by itself.",
      "Settings, secrets, network access, and durable data often come from outside the image. Keep the package reusable by keeping environment-specific details separate. Kubernetes uses images and runtimes; it does not normally build your application image for you.",
    ],
    try: "Build an image, publish it to the practice registry, pull it onto the server, and start a container. Try skipping a step and read the explanation.",
    why: "A registry distributes a package. A runtime starts a process from it. Neither automatically supplies the app’s private settings or data.",
    analogy:
      "An image is a packed toolkit; a registry is a storehouse. A toolkit on a shelf is not a person doing the work.",
    terms: [
      ["Image", "A packaged application and supporting files."],
      ["Container", "A running instance created from an image."],
      ["Registry", "A service that stores and distributes images."],
      ["Digest", "An identifier for exact image content."],
    ],
    code: "Source → build image → registry → pull image → run container\nSettings and persistent data are supplied separately.",
    question: "What does an image registry do?",
    answers: [
      "Keep every app process healthy forever.",
      "Store and distribute container images.",
      "Replace the application database.",
    ],
    correct: 1,
    explanation:
      "The server’s runtime starts the image; other systems handle health, traffic, configuration, and storage.",
    docs: "https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-an-image/",
  },
  {
    id: "traffic-and-copies",
    title: "Share the traffic",
    subtitle: "More copies help only when requests can reach them.",
    icon: "ui-network",
    activity: "balance",
    minutes: 7,
    problem:
      "Lots of people open Little Notes at once. One copy becomes slow. You start another, but visitors still go to the first.",
    learn: [
      "Explain a load balancer and a health check.",
      "Recognize the limits of adding more app copies.",
    ],
    paragraphs: [
      "A load balancer distributes incoming requests among available destinations. Adding a copy helps only if traffic can reach it. The load balancer needs a list of destinations and a way to avoid copies that cannot serve useful responses.",
      "A health check asks a specific question about a service. A readiness check asks whether it should receive traffic now. A process can be running but not ready because it has not finished starting or cannot reach a dependency. The check must match the application’s needs.",
      "Scaling out means adding more copies. Scaling up means giving a machine or workload more resources. Neither has unlimited benefit: a shared database, network link, or software bug can still limit the whole application.",
      "Copies also need a plan for data. If each stores notes only in its own memory, different visitors can see different notes. A shared database or another deliberate design keeps the app’s state consistent. Kubernetes helps run copies and route traffic; it does not design the database for you.",
    ],
    try: "Send a burst of requests to one copy, add another, and compare failures. Mark a copy unhealthy and toggle readiness-aware routing.",
    why: "Useful capacity comes from healthy copies that receive traffic, with dependencies that can support the work.",
    analogy:
      "Opening another checkout helps only if shoppers are directed to it and it is ready to serve them. A shared stockroom can still slow everyone down.",
    terms: [
      [
        "Load balancer",
        "A service that distributes requests among destinations.",
      ],
      ["Readiness", "Whether an app can usefully receive traffic now."],
      ["Scale out", "Run more copies."],
      ["Bottleneck", "The part that limits overall progress."],
    ],
    code: "Visitors → load balancer → ready copy A\n                        → ready copy B\n                        × unready copy C",
    question:
      "Two app copies overload the same database. Will more copies always fix it?",
    answers: [
      "Yes, replicas create unlimited capacity.",
      "Yes, the database disappears.",
      "No. The shared database may remain the bottleneck.",
    ],
    correct: 2,
    explanation:
      "You need to find the limiting part of the request path. Adding app copies cannot automatically increase database capacity.",
    docs: "https://kubernetes.io/docs/concepts/services-networking/",
  },
  {
    id: "read-the-signals",
    title: "Find clues before changing things",
    subtitle: "Logs, metrics, and a calm debugging loop.",
    icon: "ui-activity",
    activity: "debug",
    minutes: 7,
    problem:
      "A visitor says “it’s broken.” You need evidence before deciding what to restart or replace.",
    learn: [
      "Distinguish logs from metrics and traces.",
      "Use a symptom, a hypothesis, a small change, and a check.",
    ],
    paragraphs: [
      "A log is a record of an event, such as an app starting or a request failing. A metric is a measured number over time, such as memory use, response time, or failed requests. A trace follows one request across several services. Each gives a different view.",
      "Start with what the visitor sees and when it began. Check which version is running. Ask a focused question: did the process start, is the port correct, can the app reach the database, or is it simply overloaded? Look for evidence that supports or rejects the idea.",
      "Make one relevant change and test the same behavior again. Changing several settings at once can hide the cause. A lower error rate is useful, but also check that a real visitor can finish the task. Keep sensitive data out of logs and public screenshots.",
      "Kubernetes exposes workload status and events, but you still need to interpret them. Running is a process state, not a promise that every request succeeds. The later troubleshooting lesson uses this same habit: observe, explain, change, verify.",
    ],
    try: "Inspect the status, log, and metric cards. Choose the cause supported by the evidence, make the matching repair, then send a verification request.",
    why: "Evidence narrows the problem. A successful check after a targeted change is stronger than a restart followed by a guess.",
    analogy:
      "A dashboard warning and a mechanic’s notes reveal different clues. Neither automatically repairs the engine.",
    terms: [
      ["Log", "A record of an event."],
      ["Metric", "A measured number, often tracked over time."],
      ["Trace", "A record of a request’s journey."],
      ["Hypothesis", "A possible explanation you can test."],
    ],
    code: "Observe → form a hypothesis → inspect evidence\n→ make one change → repeat the failing request",
    question:
      "The process says Running, but requests fail. What should you do?",
    answers: [
      "Inspect readiness, logs, and the request path before choosing a fix.",
      "Ignore the visitor because Running proves success.",
      "Delete the database to remove complexity.",
    ],
    correct: 0,
    explanation:
      "Process state is one clue. Dependencies, configuration, and networking can still make requests fail.",
    docs: "https://kubernetes.io/docs/tasks/debug/debug-application/",
  },
  {
    id: "why-orchestration",
    title: "Why Kubernetes exists",
    subtitle: "Bring the pieces together, then decide what needs automation.",
    icon: "kubernetes",
    activity: "orchestrate",
    minutes: 8,
    problem:
      "You now know how to run one app. Imagine keeping dozens of copies healthy across several machines, through failures and updates.",
    learn: [
      "Connect delivery, runtime, networking, storage, and recovery.",
      "Choose when orchestration helps and when a simpler deployment is enough.",
    ],
    paragraphs: [
      "Orchestration means coordinating work across a system. Once an app is packaged, someone must choose where copies run, replace failed ones, connect traffic to them, supply settings, and manage updates. Doing this by hand becomes harder as the system grows.",
      "Kubernetes lets you describe a desired state, such as three copies of a particular image. Controllers repeatedly compare that request with what exists and try to correct differences. Nodes provide the actual computers and capacity. Recovery still takes time and can fail if there is no room or the image is broken.",
      "Kubernetes uses the ideas you just learned: application processes, images, networks, ports, configuration, storage, and health checks. A CI/CD pipeline can deliver changes to it. Kubernetes does not replace Git, write application code, invent hardware, back up every database, or guarantee that tests passed.",
      "A small app may be easier to host on one server or a managed platform. Kubernetes becomes useful when its coordination and controls justify the extra complexity. You can learn it without assuming every project needs it. Next, explore how Pods, Deployments, and Services express those ideas.",
    ],
    try: "Bring the app online by fixing its route and database connection. Break a copy with recovery off, then enable recovery and check the result.",
    why: "Kubernetes coordinates the running system. People and pipelines still provide sound software, adequate capacity, and a recovery plan.",
    analogy:
      "An orchestra conductor coordinates musicians but does not build their instruments or write every piece of music. Kubernetes also depends on the things it coordinates.",
    terms: [
      ["Orchestration", "Coordinating how parts of a system run together."],
      ["Desired state", "What you ask the system to maintain."],
      [
        "Controller",
        "A loop that checks for differences and tries to correct them.",
      ],
    ],
    code: "Git → CI/CD → image registry → Kubernetes\n                           ↘ runs copies, connects traffic, replaces failures\nPeople still design the app, data protection, and security.",
    question: "Which job is a good match for Kubernetes?",
    answers: [
      "Writing the missing application tests for you.",
      "Working to maintain the requested number of application copies.",
      "Guaranteeing that a bad release has no bugs.",
    ],
    correct: 1,
    explanation:
      "Kubernetes works toward the desired runtime state. A controller can replace a crashed copy without fixing the code that made it crash.",
    docs: "https://kubernetes.io/docs/concepts/overview/",
  },
];
