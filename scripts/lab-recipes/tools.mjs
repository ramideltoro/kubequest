import {
  add,
  pod,
  apply,
  manifest,
  waitPod,
  getCheck,
  readyCheck,
  shellCheck,
  absent,
  report,
  contains,
  file,
} from "./helpers.mjs";
const charts =
  "cp -R /opt/kubequest-fixtures/charts/web ./web\ncp /opt/kubequest-fixtures/charts/myvalues.yaml ./myvalues.yaml\ncp /opt/kubequest-fixtures/charts/override.yaml ./override.yaml";
const helmWhy =
  "Helm renders a chart’s templates using merged values, then stores release state in the cluster. This lab uses a small bundled web chart and a local repository so it works without public internet access.";
const release = "helm install web ./web -f myvalues.yaml --wait --timeout=120s";
add(
  126,
  "Scaffold a Helm chart",
  "Start with a standard chart directory.",
  "",
  "helm create chart-test\nhelm lint chart-test",
  [
    shellCheck(
      "The chart has metadata and templates",
      "test -s chart-test/Chart.yaml\ntest -s chart-test/values.yaml\ntest -d chart-test/templates\nhelm lint chart-test >/dev/null",
    ),
  ],
  helmWhy,
  {
    brief:
      "Create chart-test with helm create and verify that helm lint succeeds.",
  },
);
add(
  127,
  "Install a chart with values",
  "A values file customizes the bundled application.",
  charts,
  release,
  [
    getCheck(
      "Two web replicas are available",
      "deployment/web",
      ".spec.replicas == 2 and .status.availableReplicas == 2",
    ),
    shellCheck(
      "Helm reports the release deployed",
      `helm status web -o json | jq -e '.info.status == "deployed"' >/dev/null`,
    ),
  ],
  helmWhy,
  {
    brief:
      "Install release web from ./web using myvalues.yaml. Wait until the release is deployed.",
  },
);
const pending =
  charts +
  `\nnohup helm install pending ./web --set image=nginx:missing-release --wait --timeout=300s >/tmp/kq-pending.log 2>&1 </dev/null &\nfor i in $(seq 1 30); do helm list --pending -A -o json | jq -e 'any(.name == "pending")' >/dev/null && break; sleep 1; done`;
