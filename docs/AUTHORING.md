# Content and artwork authoring

Beginner lessons are versioned in `content/lessons.ts`. Keep stable IDs so existing progress remains valid. Each lesson includes the problem, objectives, four explanatory paragraphs, an interaction prompt, an explanation of why it behaves that way, a qualified analogy, a glossary, an optional command/YAML example, one knowledge check, and an official documentation link.

The ten lessons use Little Notes as a consistent example. Define unfamiliar words before relying on them. Keep commands optional in this path. Distinguish container restart, Pod replacement, persistent storage, and backup. Never imply that Kubernetes fixes application bugs or guarantees zero downtime.

`src/simulations.tsx` contains the explicit browser simulations. State changes must match the explained concept. They must remain keyboard operable and clearly labeled as simulations. Do not connect anonymous interactions to the backend lab or inference service.

Mission briefs, objectives, hints, solutions, curriculum mapping, and starter examples live in `content/missions.ts`. `server/scenarios.ts` creates their broken initial objects and validates the resulting state. Keep four distinct checks per mission. Evaluate semantics and actual behavior, permitting equivalent valid solutions where consistent with the objective. Never grade by matching the exact command the learner typed.

When changing a mission, run `tests/live-labs.ts` on a disposable lab host with the portal stopped. It boots each mission, confirms the initial failure, executes the authored solution, verifies all checks, exercises a valid alternative and an incomplete repair for every mission, and checks host/LAN/internet isolation. Its recordings contain only practice resources and are not persistent user terminal logging.

Re-record public demonstrations from actual passing lab runs. Keep the complete command transcript and a captioned short MP4. Condensed walkthroughs may omit wait time, but must not invent terminal output. A demo must identify what changed and why it worked. Verify its captions and transcripts match the commands and current mission.

Official resource artwork comes from the Kubernetes community repository; project logos come from CNCF or the vendor. Keep the files unchanged and add URLs and SHA256 hashes to `public/icons/sources.json`. Preserve the accompanying licenses and usage notes. Do not create letter badges or replace official logos with approximations. Use Lucide for ordinary controls; a product logo should identify that product rather than represent an unrelated generic concept.

To render verified captures, copy the mission JSON files from `/var/lib/kubequest/qa` into a local working directory, install FFmpeg and a Playwright Chromium browser (`npx playwright install chromium`), start the portal on port 4340, then run `npm run demo:render -- /path/to/captures`. Set `CHROME_BIN` to use an existing Chrome installation. The renderer reads only passing captures, preserves the complete transcript, and creates local MP4/VTT/TXT files under `public/demos`. Rebuild the frontend to package the new assets.
