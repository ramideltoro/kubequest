import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
import { foundations } from "../content/foundations.ts";
import { lessons } from "../content/lessons.ts";
import { missions } from "../content/missions.ts";
import { visuals } from "../content/visuals.ts";
const origin = process.env.ORIGIN || "http://127.0.0.1:4340";
const browser = await chromium.launch(
  process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {},
);
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  bypassCSP: true,
  reducedMotion: "reduce",
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
fs.mkdirSync("test-results", { recursive: true });
const routes = [
  ...foundations.map((l) => [`/foundations/${l.id}`, l.id]),
  ...lessons.map((l) => [`/basics/${l.id}`, l.id]),
  ...missions.map((m) => [`/ckad/${m.id}`, m.id]),
  ["/", "site-journey"],
  ["/foundations", "path-foundations"],
  ["/basics", "path-basics"],
  ["/ckad", "path-ckad"],
  ["/signin", "site-access"],
  ["/about", "site-privacy"],
  ["/readme", "site-hosting"],
];
try {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1100 });
    for (const [route, id] of routes) {
      await page.goto(origin + route);
      const diagram = page.locator(`[data-visual="${id}"]`);
      await diagram.waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
        false,
        `${route}: overflow at ${width}`,
      );
      const nodes = diagram.locator(".story-node");
      assert.equal(await nodes.count(), 4, id);
      // Keyboard and touch share native buttons; every explanatory part is reachable.
      for (let i = 0; i < 4; i++) {
        await nodes.nth(i).focus();
        await page.keyboard.press("Enter");
        assert.equal(await nodes.nth(i).getAttribute("aria-pressed"), "true");
        assert.equal(
          await diagram.locator(".story-insight p").innerText(),
          visuals[id].nodes[i].detail,
        );
      }
      await diagram
        .getByRole("button", { name: "Next diagram part", exact: true })
        .click();
      assert.equal(await nodes.first().getAttribute("aria-pressed"), "true");
      if (visuals[id].contrast) {
        await diagram
          .getByRole("button", {
            name: visuals[id].contrast.label,
            exact: true,
          })
          .click();
        assert.equal(
          await diagram.locator(".story-insight p").innerText(),
          visuals[id].contrast.summary,
        );
        assert.equal(
          await diagram.locator(".wire-blocked").count(),
          visuals[id].contrast.blocked?.length ?? 0,
        );
      }
      await diagram.locator("summary").click();
      assert.equal(
        await diagram.locator(".story-transcript li").count(),
        visuals[id].edges.length,
      );
      const brokenImages = await diagram
        .locator("img")
        .evaluateAll((images) =>
          images
            .filter((i) => !i.complete || i.naturalWidth === 0)
            .map((i) => i.src),
        );
      assert.deepEqual(brokenImages, [], `${id}: artwork`);
      const overflow = await nodes.evaluateAll((items) =>
        items
          .filter(
            (n) =>
              n.scrollWidth > n.clientWidth + 1 ||
              n.scrollHeight > n.clientHeight + 1,
          )
          .map((n) => n.innerText),
      );
      assert.deepEqual(overflow, [], `${id}: clipped labels at ${width}`);
      if (
        [
          "cicd-pipelines",
          "find-the-app",
          "open-the-right-door",
          "site-access",
          "site-privacy",
          "path-ckad",
        ].includes(id)
      ) {
        const axe = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        assert.deepEqual(
          axe.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => n.target),
          })),
          [],
          `${id}: accessibility at ${width}`,
        );
        // Hide the fixed footer only in captured evidence, so it does not cover a tall figure.
        await diagram.screenshot({
          path: `test-results/diagram-${id}-${width}.png`,
          style: ".footer-strip { visibility: hidden !important; }",
        });
      }
    }
    console.log(`PASS all ${routes.length} visual routes at ${width}px`);
  }
  await page.goto(origin + "/progress");
  assert.equal(await page.locator(".progress-visual").count(), 2);
  assert.equal(await page.locator(".progress-tiles > span").count(), 30);
  if (!process.env.ORIGIN) {
    let mode = "timed";
    await page.route("**/api/me", (r) =>
      r.fulfill({
        json: {
          user: { email: "rami.deltoro@gmail.com", sub: "visual-ui-test" },
          authConfigured: true,
          labAvailable: true,
        },
      }),
    );
    await page.route("**/api/private/session", (r) =>
      r.fulfill({
        json: {
          session: {
            id: "mock-diagram",
            missionId: "lost-in-routing",
            status: "starting",
            mode,
            startedAt: Date.now(),
            expiresAt: Date.now() + 1800000,
          },
        },
      }),
    );
    await page.goto(origin + "/ckad/lost-in-routing");
    await page
      .getByText("Your cluster is getting ready", { exact: true })
      .waitFor();
    assert.equal(
      await page.locator(".visual-story").count(),
      0,
      "Timed attempts must not expose authored assistance diagrams",
    );
    mode = "independent";
    await page.reload();
    await page
      .getByRole("button", { name: "Request optional coaching", exact: true })
      .waitFor();
    assert.equal(await page.locator(".visual-story").count(), 0);
    await page
      .getByRole("button", { name: "Request optional coaching", exact: true })
      .click();
    await page.locator('[data-visual="lost-in-routing"]').waitFor();
  }
  assert.deepEqual(errors, []);
  console.log(
    `PASS ${routes.length * 2} visual route/layout checks, all 38 lesson/mission diagrams, keyboard exploration, comparison states, icon loading, text alternatives, progress charts and assistance-mode boundaries.`,
  );
} finally {
  await browser.close();
}
