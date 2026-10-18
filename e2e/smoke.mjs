// Browser smoke test against the live backend (port 8001) and Vite dev server (5173).
// Run: node e2e/smoke.mjs   (needs google-chrome installed; set E2E_EMAIL / E2E_PASSWORD)
import { chromium } from "playwright-core";

const BASE = process.env.E2E_BASE ?? "http://localhost:5173";
const EMAIL = process.env.E2E_EMAIL ?? "investigator1@example.com";
const PASSWORD = process.env.E2E_PASSWORD;
if (!PASSWORD) throw new Error("set E2E_PASSWORD");

const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", headless: true });
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(`${BASE}/login`);
await page.fill("input[type=email]", EMAIL);
await page.fill("input[type=password]", PASSWORD);
await page.click("button:has-text('Sign in')");
await page.waitForURL(`${BASE}/`, { timeout: 15000 });
await page.waitForSelector("text=Dashboard", { timeout: 15000 });
console.log("dashboard ok");

await page.goto(`${BASE}/alerts`);
await page.waitForSelector("table tbody tr", { timeout: 20000 });
const rows = await page.locator("table tbody tr").count();
const totalText = await page.locator("h1").first().textContent();
console.log(`alerts page ok: ${rows} rows on page, heading "${totalText}"`);
if (rows === 0 || rows > 25) throw new Error(`expected 1..25 rows, got ${rows}`);

await page.click("button:has-text('Open case') >> nth=0");
await page.waitForURL(/\/cases\/\d+/, { timeout: 20000 });
await page.waitForSelector("text=Audit timeline", { timeout: 15000 });
console.log("case page ok:", page.url());

await page.goto(`${BASE}/import`);
await page.waitForSelector("text=Import transactions", { timeout: 15000 });
console.log("import page ok");

if (errors.length) throw new Error("page errors: " + errors.join(" | "));
await browser.close();
console.log("SMOKE PASS");
