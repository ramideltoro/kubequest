# Content authoring

Lessons, missions, diagrams and recordings are reviewed source content. A learner should understand the problem, make a prediction, observe evidence, and receive an explanation that connects the change to the result.

## Beginner lessons

Add a stable entry to `content/lessons.ts` with a unique ID, title/subtitle, objectives, plain-language problem, explanations, interaction instructions, why-it-happened explanation, analogy limits, glossary, optional code, understanding check and official documentation link.

Add the corresponding interaction in `src/simulations.tsx`. Provide native buttons or labeled controls, keyboard operation, a textual state explanation and useful feedback. Label it a **browser simulation**. Avoid introducing a technical term before explaining it. Keep Little Notes as the common example. A correct quiz answer should test the concept, not memorization of a command.

Stable IDs are used in saved progress. If a lesson must be replaced, plan how old progress should appear rather than silently reusing an ID for unrelated content.

## CKAD missions

1. Add the incident, objectives, curriculum mapping, modes/duration, hints, starter YAML, solution and explanation in `content/missions.ts`.
2. Add the broken initial state and authored validation in `server/scenarios.ts`.
3. Use only images available in the isolated lab template; update template preloading when required.
4. Check both object configuration and meaningful runtime behavior.
5. Qualify baseline failure, the documented repair, a valid alternative and a superficial/incomplete repair.
6. Record real successful output and create the MP4, VTT captions and transcript under `public/demos/` with `scripts/render-demos.mjs`.
7. Update curriculum coverage and these wiki pages. State what remains outside the pilot.

Grading should validate the intended outcome without rejecting harmless alternative names, equivalent resource units or valid named ports. Do not let an AI answer determine pass/fail.

## Artwork

Use the official [Kubernetes resource icons](https://github.com/kubernetes/community/tree/main/icons) and [CNCF artwork](https://github.com/cncf/artwork). Other technology artwork must come from its vendor. Preserve colors, proportions and approved variants; do not recolor official logos for the amber theme. Keep source URLs, licensing notes and hashes in `public/icons/sources.json`. Use Lucide for interface actions. KubeQuest itself is a plain text wordmark.

## Wiki and UML

Markdown pages live in `docs/wiki/`; add new pages to the chapter list in `src/Wiki.tsx`. Use relative `Page-name.md` links for internal chapters. Images use `diagrams/name.svg`. Each diagram has a matching `.puml` source. The renderer uses a pinned PlantUML version and checksum and local Java 21 or newer.

```sh
npm run docs:render
npm run docs:check
npm run build
```

Set `JAVA_PATH` to a Java executable if it is not on PATH. `PLANTUML_JAR` may point to an already-downloaded jar with the required checksum. The renderer records source and SVG hashes in `docs/wiki/diagrams/manifest.json`. CI fails if either changes without a corresponding validated render. Diagram text is an implementation model, not a claim to observe current runtime state.

The build copies diagram SVGs and editable UML sources into the public wiki asset directory. No wiki database or manual publication step is required.

## Review checklist

Read the lesson as a beginner, operate it using only the keyboard, check the small-screen layout, confirm correct terminology, verify source/license records, and compare each recording with the actual exercise. For changed backend behavior, add a meaningful regression check and run real-lab qualification when the VM, manifests or graders are affected.
