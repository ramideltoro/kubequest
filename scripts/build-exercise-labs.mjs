import fs from "node:fs";
import assert from "node:assert/strict";
import "./lab-recipes/core.mjs";
import "./lab-recipes/pod-design.mjs";
import "./lab-recipes/configuration.mjs";
import "./lab-recipes/operations.mjs";
import "./lab-recipes/tools.mjs";
import "./lab-recipes/guided.mjs";
import { recipes } from "./lab-recipes/helpers.mjs";
const source = JSON.parse(fs.readFileSync("content/ckad-exercises.json"));
const guides = JSON.parse(fs.readFileSync("content/ckad-curriculum.json"));
assert.equal(
  source.source.revision,
  "d7b9a5c28b2ff2d8a8fab5524569956f21aaa1b4",
  "Review recipe mappings before changing the upstream snapshot",
);
const topics = Object.fromEntries(source.topics.map((t) => [t.id, t.title]));
const icons = {
  "core-concepts": "pod",
  "multi-container-pods": "pod",
  "pod-design": "deploy",
  configuration: "cm",
  observability: "pod",
  "services-networking": "svc",
  "state-persistence": "pvc",
  helm: "helm",
  "custom-resources": "kubernetes",
  "container-images": "pod",
};
const descriptions = {
  "core-concepts": [
    "kubectl request",
    "Pod specification",
    "Container process",
    "Observed result",
  ],
  "multi-container-pods": [
    "Pod configuration",
    "First container",
    "Second container",
    "Shared behavior",
  ],
  "pod-design": [
    "Desired configuration",
    "Workload controller",
    "Managed Pods",
    "Reconciled result",
  ],
  configuration: [
    "Configuration object",
    "Workload reference",
    "Container environment",
    "Verified consumption",
  ],
  observability: [
    "Workload",
    "Health or log signal",
    "Observed evidence",
    "Diagnosis",
  ],
  "services-networking": [
    "Client request",
    "Service or routing rule",
    "Selected endpoint",
    "HTTP response",
  ],
  "state-persistence": [
    "Pod mount",
    "Storage reference",
    "Volume data",
    "Read-back check",
  ],
  helm: [
    "Chart and values",
    "Rendered manifest",
    "Helm release",
    "Running resources",
  ],
  "custom-resources": [
    "CRD schema",
    "Registered API",
    "Custom resource",
    "Validated fields",
  ],
  "container-images": [
    "Build recipe",
    "Image layers",
    "Container or registry",
    "Runtime check",
  ],
  curriculum: [
    "Starting configuration",
    "Targeted change",
    "Observed behavior",
    "Verification",
  ],
};
const newMissions = [];
const labs = {};
for (const r of recipes.sort((a, b) => a.i - b.i)) {
  const original = r.i < 152 ? source.exercises[r.i] : guides[r.i - 152];
  assert.ok(original);
  const id = original.id;
  assert.ok(!labs[id]);
  const topic = original.topic || "curriculum";
  const namespace = r.namespace || "quest";
  const objectives = r.checks.map((c) => c.label);
  const terms = descriptions[topic];
  const visual = {
    title: r.title + " — how the pieces connect",
    summary: r.why,
    nodes: terms.map((label, i) => ({
      icon:
        i === 0 ? "ui-terminal" : i === 3 ? "ui-check" : icons[topic] || "pod",
      label,
      note:
        i === 0
          ? "Inspect the starting state"
          : i === 3
            ? "Check the result"
            : i === 1
              ? "Apply the task’s change"
              : "Observe the effect",
      detail:
        i === 0
          ? r.brief || original.title
          : i === 3
            ? objectives.join(". ")
            : r.why,
    })),
    edges: [
      { from: 0, to: 1, label: "configure" },
      { from: 1, to: 2, label: "produce or expose" },
      { from: 2, to: 3, label: "inspect evidence" },
    ],
  };
  visual.contrast = {
    label: "Before completing the task",
    summary:
      "The starting environment is supplied, but the requested result has not yet been verified. Complete the task and inspect its evidence.",
    focus: [3],
    blocked: [2],
    parts: {
      3: { label: "Result not yet verified", note: "Complete the objective" },
    },
  };
  const mission = {
    id,
    title: r.title,
    tagline: r.tagline,
    icon: icons[topic] || "pod",
    domain: topics[topic] || original.domain,
    minutes: r.i >= 152 ? original.minutes : 12,
    difficulty: "Focused practice",
    brief: r.brief || original.title,
    objectives,
    hints: [
      `Start by inspecting the supplied environment. ${r.brief || original.title}`,
      `Work in ${namespace}; files and command output belong in /home/student. ${r.why}`,
      `Verify each objective before selecting Check my work. ${objectives.join(". ")}.`,
    ],
    solution: r.solution,
    why: r.why,
    docs: original.docs || "https://kubernetes.io/docs/reference/kubectl/",
    starter:
      "# Use the terminal for this task, or write the requested Kubernetes manifest here.\n",
    namespace,
    exercise: true,
    sourceKind: r.sourceKind || "exercise",
    sourceUrl: original.sourceUrl || original.source,
    sourceTitle: original.title,
    sourceLicense: original.license || "MIT",
    licensePath: original.licensePath || "/licenses/ckad-exercises.txt",
    sourceChanges:
      "Adapted into an independently prepared, graded lab. Names, image versions, cleanup timing, and external dependencies are adjusted where stated in the situation. The original exercise remains available through the source link.",
    visual,
    inspect:
      r.inspect || `kubectl get pods,deployments,services,jobs -n ${namespace}`,
  };
  newMissions.push(mission);
  labs[id] = { ...r, id, namespace, inspect: mission.inspect };
}
assert.equal(newMissions.length, 156);
assert.deepEqual(
  recipes.map((r) => r.i),
  Array.from({ length: 156 }, (_, i) => i),
);
for (const [path, value] of [
  [
    "content/exercise-mission-index.json",
    newMissions.map(
      ({ id, title, tagline, domain, namespace, sourceKind }) => ({
        id,
        title,
        tagline,
        domain,
        namespace,
        sourceKind,
      }),
    ),
  ],
  ["content/exercise-missions.json", newMissions],
  ["server/exercise-labs.json", labs],
]) {
  const out = JSON.stringify(value, null, 2) + "\n";
  if (process.argv.includes("--check"))
    assert.equal(fs.readFileSync(path, "utf8"), out, path + " is stale");
  else fs.writeFileSync(path, out);
}
console.log(
  "156 independently prepared lab definitions and public mission descriptions " +
    (process.argv.includes("--check") ? "verified" : "generated"),
);
