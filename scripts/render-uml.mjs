import fs from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const version = "1.2026.8",
  expected = "5e1ecfa8ecd32c90b03bbf3b1eb6f020943f98ab0fcf4032be31a0002ee2c462";
const hash = (buffer) => createHash("sha256").update(buffer).digest("hex");
const jar = process.env.PLANTUML_JAR || ".tools/plantuml.jar";
fs.mkdirSync(".tools", { recursive: true });
if (!fs.existsSync(jar)) {
  const r = await fetch(
    `https://github.com/plantuml/plantuml/releases/download/v${version}/plantuml.jar`,
  );
  if (!r.ok) throw Error("PlantUML download failed");
  fs.writeFileSync(jar, Buffer.from(await r.arrayBuffer()));
}
if (hash(fs.readFileSync(jar)) !== expected)
  throw Error("PlantUML checksum mismatch");
const dir = "docs/wiki/diagrams",
  sources = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".puml"))
    .sort();
execFileSync(
  process.env.JAVA_PATH || "java",
  [
    "-Djava.awt.headless=true",
    "-jar",
    jar,
    "-tsvg",
    "-nometadata",
    "-failfast2",
    ...sources.map((f) => dir + "/" + f),
  ],
  {
    stdio: "inherit",
    env: { ...process.env, PLANTUML_SECURITY_PROFILE: "SECURE" },
  },
);
const manifest = {
  plantuml: version,
  jarSha256: expected,
  diagrams: sources.map((source) => ({
    source,
    sourceSha256: hash(fs.readFileSync(dir + "/" + source)),
    svg: source.replace(".puml", ".svg"),
    svgSha256: hash(
      fs.readFileSync(dir + "/" + source.replace(".puml", ".svg")),
    ),
  })),
};
for (const d of manifest.diagrams) {
  const svg = fs.readFileSync(dir + "/" + d.svg, "utf8");
  if (!svg.includes("<svg") || svg.includes("Syntax Error?"))
    throw Error("Invalid render " + d.source);
}
fs.writeFileSync(
  dir + "/manifest.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  `Rendered and hashed ${sources.length} UML diagrams with PlantUML ${version}.`,
);
