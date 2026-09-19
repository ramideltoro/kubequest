import fs from "node:fs";
fs.mkdirSync("public/wiki-assets", { recursive: true });
for (const name of fs.readdirSync("docs/wiki/diagrams"))
  if (/\.(svg|puml)$/.test(name))
    fs.copyFileSync("docs/wiki/diagrams/" + name, "public/wiki-assets/" + name);
