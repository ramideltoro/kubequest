import { stringify } from "yaml";
export const recipes = [];
export const q = (s) => "'" + s.replaceAll("'", "'\\''") + "'";
export const file = (name, body) =>
  `cat > ${q(name)} <<'KUBEQUEST_FILE'\n${body.trim()}\nKUBEQUEST_FILE`;
export const yaml = (object) => stringify(object).trim();
export const manifest = (name, object) => file(name, yaml(object));
export const apply = (object) =>
  `kubectl apply -f - <<'KUBEQUEST_YAML'\n${yaml(object)}\nKUBEQUEST_YAML`;
export const ns = (name) => `kubectl create namespace ${name}`;
export const pod = (name = "nginx", image = "nginx:1.28", extra = {}) => ({
  apiVersion: "v1",
  kind: "Pod",
  metadata: { name, labels: { run: name } },
  spec: {
    containers: [{ name, image, imagePullPolicy: "IfNotPresent", ...extra }],
  },
});
export const busy = (name = "busybox", command = ["sh", "-c", "sleep 3600"]) =>
  pod(name, "busybox:1.37", { command });
export const deploy = (
  name = "nginx",
  replicas = 2,
  image = "nginx:1.18.0",
) => ({
  apiVersion: "apps/v1",
  kind: "Deployment",
  metadata: { name },
  spec: {
    replicas,
    selector: { matchLabels: { app: name } },
    template: {
      metadata: { labels: { app: name } },
      spec: {
        containers: [
          {
            name: "nginx",
            image,
            imagePullPolicy: "IfNotPresent",
            ports: [{ containerPort: 80 }],
          },
        ],
      },
    },
  },
});
export const waitPod = (name, namespace = "quest") =>
  `kubectl wait -n ${namespace} --for=condition=Ready pod/${name} --timeout=90s`;
export const waitDeploy = (name) =>
  `kubectl rollout status deployment/${name} --timeout=120s`;
export const getCheck = (label, resource, expr, namespace = "quest") => ({
  label,
  command: `kubectl get ${resource} -n ${namespace} -o json | jq -e ${q(expr)} >/dev/null`,
});
export const shellCheck = (label, command) => ({ label, command });
export const absent = (label, resource, namespace = "quest") =>
  shellCheck(
    label,
    `test -z "$(kubectl get ${resource} -n ${namespace} --ignore-not-found -o name)"`,
  );
export const readyCheck = (name, namespace = "quest") =>
  getCheck(
    "The Pod is Ready",
    `pod/${name}`,
    '.status.conditions | any(.type == "Ready" and .status == "True")',
    namespace,
  );
export function add(
  i,
  title,
  tagline,
  setup,
  solution,
  checks,
  why,
  options = {},
) {
  recipes.push({ i, title, tagline, setup, solution, checks, why, ...options });
}
export const runPod = (p) => apply(p) + "\n" + waitPod(p.metadata.name);
export const report = (command, name = "answer.txt") =>
  `${command.includes("; kubectl") ? `{\n${command}\n}` : command} > ${name}\ncat ${name}`;
export const reportCheck = (expr, name = "answer.txt") =>
  shellCheck(
    "The saved evidence contains the requested result",
    `test -s ${name}\n${expr}`,
  );
export const contains = (text, name = "answer.txt") =>
  reportCheck(`grep -F -- ${q(text)} ${name} >/dev/null`, name);