add(
  128,
  "Find pending releases",
  "An unfinished installation can be hidden by the default list.",
  pending,
  report("helm list --pending --all-namespaces"),
  [contains("pending"), contains("pending-install")],
  helmWhy,
  {
    brief:
      "Find the pending Helm installation across namespaces and save the table to answer.txt.",
  },
);
add(
  129,
  "Uninstall the release",
  "Remove the resources Helm owns.",
  charts + "\n" + release,
  "helm uninstall web",
  [
    absent("The Deployment is gone", "deployment/web"),
    shellCheck(
      "The release is absent",
      `helm list -a -o json | jq -e 'all(.name != "web")' >/dev/null`,
    ),
  ],
  helmWhy,
  { brief: "Uninstall the supplied web release." },
);
add(
  130,
  "Layer values for an upgrade",
  "Later values files take precedence.",
  charts + "\n" + release,
  "helm upgrade web ./web -f myvalues.yaml -f override.yaml --wait --timeout=120s",
  [
    getCheck(
      "The override produces three available replicas",
      "deployment/web",
      ".spec.replicas == 3 and .status.availableReplicas == 3",
    ),
    shellCheck(
      "Helm stores the merged replica value",
      `helm get values web -o json | jq -e '.replicaCount == 3' >/dev/null`,
    ),
  ],
  helmWhy,
  {
    brief:
      "Upgrade web using myvalues.yaml then override.yaml, preserving that order. The override requests three replicas.",
  },
);
add(
  131,
  "Manage a chart repository",
  "An index connects chart names to downloadable packages.",
  "",
  `helm repo add practice http://127.0.0.1:8879\nhelm repo update practice\nhelm repo list > answer.txt\ncat answer.txt`,
  [
    shellCheck(
      "The local repository is registered",
      `helm repo list -o json | jq -e 'any(.name == "practice" and .url == "http://127.0.0.1:8879")' >/dev/null`,
    ),
    contains("practice"),
  ],
  helmWhy,
  {
    brief:
      "Add the bundled repository at http://127.0.0.1:8879 as practice, update its index, and save helm repo list to answer.txt.",
  },
);
add(
  132,
  "Download without installing",
  "Inspect a chart before it can create resources.",
  "helm repo add practice http://127.0.0.1:8879\nhelm repo update practice",
  "helm pull practice/web --untar --untardir downloaded\nhelm lint downloaded/web",
  [
    shellCheck(
      "The downloaded chart is valid",
      "test -s downloaded/web/Chart.yaml\nhelm lint downloaded/web >/dev/null",
    ),
    absent("No Deployment was installed", "deployment/web"),
  ],
  helmWhy,
  {
    brief:
      "Download and unpack practice/web into downloaded/. Do not install a release.",
  },
);
add(
  133,
  "Add a repository by name",
  "Use a reliable local mirror for repository practice.",
  "",
  "helm repo add catalog http://127.0.0.1:8879",
  [
    shellCheck(
      "catalog points to the supplied repository",
      `helm repo list -o json | jq -e 'any(.name == "catalog" and .url == "http://127.0.0.1:8879")' >/dev/null`,
    ),
  ],
  helmWhy,
  {
    brief:
      "Add http://127.0.0.1:8879 with the name catalog. This replaces the historical Bitnami URL with a bundled offline repository while retaining the repo-add task.",
  },
);
add(
  134,
  "Inspect chart defaults",
  "See configurable values before choosing overrides.",
  "helm repo add catalog http://127.0.0.1:8879",
  report("helm show values catalog/web", "defaults.yaml"),
  [
    contains("replicaCount:", "defaults.yaml"),
    contains("image:", "defaults.yaml"),
  ],
  helmWhy,
  {
    brief:
      "Save helm show values catalog/web to defaults.yaml. The bundled web chart replaces the historical bitnami/node dependency.",
  },
);
add(
  135,
  "Override replicas during install",
  "A command-line value changes the rendered workload.",
  "helm repo add catalog http://127.0.0.1:8879",
  "helm install scaled catalog/web --set replicaCount=5 --wait --timeout=120s",
  [
    getCheck(
      "Five replicas are available",
      "deployment/scaled",
      ".spec.replicas == 5 and .status.availableReplicas == 5",
    ),
  ],
  helmWhy,
  {
    brief:
      "Install catalog/web as scaled, setting replicaCount=5 on the command line.",
  },
);
const crd = {
  apiVersion: "apiextensions.k8s.io/v1",
  kind: "CustomResourceDefinition",
  metadata: { name: "operators.stable.example.com" },
  spec: {
    group: "stable.example.com",
    versions: [
      {
        name: "v1",
        served: true,
        storage: true,
        schema: {
          openAPIV3Schema: {
            type: "object",
            properties: {
              spec: {
                type: "object",
                properties: {
                  email: { type: "string" },
                  name: { type: "string" },
                  age: { type: "integer" },
                },
              },
            },
          },
        },
      },
    ],
    scope: "Namespaced",
    names: {
      plural: "operators",
      singular: "operator",
      kind: "Operator",
      shortNames: ["op"],
    },
  },
};
const custom = {
  apiVersion: "stable.example.com/v1",
  kind: "Operator",
  metadata: { name: "operator-sample" },
  spec: {
    email: "operator-sample@stable.example.com",
    name: "operator sample",
    age: 30,
  },
};
const crdSetup =
  apply(crd) +
  "\nkubectl wait --for=condition=Established crd/operators.stable.example.com --timeout=60s";
const crdWhy =
  "A CRD registers an API type and schema. Its instances are stored by Kubernetes, but the name Operator does not install an operator controller or reconcile application behavior.";
