import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
const modules = JSON.parse(fs.readFileSync("content/ckad-curriculum.json"));
const browser = await chromium.launch(
  process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {},
);
const context = await browser.newContext({
  bypassCSP: true,
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const origin = process.env.ORIGIN || "http://127.0.0.1:4340";
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(origin + "/ckad/exercises");
  await page
    .getByRole("link", { name: "Explore guided practice", exact: true })
    .click();
  await page.locator(".curriculum-card").first().waitFor();
  assert.equal(await page.locator(".curriculum-card").count(), 4);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const m of modules) {
      await page.goto(origin + "/ckad/curriculum/" + m.id);
      await page.getByRole("heading", { name: m.title, exact: true }).waitFor();
      assert.equal(await page.locator("#curriculum-solution").count(), 0);
      await page.getByText("Hint 1", { exact: true }).click();
      await page
        .getByRole("button", { name: "Reveal explained solution", exact: true })
        .click();
      await page.locator("#curriculum-solution").waitFor();
      const audit = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      assert.deepEqual(audit.violations, [], m.id + " accessibility");
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        m.id + " overflow",
      );
    }
  }
  await page
    .getByRole("button", { name: "Mark practiced", exact: true })
    .click();
  await page.reload();
  await page.waitForFunction(
    () =>
      document.querySelector('button[aria-pressed="true"]')?.textContent ===
      "Mark practiced",
  );
  await page.getByRole("button", { name: "Review later", exact: true }).click();
  await page
    .getByRole("link", { name: "← Guided practice", exact: true })
    .click();
  await page
    .locator(".curriculum-card")
    .last()
    .getByText("Review later", { exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Search lessons and missions" })
    .click();
  await page.locator("dialog input").fill("JSONPath");
  await page
    .locator("dialog").getByRole("link", { name: /Turn cluster objects into a useful report/ })
    .click();
  await page
    .getByRole("heading", { name: modules[3].title, exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Reset progress", exact: true })
    .click();
  await page.goto(origin + "/ckad/curriculum/missing");
  await page.getByRole("heading", { name: "Lesson not found" }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "Four curriculum lessons: navigation, hints, solutions, progress, search and eight accessibility checks passed.",
  );
} finally {
  await browser.close();
}
