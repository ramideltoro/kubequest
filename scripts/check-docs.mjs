import fs from "node:fs";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const base = "docs/wiki",
  dir = base + "/diagrams",
  manifest = JSON.parse(fs.readFileSync(dir + "/manifest.json", "utf8"));
const hash = (path) =>
  createHash("sha256").update(fs.readFileSync(path)).digest("hex");
const required = [
  "use-case",
  "component",
  "deployment",
  "package",
  "class",
  "object",
  "composite-structure",
  "profile",
  "activity",
  "state-machine",
  "sequence-auth",
  "sequence-lab",
  "sequence-deploy",
  "communication",
  "interaction-overview",
  "timing",
];
for (const name of required) {
  const d = manifest.diagrams.find((d) => d.source === name + ".puml");
  assert(d, "Missing " + name);
  assert.equal(
    hash(dir + "/" + d.source),
    d.sourceSha256,
    "Stale source render " + name,
  );
  assert.equal(hash(dir + "/" + d.svg), d.svgSha256, "Changed SVG " + name);
  const svg = fs.readFileSync(dir + "/" + d.svg, "utf8");
  assert(
    svg.includes("<svg") &&
      !/Syntax Error\?|<script\b|<foreignObject\b|https?:\/\/[^\s"']+\.(?:png|jpg|svg)/i.test(
        svg,
      ),
    "Invalid or non-local SVG " + name,
  );
}
for (const page of fs.readdirSync(base).filter((x) => x.endsWith(".md"))) {
  const source = fs.readFileSync(base + "/" + page, "utf8");
  assert(source.startsWith("# "), "Missing heading " + page);
  for (const match of source.matchAll(/\]\(([^)]+)\)/g)) {
    const link = match[1].split("#")[0];
    if (!link || /^(https?:|mailto:)/.test(link)) continue;
    assert(
      !link.includes("..") && fs.existsSync(base + "/" + link),
      `Broken link ${page}: ${link}`,
    );
  }
}
const index = fs.readFileSync(base + "/UML-diagrams.md", "utf8");
for (const name of required)
  assert(
    index.includes(`diagrams/${name}.svg`) &&
      index.includes(`diagrams/${name}.puml`),
    "Unlisted diagram " + name,
  );
console.log(
  `PASS wiki links, headings and ${required.length} source-verified local UML renders.`,
);