add(
  136,
  "Describe a custom API",
  "The schema defines the objects Kubernetes will accept.",
  "",
  manifest("operator-crd.yaml", crd),
  [
    shellCheck(
      "The manifest defines the required names and schema",
      `kubectl create --dry-run=client -f operator-crd.yaml -o json | jq -e '.spec.group == "stable.example.com" and .spec.names.kind == "Operator" and .spec.versions[0].schema.openAPIV3Schema.properties.spec.properties.age.type == "integer"' >/dev/null`,
    ),
    absent("The CRD is not installed yet", "crd/operators.stable.example.com"),
  ],
  crdWhy,
  {
    brief:
      "Save operator-crd.yaml defining namespaced stable.example.com/v1 Operator, plural operators, short name op, with spec email/name strings and age integer. Do not apply yet.",
  },
);
add(
  137,
  "Register the custom API",
  "The API server must establish the definition.",
  manifest("operator-crd.yaml", crd),
  "kubectl apply -f operator-crd.yaml\nkubectl wait --for=condition=Established crd/operators.stable.example.com --timeout=60s",
  [
    getCheck(
      "The CRD is established",
      "crd/operators.stable.example.com",
      '.status.conditions | any(.type == "Established" and .status == "True")',
    ),
  ],
  crdWhy,
  { brief: "Apply the supplied operator-crd.yaml and wait for establishment." },
);
add(
  138,
  "Create an instance of the custom type",
  "Custom resources must satisfy the registered schema.",
  crdSetup,
  manifest("operator.yaml", custom) + "\nkubectl apply -f operator.yaml",
  [
    getCheck(
      "The custom object has the supplied fields",
      "operator/operator-sample",
      '.spec.age == 30 and .spec.name == "operator sample" and .spec.email == "operator-sample@stable.example.com"',
    ),
  ],
  crdWhy,
  {
    brief:
      "Create Operator operator-sample with age 30, name operator sample and email operator-sample@stable.example.com.",
  },
);
add(
  139,
  "Discover the resource aliases",
  "The same object can be listed through its short name.",
  crdSetup + "\n" + apply(custom),
  report("kubectl get operators; kubectl get operator; kubectl get op"),
  [contains("operator-sample")],
  crdWhy,
  {
    brief:
      "List the supplied custom object using plural, singular and short resource names. Save all three results to answer.txt.",
  },
);
const dockerfile =
  'FROM docker.io/library/httpd:2.4\nRUN echo "Hello, World!" > /usr/local/apache2/htdocs/index.html';
const build =
  file("Dockerfile", dockerfile) +
  "\npodman build --pull=never -t localhost/simpleapp .";
const running =
  build + "\npodman run -d --name test -p 8080:80 localhost/simpleapp";
const podmanWhy =
  "Podman manages containers inside the disposable lab VM. Images are templates; containers are instances with writable filesystems. The provided registries and credentials are local practice fixtures, not external accounts.";
add(
  140,
  "Package a custom homepage",
  "The image should contain the page before it starts.",
  "",
  file("Dockerfile", dockerfile),
  [
    shellCheck(
      "The Dockerfile declares httpd and the custom page",
      `grep -F 'FROM docker.io/library/httpd:2.4' Dockerfile >/dev/null\ngrep -F 'Hello, World!' Dockerfile >/dev/null\ngrep -F '/usr/local/apache2/htdocs/index.html' Dockerfile >/dev/null`,
    ),
  ],
  podmanWhy,
  {
    brief:
      "Write a Dockerfile based on docker.io/library/httpd:2.4 that writes Hello, World! into /usr/local/apache2/htdocs/index.html.",
  },
);
add(
  141,
  "Build and inspect image layers",
  "A build turns the Dockerfile into a reusable image.",
  file("Dockerfile", dockerfile),
  "podman build --pull=never -t localhost/simpleapp .\npodman image tree localhost/simpleapp > answer.txt\ncat answer.txt",
  [
    shellCheck("The image exists", "podman image exists localhost/simpleapp"),
    contains("Image Layers"),
  ],
  podmanWhy,
  {
    brief:
      "Build localhost/simpleapp from Dockerfile without pulling, then save its image tree to answer.txt.",
  },
);
add(
  142,
  "Run and test the image",
  "A running container must also serve the expected response.",
  build,
  "podman run -d --name test -p 8080:80 localhost/simpleapp\npodman ps\npodman logs test\nsleep 2\ncurl -fsS http://127.0.0.1:8080 > answer.txt\ncat answer.txt",
  [
    shellCheck(
      "test is running",
      `podman inspect test | jq -e '.[0].State.Running == true' >/dev/null`,
    ),
    contains("Hello, World!"),
  ],
  podmanWhy,
  {
    brief:
      "Run localhost/simpleapp as test, publishing port 8080 to 80. Inspect status/logs and save the HTTP response to answer.txt.",
  },
);
add(
  143,
  "Inspect the container’s page",
  "exec reads the filesystem of the running instance.",
  running,
  report("podman exec test cat /usr/local/apache2/htdocs/index.html"),
  [contains("Hello, World!")],
  podmanWhy,
  {
    brief:
      "Use podman exec in test to read index.html and save it to answer.txt.",
  },
);
const pushed =
  build +
  "\npodman tag localhost/simpleapp localhost:5000/simpleapp\npodman push --tls-verify=false localhost:5000/simpleapp";
