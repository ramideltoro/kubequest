import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
const library = JSON.parse(
  fs.readFileSync("content/ckad-exercises.json", "utf8"),
);
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
async function revealSolution() {
  await page
    .getByRole("button", { name: "Reveal solution", exact: true })
    .click();
  await page.locator("#exercise-solution-content").waitFor();
}
async function expectCount(count) {
  await page.waitForFunction(
    (expected) =>
      document.querySelectorAll(".exercise-card").length === expected,
    count,
  );
  assert.equal(await page.locator(".exercise-card").count(), count);
}
try {
  await page.goto(origin + "/ckad");
  await page
    .getByRole("link", { name: "Browse exercises", exact: true })
    .click();
  await page.locator(".exercise-card").first().waitFor();
  await expectCount(152);
  await page
    .getByLabel("Topic", { exact: true })
    .selectOption("custom-resources");
  await expectCount(4);
  await page
    .getByLabel("Search exercises", { exact: true })
    .fill("NO-MATCH-XYZ");
  await expectCount(0);
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.locator(".exercise-card").first().click();
  assert.equal(await page.locator("#exercise-solution-content").count(), 0);
  await revealSolution();
  assert.ok((await page.locator("#exercise-solution-content pre").count()) > 0);
  await page
    .getByRole("button", { name: "Mark practiced", exact: true })
    .click();
  await page.reload();
  assert.equal(
    await page
      .getByRole("button", { name: "Practiced", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  await page.getByRole("button", { name: "Review later", exact: true }).click();
  await page.goto(origin + "/ckad/exercises?status=review");
  await page.locator(".exercise-card").first().waitFor();
  await expectCount(1);
  await page.goto(origin + "/progress");
  await page.getByText(/1 saved for review/).waitFor();
  await page.goto(origin + "/ckad/exercises/invalid");
  await page.getByRole("heading", { name: "Exercise not found" }).waitFor();
  // Every imported exercise must have a reachable, non-empty solution.
  for (const exercise of library.exercises) {
    await page.goto(origin + "/ckad/exercises/" + exercise.id);
    assert.equal(await page.locator("h1").textContent(), exercise.title);
    await revealSolution();
    assert.ok(
      (await page.locator("#exercise-solution-content").innerText()).length >
        20,
    );
  }
  // Topic introductions and every solution fit on a narrow device.
  await page.setViewportSize({ width: 390, height: 844 });
  for (const exercise of library.exercises) {
    await page.goto(origin + "/ckad/exercises/" + exercise.id);
    await revealSolution();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
      exercise.id,
    );
  }
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const path of [
      "/ckad/exercises",
      ...library.topics.map(
        (t) =>
          "/ckad/exercises/" +
          library.exercises.find((e) => e.topic === t.id).id,
      ),
    ]) {
      await page.goto(origin + path);
      if (path !== "/ckad/exercises") await revealSolution();
      else
        await page
          .getByText("How to practice and prepare", { exact: true })
          .click();
      const audit = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      assert.deepEqual(
        audit.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
        [],
        `${width} ${path}`,
      );
    }
  }
  await page.goto(origin + "/ckad/exercises?topic=helm");
  await page.locator(".exercise-card").first().waitFor();
  fs.mkdirSync("test-results", { recursive: true });
  await page.screenshot({
    path: "test-results/exercise-library-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".exercise-card").first().click();
  await revealSolution();
  await page.screenshot({
    path: "test-results/exercise-mobile.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "PASS 152 exercise routes/solutions, filters, progress, responsive layouts and accessibility.",
  );
} finally {
  await browser.close();
}
