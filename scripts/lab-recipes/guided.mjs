import fs from "node:fs";
import {
  add,
  apply,
  manifest,
  waitPod,
  getCheck,
  shellCheck,
  file,
} from "./helpers.mjs";
import { parse } from "yaml";
const lessons = JSON.parse(
  fs.readFileSync(
    new URL("../../content/ckad-curriculum.json", import.meta.url),
  ),
);
const k = lessons[0];
const ksetup = k.example.match(/```bash\n([\s\S]*?)```/)[1];
const ksolution = k.solution.match(/```bash\n([\s\S]*?)```/)[1];
add(
  152,
  k.title,
  "Keep shared configuration in one base and change only the differences.",
  ksetup,
  "cd kq-overlays\n" + ksolution,
  [
    shellCheck(
      "Staging renders the requested deployment",
      `cd kq-overlays\nkubectl create --dry-run=client -f staging.yaml -o json | jq -e '.metadata.name == "stage-web" and .spec.replicas == 2 and .spec.template.spec.containers[0].image == "nginx:1.28-alpine"' >/dev/null`,
    ),
    shellCheck(
      "The base remains one replica",
      `cd kq-overlays\nkubectl kustomize base | kubectl create --dry-run=client -f - -o json | jq -e '.metadata.name == "web" and .spec.replicas == 1' >/dev/null`,
    ),
  ],
  k.concept,
  {
    id: k.id,
    brief: k.challenge,
    namespace: "quest",
    sourceKind: "curriculum",
  },
);
const r = lessons[1];
add(
  153,
  r.title,
  "Prove both the permissions granted and those withheld.",
  `kubectl create namespace kq-access\nkubectl create serviceaccount reporter -n kq-access\nkubectl create role pod-reader -n kq-access --verb=get,list --resource=pods\nkubectl create rolebinding reporter-read -n kq-access --role=pod-reader --serviceaccount=kq-access:reporter`,
  r.solution.match(/```bash\n([\s\S]*?)```/)[1],
  [
    shellCheck(
      "The identity can watch Pods",
      `kubectl auth can-i watch pods -n kq-access --as=system:serviceaccount:kq-access:reporter | grep -x yes`,
    ),
    shellCheck(
      "The identity cannot delete Pods",
      `test "$(kubectl auth can-i delete pods -n kq-access --as=system:serviceaccount:kq-access:reporter || true)" = no`,
    ),
    shellCheck(
      "Secrets and other namespaces stay inaccessible",
      `test "$(kubectl auth can-i get secrets -n kq-access --as=system:serviceaccount:kq-access:reporter || true)" = no\ntest "$(kubectl auth can-i list pods -n default --as=system:serviceaccount:kq-access:reporter || true)" = no`,
    ),
  ],
  r.concept,
  {
    id: r.id,
    brief: r.challenge,
    namespace: "kq-access",
    sourceKind: "curriculum",
  },
);
const s = lessons[2];
const slow = parse(s.example.match(/```yaml\n([\s\S]*?)```/)[1]);
const repaired = structuredClone(slow);
repaired.spec.containers[0].command[2] =
  "sleep 45; touch /tmp/healthy; sleep 3600";
repaired.spec.containers[0].startupProbe.failureThreshold = 45;
add(
  154,
  s.title,
  "Protect initialization, then prove steady-state recovery.",
  `kubectl create namespace kq-startup\n${manifest("slow.yaml", slow)}\nkubectl apply -f slow.yaml\n${waitPod("slow", "kq-startup")}`,
  manifest("slow.yaml", repaired) +
    "\nkubectl delete pod slow -n kq-startup\nkubectl apply -f slow.yaml\n" +
    waitPod("slow", "kq-startup") +
    `\nkubectl exec -n kq-startup slow -- rm /tmp/healthy\nfor i in $(seq 1 60); do test "$(kubectl get pod slow -n kq-startup -o jsonpath='{.status.containerStatuses[0].restartCount}')" -ge 1 && break; sleep 2; done\n` +
    waitPod("slow", "kq-startup"),
  [
    getCheck(
      "The startup budget is configured",
      "pod/slow",
      ".spec.containers[0].startupProbe | .failureThreshold == 45 and .periodSeconds == 2",
      "kq-startup",
    ),
    getCheck(
      "The liveness check remains intact",
      "pod/slow",
      ".spec.containers[0].livenessProbe | .periodSeconds == 5 and .failureThreshold == 3",
      "kq-startup",
    ),
    getCheck(
      "A restart occurred and readiness recovered",
      "pod/slow",
      '.status.containerStatuses[0].restartCount >= 1 and (.status.conditions | any(.type == "Ready" and .status == "True"))',
      "kq-startup",
    ),
  ],
  s.concept,
  {
    id: s.id,
    brief: s.challenge,
    namespace: "kq-startup",
    sourceKind: "curriculum",
  },
);
const j = lessons[3];
add(
  155,
  j.title,
  "Extract a stable report from structured objects.",
  `kubectl create namespace kq-report\nkubectl create configmap api -n kq-report --from-literal=owner=payments --from-literal=tier=backend\nkubectl create configmap web -n kq-report --from-literal=owner=storefront --from-literal=tier=frontend\nkubectl label configmap api web -n kq-report practice=kq-report`,
  j.solution.match(/```bash\n([\s\S]*?)```/)[1] + "\ncat owners.tsv",
  [
    shellCheck(
      "The report has the exact rows and separators",
      `printf 'api\tpayments\tbackend\nweb\tstorefront\tfrontend\n' > /tmp/kq-expected.tsv\ndiff -u /tmp/kq-expected.tsv owners.tsv`,
    ),
  ],
  j.concept,
  {
    id: j.id,
    brief: j.challenge,
    namespace: "kq-report",
    sourceKind: "curriculum",
  },
);