add(
  144,
  "Publish to the lab registry",
  "A registry tag identifies the destination repository.",
  build,
  "podman tag localhost/simpleapp localhost:5000/simpleapp\npodman push --tls-verify=false localhost:5000/simpleapp\ncurl -fsS http://127.0.0.1:5000/v2/_catalog",
  [
    shellCheck(
      "The registry exposes the pushed manifest",
      `curl -fsS -H 'Accept: application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.v2+json' http://127.0.0.1:5000/v2/simpleapp/manifests/latest >/dev/null`,
    ),
  ],
  podmanWhy,
  {
    brief:
      "Tag localhost/simpleapp as localhost:5000/simpleapp and push to the provided HTTP-only practice registry. Use --tls-verify=false for this local fixture.",
  },
);
add(
  145,
  "Create without starting",
  "A container can exist before its process runs.",
  "",
  "podman create --name parked docker.io/library/busybox:latest\npodman ps -a",
  [
    shellCheck(
      "parked exists but is not running",
      `podman inspect parked | jq -e '.[0].State.Status == "created" and .[0].State.Running == false' >/dev/null`,
    ),
  ],
  podmanWhy,
  {
    brief:
      "Create container parked from the preloaded busybox image without starting it.",
  },
);
add(
  146,
  "Export a container filesystem",
  "An export is different from an image archive.",
  "podman create --name parked docker.io/library/busybox:latest",
  "podman export parked --output=output.tar\ntar -tf output.tar | head -10 || true",
  [
    shellCheck(
      "The archive contains the container filesystem",
      'test -s output.tar\ntar -tf output.tar > /tmp/kq-archive-list\ngrep -E "(^|/)etc/passwd$" /tmp/kq-archive-list >/dev/null',
    ),
  ],
  "podman export writes the container filesystem. It does not preserve image metadata, layer history or the original build recipe as podman save would.",
  { brief: "Export parked to output.tar and inspect its contents." },
);
const registryPod = pod("simpleapp", "localhost:5000/simpleapp:latest", {
  ports: [{ containerPort: 80 }],
});
registryPod.spec.containers[0].imagePullPolicy = "Always";
add(
  147,
  "Pull the published image into Kubernetes",
  "The node runtime must reach the registry.",
  pushed,
  apply(registryPod) +
    "\n" +
    waitPod("simpleapp") +
    `\nIP=$(kubectl get pod simpleapp -o jsonpath='{.status.podIP}'); curl -fsS "$IP"`,
  [
    readyCheck("simpleapp"),
    shellCheck(
      "The Pod serves the built page",
      `IP=$(kubectl get pod simpleapp -o jsonpath='{.status.podIP}'); curl -fsS "$IP" | grep -F 'Hello, World!' >/dev/null`,
    ),
  ],
  podmanWhy,
  {
    brief:
      "Create Pod simpleapp using localhost:5000/simpleapp:latest with imagePullPolicy Always, then verify its homepage. The practice node is configured for this registry.",
  },
);
const login =
  "printf 'practice-password\\n' | podman login --tls-verify=false --authfile /home/student/auth.json --username student --password-stdin localhost:5001";
