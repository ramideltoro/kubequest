import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
import { lessons as basics } from "../content/lessons.ts";
import { foundations } from "../content/foundations.ts";
const browser = await chromium.launch(
  process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {},
);
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  bypassCSP: true,
});
const page = await context.newPage();
// CSP bypass is test-only: axe injects its audit script; the production policy stays enforced.
const origin = process.env.ORIGIN || "http://127.0.0.1:4340";
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const lessons = [
  ...foundations.map((l) => ["/foundations/" + l.id, l.correct]),
  ...basics.map((l) => ["/basics/" + l.id, l.correct]),
];
try {
  for (const [id, answer] of lessons) {
    await page.goto(origin + id);
    await page.getByRole("tab", { name: "2 Try it yourself" }).click();
    await page
      .getByRole("region", { name: "Interactive browser simulation" })
      .locator('button:not([aria-label="Reset simulation"])')
      .first()
      .click();
    await page.getByRole("tab", { name: "3 Check your understanding" }).click();
    await page
      .locator(".quiz-options button")
      .nth((answer + 1) % 3)
      .click();
    assert(await page.getByText("Let’s think that through.").isVisible());
    await page.locator(".quiz-options button").nth(answer).click();
    await page
      .getByRole("button", { name: "Mark lesson complete", exact: true })
      .click();
    assert(
      await page
        .getByRole("button", { name: "Lesson completed", exact: true })
        .isDisabled(),
    );
  }
  await page.reload();
  assert.equal(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("kubequest-progress")).length,
    ),
    30,
  );
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const path of [
      "/",
      "/foundations",
      "/foundations/cicd-pipelines",
      "/basics",
      "/basics/resource-budgets",
      "/basics/keep-it-running",
      "/ckad",
      "/ckad/lost-in-routing",
      "/signin",
      "/readme",
      "/about",
      "/progress",
    ]) {
      await page.goto(origin + path);
      await page.locator("h1").first().waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
        false,
        `Overflow ${width} ${path}`,
      );
      const audit = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      assert.deepEqual(
        audit.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => ({
            target: n.target,
            summary: n.failureSummary,
          })),
        })),
        [],
        `Accessibility ${width} ${path}`,
      );
    }
  }
  await page
    .getByRole("button", { name: "Search lessons and missions", exact: true })
    .click();
  await page.getByRole("searchbox").fill("endpoints");
  assert.equal(await page.locator(".search-results a").count(), 1);
  await page.getByRole("searchbox").press("Escape");
  await page.locator("dialog").waitFor({ state: "hidden" });
  assert(
    await page
      .getByRole("button", { name: "Search lessons and missions", exact: true })
      .evaluate((el) => el === document.activeElement),
  );
  await page.getByRole("button", { name: "Open site menu" }).click();
  assert(
    await page
      .getByRole("link", { name: "Builds and deployments" })
      .isVisible(),
  );
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(".footer-menu").count(), 0);
  await page.getByRole("link", { name: "Privacy", exact: true }).click();
  await page.locator("#privacy").waitFor();
  assert.equal(new URL(page.url()).hash, "#privacy");
  const wikiLink = page
    .getByRole("navigation", { name: "Footer navigation", exact: true })
    .getByRole("link", { name: "Wiki", exact: true });
  assert.equal(
    await wikiLink.getAttribute("href"),
    "https://ramideltoro.github.io/kubequest-wiki",
  );
  const oldWiki = await page.request.get(origin + "/wiki/Architecture", {
    maxRedirects: 0,
  });
  assert.equal(oldWiki.status(), 308);
  assert.equal(
    oldWiki.headers().location,
    "https://ramideltoro.github.io/kubequest-wiki/Architecture/",
  );
  const response = await page.request.get(origin + "/api/private/session");
  assert.equal(response.status(), 401);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(origin + "/");
  assert.equal(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).colorScheme,
    ),
    "dark",
  );
  fs.mkdirSync("test-results", { recursive: true });
  await page.screenshot({
    path: "test-results/home-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 950 });
  await page.screenshot({
    path: "test-results/home-mobile.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "PASS 30 beginner lessons, saved progress, 36 responsive/accessibility checks, footer search and keyboard controls, privacy route, anonymous protection, dark theme.",
  );
} finally {
  await browser.close();
}
