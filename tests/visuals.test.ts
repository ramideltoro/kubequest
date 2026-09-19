import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { foundations } from "../content/foundations.ts";
import { lessons } from "../content/lessons.ts";
import { missions } from "../content/missions.ts";
import { visuals } from "../content/visuals.ts";

test("Every lesson and mission has a connected, readable visual explanation", () => {
  for (const item of [...foundations, ...lessons, ...missions]) {
    const visual = visuals[item.id];
    assert.ok(visual, `Missing diagram: ${item.id}`);
    assert.equal(visual.nodes.length, 4, item.id);
    assert.ok(visual.contrast?.summary, `Missing comparison: ${item.id}`);
  }
  const uiIcons = new Set([
    "ui-file",
    "ui-shield",
    "ui-lock",
    "ui-gauge",
    "ui-backup",
    "ui-box",
    "ui-terminal",
    "ui-book",
    "ui-check",
    "ui-package",
    "ui-app",
    "ui-browser",
    "ui-server",
    "ui-data",
    "ui-network",
    "ui-git",
    "ui-pipeline",
    "ui-settings",
    "ui-activity",
  ]);
  for (const [id, visual] of Object.entries(visuals)) {
    assert.ok(visual.title && visual.summary, id);
    for (const node of visual.nodes) {
      assert.ok(node.label && node.note && node.detail, id);
      assert.ok(
        uiIcons.has(node.icon) ||
          fs.existsSync(`public/icons/${node.icon}.svg`),
        `${id}: missing icon ${node.icon}`,
      );
    }
    for (const edge of visual.edges) {
      assert.ok(
        visual.nodes[edge.from] && visual.nodes[edge.to],
        `${id}: dangling connection`,
      );
      assert.notEqual(edge.from, edge.to, `${id}: unexplained self-connection`);
      assert.ok(edge.label, `${id}: unlabeled connection`);
    }
    for (const [index, change] of Object.entries(visual.contrast?.parts ?? {})) {
      assert.ok(visual.nodes[Number(index)], `${id}: invalid comparison part`);
      assert.ok(change.label || change.note, `${id}: empty comparison part`);
    }
    for (const index of visual.contrast?.blocked ?? [])
      assert.ok(visual.edges[index], `${id}: invalid blocked relationship`);
    for (const index of visual.contrast?.focus ?? [])
      assert.ok(visual.nodes[index], `${id}: invalid focus`);
  }
});
test("Official technology artwork used by the diagrams matches the recorded source hashes", () => {
  const sources = JSON.parse(
    fs.readFileSync("public/icons/sources.json", "utf8"),
  );
  const used = new Set(
    Object.values(visuals)
      .flatMap((v) => v.nodes.map((n) => n.icon))
      .filter((i) => !i.startsWith("ui-")),
  );
  for (const name of used) {
    const source = sources.find((s: { name: string }) => s.name === name);
    assert.ok(
      source?.url?.startsWith("https://raw.githubusercontent.com/"),
      name,
    );
    assert.equal(
      createHash("sha256")
        .update(fs.readFileSync(`public/icons/${name}.svg`))
        .digest("hex"),
      source.sha256,
      name,
    );
  }
});
