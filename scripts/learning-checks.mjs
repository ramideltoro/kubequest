import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
const browser = await chromium.launch(
  process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {},
);
const context = await browser.newContext({
  viewport: { width: 1280, height: 1000 },
  bypassCSP: true,
});
const page = await context.newPage(),
  origin = process.env.ORIGIN || "http://127.0.0.1:4340";
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
async function open(id, track = "foundations") {
  await page.goto(origin + "/" + track + "/" + id);
  await page.getByRole("tab", { name: "2 Try it yourself" }).click();
}
const sim = () =>
  page.getByRole("region", { name: "Interactive browser simulation" });
const button = (name) => sim().getByRole("button", { name, exact: true });
async function says(text) {
  await page.waitForFunction(
    (text) =>
      document.querySelector(".experiment-result")?.textContent.includes(text),
    text,
  );
}
try {
  await open("what-is-an-app");
  for (const [job, part] of [
    ["Show the Save button", "Frontend"],
    ["Check who may save a note", "Backend"],
    ["Keep the saved note", "Database"],
  ]) {
    await button(job).click();
    await sim()
      .getByRole("button", { name: new RegExp("^" + part) })
      .click();
  }
  await says("3/3");
  await open("request-and-response");
  await button("Send request").click();
  await says("200 OK");
  await button("Stop application").click();
  await button("Send request").click();
  await says("No app process");
  await button("Start application").click();
  await button("Disconnect database").click();
  await button("Send request").click();
  await says("503");
  await open("http-and-https");
  await sim()
    .getByLabel(/^Method/)
    .selectOption("POST");
  await button("Send request").click();
  await says("201 Created");
  await sim().getByLabel(/^Path/).selectOption("/missing");
  await button("Send request").click();
  await says("404");
  await open("dns-and-addresses");
  await button("Send request").click();
  await says("Name lookup");
  await sim().getByLabel("DNS address").selectOption("correct");
  await button("Send request").click();
  await says("200");
  await open("network-ports");
  await button("Send request").click();
  await says("no app listens");
  await sim().getByLabel("Destination port").selectOption("8080");
  await button("Send request").click();
  await says("200");
  await button("Block firewall").click();
  await button("Send request").click();
  await says("blocked");
  await open("server-processes");
  await button("Start and check application").click();
  await says("runtime is missing");
  await button("Install runtime").click();
  await button("Start and check application").click();
  await says("200");
  await open("deploy-an-app");
  for (const label of [
    "Install runtime",
    "Copy working release v1",
    "Provide configuration",
    "Start and check application",
  ])
    await button(label).click();
  await says("200");
  await button("Copy broken release v2").click();
  await button("Start and check application").click();
  await says("fails its health check");
  await button("Copy working release v1").click();
  await button("Start and check application").click();
  await says("200");
  await open("git-history");
  await sim()
    .getByLabel("Working file on feature branch")
    .fill("Hello friends");
  for (const name of ["Commit change", "Merge into main", "Push main"])
    await button(name).click();
  await says("Production still needs");
  assert(await sim().getByText("Hello — no deployment yet").isVisible());
  await button("Revert on main").click();
  await says("Old history remains");
  await open("build-and-test");
  await button("Run pipeline").click();
  await says("failed");
  await button("Repair save-note bug").click();
  await button("Run pipeline").click();
  await says("Artifact v2");
  await open("cicd-pipelines");
  await button("Run pipeline").click();
  await says("failed");
  assert(await button("Approve and deploy").isDisabled());
  await button("Repair save-note bug").click();
  await button("Run pipeline").click();
  await button("Approve and deploy").click();
  await says("Production now serves");
  await sim().getByLabel("Release passes its live health check").uncheck();
  await button("Run pipeline").click();
  await button("Approve and deploy").click();
  await says("restores v1");
  await open("config-and-environments");
  await button("Provide configuration").click();
  await button("Restart with these settings").click();
  await says("blocked");
  await sim()
    .getByLabel(/^Database/)
    .selectOption("staging");
  await button("Restart with these settings").click();
  await says("200");
  await open("storage-and-backups");
  await button("Save note").click();
  await button("Restart app").click();
  await says("memory was cleared");
  await sim().getByLabel("Use persistent storage instead of memory").check();
  for (const name of [
    "Save note",
    "Restart app",
    "Make backup",
    "Delete note",
    "Restore backup",
  ])
    await button(name).click();
  await says("backup was restored");
  await open("container-packages");
  await button("Start container").click();
  await says("needs the image");
  for (const name of [
    "Build image",
    "Publish image",
    "Pull onto server",
    "Start container",
  ])
    await button(name).click();
  await says("new container");
  await open("traffic-and-copies");
  await button("Send six requests").click();
  await says("3/6");
  await sim().getByLabel("Number of app copies").fill("3");
  await button("Break first copy").click();
  await sim().getByLabel("Route only to ready copies").check();
  await button("Send six requests").click();
  await says("6/6");
  await open("why-orchestration");
  await button("Repair route").click();
  await button("Connect database").click();
  await button("Break a copy").click();
  await button("Enable recovery").click();
  await page.waitForFunction(() =>
    document.querySelector(".playground")?.textContent.includes("2/2 copies"),
  );
  await button("Send request").click();
  await says("200");
  await open("namespaces-and-labels", "basics");
  await sim()
    .getByLabel(/^Namespace/)
    .selectOption("production");
  await button("Remove practice notes Pod").click();
  await says("refuses");
  await sim()
    .getByLabel(/^Namespace/)
    .selectOption("practice");
  await sim().getByLabel("app label").selectOption("notes");
  await button("Remove practice notes Pod").click();
  await says("Production was unaffected");
  await open("resource-budgets", "basics");
  await sim()
    .getByLabel(/Memory request/)
    .fill("640");
  await sim()
    .getByLabel(/Memory limit/)
    .fill("768");
  await button("Schedule and run").click();
  await says("Pending");
  await sim()
    .getByLabel(/Memory request/)
    .fill("256");
  await sim()
    .getByLabel(/Memory limit/)
    .fill("256");
  await button("Schedule and run").click();
  await says("OOMKilled");
  await sim()
    .getByLabel(/Memory limit/)
    .fill("512");
  await button("Schedule and run").click();
  await says("Scheduled and running");
  await open("jobs-that-finish", "basics");
  await button("Run export").click();
  await says("Job completed");
  assert(await button("Run export").isDisabled());
  await button("Fail attempt").click();
  await button("Run export").click();
  await says("Job completed");
  for (const [id, track] of [
    ["read-the-signals", "foundations"],
    ["observe-and-debug", "basics"],
  ]) {
    await open(id, track);
    await sim().getByLabel("Proposed repair").selectOption("probe");
    await button("Apply repair and verify").click();
    await says("requests still fail");
    await sim().getByLabel("Proposed repair").selectOption("port");
    await button("Apply repair and verify").click();
    await says("200");
  }
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const [id, track] of [
      ["cicd-pipelines", "foundations"],
      ["network-ports", "foundations"],
      ["resource-budgets", "basics"],
    ]) {
      await open(id, track);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
        false,
        `${id} overflow at ${width}`,
      );
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      assert.deepEqual(
        result.violations.map((x) => ({
          id: x.id,
          nodes: x.nodes.map((n) => n.target),
        })),
        [],
        `${id} accessibility at ${width}`,
      );
    }
  }
  fs.mkdirSync("test-results", { recursive: true });
  await page.screenshot({
    path: "test-results/resources-interactive-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 950 });
  await open("cicd-pipelines");
  await page.screenshot({
    path: "test-results/pipeline-mobile.png",
    fullPage: true,
  });
  // UI contract tests use explicit mocks. Real-model timing is measured separately
  // on the server; no browser test creates a real lab or bypasses authentication.
  if (!process.env.ORIGIN) {
    const session = {
      id: "mock-coach",
      missionId: "lost-in-routing",
      status: "ready",
      mode: "guided",
      startedAt: Date.now(),
      expiresAt: Date.now() + 1800000,
    };
    await page.route("**/api/me", (r) =>
      r.fulfill({
        json: {
          user: { email: "rami.deltoro@gmail.com", sub: "ui-test" },
          authConfigured: true,
          labAvailable: true,
        },
      }),
    );
    await page.route("**/api/private/session", (r) =>
      r.fulfill({ json: { session } }),
    );
    await page.route("**/api/private/tutor", (r) =>
      r.fulfill({
        contentType: "application/x-ndjson",
        body:
          [
            { type: "status", message: "Preparing answer" },
            { type: "token", text: "Check the selector." },
            {
              type: "done",
              answer: "Check the selector.",
              fallback: false,
              elapsedMs: 100,
              firstTokenMs: 20,
            },
          ]
            .map((x) => JSON.stringify(x))
            .join("\n") + "\n",
      }),
    );
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto(origin + "/ckad/lost-in-routing");
    await page.getByLabel("Question for the tutor").fill("Why?");
    await page.getByRole("button", { name: "Ask", exact: true }).click();
    await page.getByText("Answer ready in 0.1 seconds.").waitFor();
    assert.equal(
      await page.getByLabel("Coach answer", { exact: true }).innerText(),
      "Coach answer\n\nCheck the selector.",
    );
    await page.route("**/api/private/tutor", async (r) => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await r
        .fulfill({
          contentType: "application/x-ndjson",
          body:
            JSON.stringify({
              type: "done",
              answer: "late",
              fallback: false,
              elapsedMs: 3000,
            }) + "\n",
        })
        .catch(() => {});
    });
    await page.getByRole("button", { name: "Ask", exact: true }).click();
    await page.getByRole("button", { name: "Stop answer", exact: true }).click();
    await page
      .getByText("Answer stopped. You can ask another question.")
      .waitFor();
    assert(
      await page.getByRole("button", { name: "Ask", exact: true }).isEnabled(),
    );
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    assert.deepEqual(
      audit.violations.map((x) => ({
        id: x.id,
        nodes: x.nodes.map((n) => n.target),
      })),
      [],
      "Coach accessibility",
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS 20 new lesson experiments, failure/recovery behavior, 9 interactive accessibility layouts and coach UI response/cancel contract.",
  );
} finally {
  await browser.close();
}
