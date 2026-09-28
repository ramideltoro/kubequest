import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch(
  process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {},
);
const page = await browser.newPage();
const origin = process.env.ORIGIN || "http://127.0.0.1:4340";
try {
  await page.goto(origin + "/ckad/curriculum");
  await page.locator(".curriculum-card").first().waitFor();
  assert.equal(await page.locator(".curriculum-card").count(), 4);
  await page.locator(".curriculum-card").first().click();
  await page.locator(".mission-page video").waitFor();
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
  await page
    .getByRole("link", { name: "All practice labs", exact: true })
    .click();
  await page.getByText("1 / 4 lessons practiced", { exact: true }).waitFor();
  console.log(
    "PASS guided curriculum links to full lab missions and preserves local practice history.",
  );
} finally {
  await browser.close();
}
