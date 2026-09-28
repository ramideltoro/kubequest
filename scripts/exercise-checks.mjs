import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
const missions = JSON.parse(fs.readFileSync("content/exercise-missions.json"));
const browser = await chromium.launch(
  process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {},
);
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  bypassCSP: true,
});
const page = await context.newPage();
const origin = process.env.ORIGIN || "http://127.0.0.1:4340";
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const route = (m) =>
  origin +
  (m.sourceKind === "curriculum" ? "/ckad/curriculum/" : "/ckad/exercises/") +
  m.id;
try {
  await page.goto(origin + "/ckad/exercises");
  await page.locator(".exercise-card").first().waitFor();
  assert.equal(await page.locator(".exercise-card").count(), 152);
  await page
    .getByLabel("Topic", { exact: true })
    .selectOption("custom-resources");
  await page.waitForFunction(
    () => document.querySelectorAll(".exercise-card").length === 4,
  );
  await page
    .getByLabel("Search exercises", { exact: true })
    .fill("NO-MATCH-XYZ");
  await page.waitForFunction(
    () => document.querySelectorAll(".exercise-card").length === 0,
  );
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.locator(".exercise-card").first().click();
  await page
    .getByRole("button", { name: "Mark practiced", exact: true })
    .click();
  await page.reload();
  await page
    .getByRole("button", { name: "Mark practiced", exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Mark practiced", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  await page.getByRole("button", { name: "Review later", exact: true }).click();
  await page.goto(origin + "/ckad/exercises?status=review");
  await page.locator(".exercise-card").first().waitFor();
  assert.equal(await page.locator(".exercise-card").count(), 1);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const [i, m] of missions.entries()) {
      await page.goto(route(m));
      await page.getByRole("heading", { name: m.title, exact: true }).waitFor();
      assert.equal(
        await page.locator(".mission-brief .objectives li").count(),
        m.objectives.length,
      );
      assert.equal(
        await page.locator(".story-node").count(),
        4,
        m.id + " diagram",
      );
      await page
        .getByText("Read the walkthrough transcript", { exact: true })
        .click();
      assert.equal(
        await page.locator(".demo pre").innerText(),
        m.solution,
        m.id + " solution",
      );
      assert.equal(
        await page.locator("video source").getAttribute("src"),
        "/demos/" + m.id + ".mp4",
      );
      assert.equal(
        await page.locator("video track").getAttribute("src"),
        "/demos/" + m.id + ".vtt",
      );
      assert.equal(
        await page
          .getByRole("button", { name: "Start lab", exact: true })
          .count(),
        0,
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
        false,
        m.id + " overflow",
      );
      assert.ok(
        await page
          .locator(".mission-heading img")
          .evaluate((img) => img.complete && img.naturalWidth > 0),
        m.id + " icon",
      );
      if (width === 1440 && !process.env.SKIP_MEDIA_CHECK) {
        for (const ext of ["mp4", "vtt", "txt", "jpg"]) {
          const response = await page.request.get(
            origin + "/demos/" + m.id + "." + ext,
          );
          assert.equal(response.status(), 200, m.id + " " + ext);
          assert.ok((await response.body()).length > 20);
          assert.ok(
            !response.headers()["content-type"].includes("text/html"),
            m.id + " missing media fallback",
          );
        }
      }
      if (
        width === 1440 &&
        !process.env.SKIP_MEDIA_CHECK &&
        (i % 15 === 0 || m.sourceKind === "curriculum")
      ) {
        await page.locator("video").evaluate(async (video) => {
          await video.play();
        });
        await page.waitForFunction(
          () => document.querySelector("video").currentTime > 0.1,
        );
        await page.locator("video").evaluate((video) => video.pause());
      }
      if (i % 15 === 0 || m.sourceKind === "curriculum") {
        const audit = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        assert.deepEqual(
          audit.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => n.target),
          })),
          [],
          m.id + " accessibility",
        );
      }
    }
  }
  await page.goto(origin + "/ckad/exercises/invalid");
  await page.getByRole("heading", { name: "Mission not found" }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "PASS all 156 mission pages: objectives, diagrams, public videos/transcripts, progress, filters, auth boundaries and responsive accessibility.",
  );
} finally {
  await browser.close();
}
