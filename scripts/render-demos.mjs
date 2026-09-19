import { missions } from "../content/missions.ts";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(execFile);
const input = process.argv[2] || "work/qa",
  output = "public/demos";
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_BIN || undefined,
});
const page = await browser.newPage({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1,
});
const esc = (s) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const t = (sec) => new Date(sec * 1000).toISOString().slice(11, 23);
for (const file of (await fs.readdir(input)).filter((f) =>
  f.endsWith(".json"),
)) {
  const j = JSON.parse(await fs.readFile(path.join(input, file), "utf8"));
  if (!j.after?.every((c) => c.passed)) continue;
  const dir = "work/video-" + j.mission;
  await fs.mkdir(dir, { recursive: true });
  const steps = [];
  for (const entry of j.transcript) {
    const cmds = entry.command.split("\n");
    for (let i = 0; i < cmds.length; i += 19) {
      steps.push({
        title: entry.title + (i ? " · continued" : ""),
        command: cmds.slice(i, i + 19).join("\n"),
        output: i + 19 >= cmds.length ? entry.output : "",
      });
    }
  }
  const mission = missions.find((m) => m.id === j.mission);
  steps.push({
    title: "Why the repair works",
    command: "Explanation",
    output: mission.why,
  });
  const captions = ["WEBVTT", ""];
  let transcript =
    j.title +
    "\n\nActual commands and output captured in a disposable KubeQuest Kubernetes lab. Video is a condensed replay; the full transcript follows.\n\n";
  for (const s of j.transcript)
    transcript += s.title + "\n$ " + s.command + "\n" + s.output + "\n\n";
  transcript += "Why the repair works\n" + mission.why + "\n";
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    let out = s.output.split("\n");
    const room = 29 - s.command.split("\n").length;
    if (out.length > room)
      out = [
        ...out.slice(0, Math.max(1, room - 4)),
        "… output excerpt; full transcript is available below the video …",
        ...out.slice(-3),
      ];
    const isGrade = s.title.includes("behavioral");
    await page.setContent(
      `<!doctype html><html><head><style>*{box-sizing:border-box}body{margin:0;background:#101d32;color:#dce8f5;font-family:Arial,sans-serif;padding:36px 45px}.top{display:flex;align-items:center;gap:15px;font-size:13px;letter-spacing:2px;color:#9bb4cf}.top img{width:38px;height:38px}.top span{margin-left:auto;color:#90b79b;font-size:11px}h1{font-size:31px;letter-spacing:-.8px;margin:21px 0 8px}.subtitle{font-size:15px;color:#9eb4cc;margin-bottom:23px}.terminal{padding:23px 26px;background:#0b1424;border:1px solid #30425c;border-radius:7px;height:477px;overflow:hidden;font-family:Consolas,monospace;font-size:14px;line-height:1.4;white-space:pre-wrap;overflow-wrap:anywhere}.cmd{color:#bee1bc}.out{color:${isGrade ? "#a1dab0" : "#afc0d5"};margin-top:13px}.bottom{display:flex;justify-content:space-between;font-size:11px;color:#8fa4bc;margin-top:18px}.track{position:absolute;bottom:0;left:0;width:${((i + 1) / steps.length) * 100}%;height:5px;background:#7da48a}</style></head><body><div class="top"><img src="http://127.0.0.1:4340/icons/kubernetes.svg"/>KUBEQUEST / REAL LAB WALKTHROUGH<span>ACTUAL TERMINAL OUTPUT · CONDENSED REPLAY</span></div><h1>${esc(j.title)}</h1><div class="subtitle">${String(i + 1).padStart(2, "0")} / ${esc(s.title)}</div><div class="terminal"><div class="cmd">$ ${esc(s.command)}</div><div class="out">${esc(out.join("\n"))}</div></div><div class="bottom"><span>Kubernetes 1.35 · namespace quest · disposable lab</span><span>${i + 1} / ${steps.length} · Pause to inspect a command</span></div><div class="track"></div></body></html>`,
    );
    await page.locator("img").evaluate((img) => img.decode());
    await page.screenshot({ path: `${dir}/${i}.png` });
    captions.push(
      `${t(i * 8)} --> ${t((i + 1) * 8)}`,
      s.title.includes("Why")
        ? mission.why
        : s.title +
            ". " +
            (isGrade
              ? "All four checks pass against real cluster state."
              : "Commands and output shown here were captured from the actual lab."),
      "",
    );
  }
  const concat =
    steps
      .map((_, i) => `file '${path.resolve(dir, i + ".png")}'\nduration 8`)
      .join("\n") +
    `\nfile '${path.resolve(dir, steps.length - 1 + ".png")}'\n`;
  await fs.writeFile(dir + "/frames.txt", concat);
  await exec("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    dir + "/frames.txt",
    "-t",
    String(steps.length * 8),
    "-vf",
    "fps=24",
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "24",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    output + "/" + j.mission + ".mp4",
  ]);
  await fs.writeFile(output + "/" + j.mission + ".vtt", captions.join("\n"));
  await fs.writeFile(output + "/" + j.mission + ".txt", transcript);
  console.log(
    "Created captioned walkthrough:",
    j.mission,
    steps.length * 8 + "s",
  );
}
await browser.close();