add(
  148,
  "Log in to the private fixture",
  "Use a local practice identity rather than real account credentials.",
  "",
  login + "\nchmod 600 auth.json\njq '.auths | keys' auth.json",
  [
    shellCheck(
      "The auth file names the registry",
      `jq -e '.auths["localhost:5001"].auth != null' auth.json >/dev/null`,
    ),
  ],
  podmanWhy,
  {
    brief:
      "Log in to localhost:5001 as student with practice-password. Save credentials to auth.json and show only the registry names, not the encoded credential.",
  },
);
add(
  149,
  "Make image-pull credentials",
  "Kubernetes accepts registry credentials in a typed Secret.",
  login + "\nchown student:student auth.json",
  `kubectl create secret generic mysecret --from-file=.dockerconfigjson=auth.json --type=kubernetes.io/dockerconfigjson\nkubectl create secret docker-registry mysecret2 --docker-server=localhost:5001 --docker-username=student --docker-password=practice-password`,
  [
    getCheck(
      "The file-based Secret has the correct type",
      "secret/mysecret",
      '.type == "kubernetes.io/dockerconfigjson" and .data[".dockerconfigjson"] != null',
    ),
    getCheck(
      "The CLI Secret targets the local registry",
      "secret/mysecret2",
      '.data[".dockerconfigjson"] | @base64d | fromjson | .auths["localhost:5001"].username == "student"',
    ),
  ],
  podmanWhy,
  {
    brief:
      "Create mysecret from auth.json with type kubernetes.io/dockerconfigjson, and mysecret2 using kubectl create secret docker-registry for the practice identity.",
  },
);
const privatePod = pod("private-reg", "localhost:5001/simpleapp:latest");
privatePod.spec.imagePullSecrets = [{ name: "mysecret" }];
privatePod.spec.containers[0].imagePullPolicy = "Always";
add(
  150,
  "Use a private registry Secret",
  "The image reference and pull credential must agree.",
  build +
    "\n" +
    login +
    "\npodman tag localhost/simpleapp localhost:5001/simpleapp\npodman push --tls-verify=false --authfile /home/student/auth.json localhost:5001/simpleapp\nkubectl create secret generic mysecret --from-file=.dockerconfigjson=auth.json --type=kubernetes.io/dockerconfigjson",
  manifest("private-pod.yaml", privatePod) +
    "\nkubectl apply -f private-pod.yaml\n" +
    waitPod("private-reg"),
  [
    getCheck(
      "The Pod references the pull Secret",
      "pod/private-reg",
      '.spec.imagePullSecrets | any(.name == "mysecret")',
    ),
    readyCheck("private-reg"),
  ],
  podmanWhy,
  {
    brief:
      "Save and apply private-pod.yaml for private-reg using localhost:5001/simpleapp:latest, imagePullPolicy Always and imagePullSecrets mysecret.",
  },
);
add(
  151,
  "Clean the container workspace",
  "Remove the lab’s containers and images when finished.",
  running + "\n" + apply(pod("simpleapp", "nginx:1.28")),
  "podman rm --all --force\npodman rmi --all --force\nkubectl delete pod simpleapp",
  [
    shellCheck("No Podman containers remain", 'test -z "$(podman ps -aq)"'),
    shellCheck("No Podman images remain", 'test -z "$(podman images -q)"'),
    absent("The Kubernetes Pod is removed", "pod/simpleapp"),
  ],
  "These cleanup commands affect the disposable guest’s Podman storage only. Kubernetes uses a separate containerd image store; deleting Podman images does not remove those images.",
  {
    brief:
      "Remove all Podman containers and images, then delete Kubernetes Pod simpleapp. This intentionally also removes the disposable local registry containers; Reset restores them.",
  },
);
