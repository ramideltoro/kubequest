import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "content/ckad-upstream");
export const topics = [
  ["core-concepts", "Core concepts", "a.core_concepts.md"],
  ["multi-container-pods", "Multi-container Pods", "b.multi_container_pods.md"],
  ["pod-design", "Pod design", "c.pod_design.md"],
  ["configuration", "Configuration", "d.configuration.md"],
  ["observability", "Observability", "e.observability.md"],
  ["services-networking", "Services and networking", "f.services.md"],
  ["state-persistence", "State persistence", "g.state.md"],
  ["helm", "Helm", "h.helm.md"],
  ["custom-resources", "Custom resources", "i.crd.md"],
  ["container-images", "Container images (Podman)", "j.podman.md"],
];

// Recognize headings only outside fenced code: YAML/shell comments are content.
export function splitHeadings(markdown) {
  const blocks = [];
  let block = { level: 0, title: "", line: 1, lines: [] };
  let fence = null;
  markdown.split(/\r?\n/).forEach((line, i) => {
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length)
        fence = null;
      block.lines.push(line);
      return;
    }
    const heading = !fence && line.match(/^(#{1,3})\s+(.+?)\s*$/);
    if (heading) {
      blocks.push(block);
      block = {
        level: heading[1].length,
        title: heading[2],
        line: i + 1,
        lines: [],
      };
    } else block.lines.push(line);
  });
  blocks.push(block);
  return blocks;
}

// Strip upstream presentation wrappers only outside code, keeping manifests exact.
export function cleanWrappers(markdown) {
  let fence = null;
  return markdown
    .split("\n")
    .map((line) => {
      const marker = line.match(/^\s*(`{3,}|~{3,})/);
      if (marker) {
        if (!fence) fence = marker[1];
        else if (marker[1][0] === fence[0] && marker[1].length >= fence.length)
          fence = null;
        return line;
      }
      if (
        !fence &&
        /^!\[\]\(https:\/\/gaforgithub\.azurewebsites\.net\//.test(line)
      )
        return "";
      return fence
        ? line
        : line
            .replace(/<\/?(?:p|details)\b[^>]*>/gi, "")
            .replace(/<summary>.*?<\/summary>/gi, "")
            .replace(/<br\s*\/?\s*>/gi, "\n");
    })
    .join("\n")
    .trim();
}

export function buildLibrary() {
  const source = JSON.parse(
    fs.readFileSync(path.join(sourceDir, "source.json"), "utf8"),
  );
  const groups = [];
  const exercises = [];
  for (const [id, title, file] of topics) {
    const markdown = fs.readFileSync(path.join(sourceDir, file), "utf8");
    let section = title;
    let context = "";
    const introductions = [];
    for (const block of splitHeadings(markdown)) {
      const body = block.lines.join("\n").trim();
      if (block.level < 3) {
        if (block.level === 2) section = block.title;
        context = cleanWrappers(body);
        if (context)
          introductions.push({
            title: block.title || title,
            markdown: context,
          });
        continue;
      }
      const opening = body.search(/<details\b[^>]*>/i);
      if (opening < 0)
        throw Error(`Exercise missing solution: ${file}:${block.line}`);
      const prompt = cleanWrappers(body.slice(0, opening));
      const solution = cleanWrappers(body.slice(opening));
      if (!solution) throw Error(`Empty solution: ${file}:${block.line}`);
      const digest = createHash("sha256")
        .update(block.title)
        .digest("hex")
        .slice(0, 12);
      exercises.push({
        id: `${id}-${digest}`,
        topic: id,
        title: block.title,
        section,
        prompt,
        context,
        solution,
        sourceUrl: `${source.repository}/blob/${source.revision}/${file}#L${block.line}`,
      });
    }
    groups.push({
      id,
      title,
      file,
      introductions,
      count: exercises.filter((e) => e.topic === id).length,
    });
  }
  if (new Set(exercises.map((e) => e.id)).size !== exercises.length)
    throw Error("Duplicate exercise IDs");
  return { source, topics: groups, exercises };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const library = buildLibrary();
  const index = {
    source: library.source,
    topics: library.topics.map(({ introductions, ...topic }) => topic),
    exercises: library.exercises.map(({ id, title, topic, section }) => ({
      id,
      title,
      topic,
      section,
    })),
  };
  for (const [file, data] of [
    ["ckad-exercises.json", library],
    ["ckad-index.json", index],
  ]) {
    const output = JSON.stringify(data, null, 2) + "\n";
    const target = path.join(root, "content", file);
    if (process.argv.includes("--check")) {
      if (fs.readFileSync(target, "utf8") !== output)
        throw Error(`Stale ${file}; run npm run exercises:import`);
    } else fs.writeFileSync(target, output);
  }
  console.log(
    `${library.exercises.length} exercises across ${library.topics.length} topics; source ${library.source.revision}`,
  );
}
