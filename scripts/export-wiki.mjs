import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import ts from "typescript";
const revision =
  process.env.WIKI_SOURCE_REVISION ||
  process.env.GITHUB_SHA ||
  execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
if (!/^[a-f0-9]{40}$/.test(revision))
  throw Error("A full application commit SHA is required");
const read = (file) =>
  execFileSync("git", ["show", revision + ":" + file], {
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
  });
async function content(file) {
  const source = ts.transpileModule(read(file), {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return import(
    "data:text/javascript;base64," + Buffer.from(source).toString("base64")
  );
}
const { lessons } = await content("content/lessons.ts"),
  { missions } = await content("content/missions.ts");
let hasFoundations = false;
try {
  execFileSync(
    "git",
    ["cat-file", "-e", revision + ":content/foundations.ts"],
    { stdio: "ignore" },
  );
  hasFoundations = true;
} catch {
  /* Historical releases predate this path. */
}
const foundations = hasFoundations
  ? (await content("content/foundations.ts")).foundations
  : [];
let visualLibrary = {};
try {
  execFileSync("git", ["cat-file", "-e", revision + ":content/visuals.ts"], {
    stdio: "ignore",
  });
  visualLibrary = (await content("content/visuals.ts")).visuals;
} catch (error) {
  // Only a missing historical file is optional; malformed new content must fail export.
  if (error.status !== 128 && error.status !== 1) throw error;
}
const overviewPaths = {
  "path-foundations": "/foundations",
  "path-basics": "/basics",
  "path-ckad": "/ckad",
  "site-journey": "/",
  "site-access": "/signin",
  "site-hosting": "/readme",
  "site-privacy": "/about#privacy",
};
const diagramPath = (id) =>
  foundations.some((l) => l.id === id)
    ? "/foundations/" + id
    : lessons.some((l) => l.id === id)
      ? "/basics/" + id
      : missions.some((m) => m.id === id)
        ? "/ckad/" + id
        : overviewPaths[id] || "/";
const routes = [];
for (const file of ["server/index.ts", "server/auth.ts"]) {
  const syntax = ts.createSourceFile(
    file,
    read(file),
    ts.ScriptTarget.Latest,
    true,
  );
  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.expression.getText(syntax) === "app" &&
      ["get", "post", "put", "patch", "delete"].includes(
        node.expression.name.text,
      )
    ) {
      const route = node.arguments[0];
      if (!route || !ts.isStringLiteral(route))
        throw Error(
          "A route needs explicit documentation: " +
            node.getText(syntax).slice(0, 80),
        );
      routes.push({
        method: node.expression.name.text.toUpperCase(),
        path: route.text,
        access: route.text.startsWith("/api/private/")
          ? "Owner only"
          : "Public / OAuth transaction",
        websocket: node.arguments
          .slice(1)
          .some(
            (arg) =>
              ts.isObjectLiteralExpression(arg) &&
              arg.properties.some(
                (p) =>
                  ts.isPropertyAssignment(p) &&
                  p.name.getText(syntax) === "websocket" &&
                  p.initializer.kind === ts.SyntaxKind.TrueKeyword,
              ),
          ),
        source: file,
      });
    }
    ts.forEachChild(node, visit);
  }
  visit(syntax);
}
const pkg = JSON.parse(read("package.json")),
  lock = JSON.parse(read("package-lock.json"));
const dependencies = Object.keys(pkg.dependencies || {})
  .sort()
  .map((name) => ({
    name,
    range: pkg.dependencies[name],
    installed:
      lock.packages?.["node_modules/" + name]?.version || "See lockfile",
  }));
const snapshot = {
  schema: 1,
  sourceRevision: revision,
  sourceUrl: "https://github.com/ramideltoro/kubequest/commit/" + revision,
  sourceRun: process.env.GITHUB_RUN_ID
    ? "https://github.com/ramideltoro/kubequest/actions/runs/" +
      process.env.GITHUB_RUN_ID
    : null,
  generatedAt: execFileSync("git", ["show", "-s", "--format=%cI", revision], {
    encoding: "utf8",
  }).trim(),
  summary: execFileSync("git", ["show", "-s", "--format=%s", revision], {
    encoding: "utf8",
  }).trim(),
  visuals: Object.entries(visualLibrary).map(([id, v]) => ({
    id,
    title: v.title,
    path: diagramPath(id),
    parts: v.nodes.map((n) => n.label),
    connections: v.edges.length,
    comparison: v.contrast?.label || null,
  })),
  routes,
  dependencies,
  foundations: foundations.map((l) => ({
    id: l.id,
    title: l.title,
    minutes: l.minutes,
    objectives: l.learn,
  })),
  lessons: lessons.map((l) => ({
    id: l.id,
    title: l.title,
    minutes: l.minutes,
    objectives: l.learn,
  })),
  missions: missions.map((m) => ({
    id: m.id,
    title: m.title,
    domain: m.domain,
    minutes: m.minutes,
    objectives: m.objectives,
  })),
};
const target = process.env.WIKI_EXPORT_PATH || ".wiki-update/current.json";
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify(snapshot, null, 2) + "\n");
console.log(
  `Exported ${foundations.length} foundation chapters, ${lessons.length} Kubernetes lessons, ${missions.length} missions, ${Object.keys(visualLibrary).length} diagrams and ${routes.length} routes from ${revision}.`,
);
