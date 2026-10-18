// Checks role badge and logout for admin@gmail.com and qa@gmail.com against the live stack.
import { chromium } from "playwright-core";

const BASE = process.env.E2E_BASE ?? "http://localhost:5173";
const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", headless: true });
for (const [email, password, role] of [["admin@gmail.com", "admin123", "admin"], ["qa@gmail.com", "qa123", "qa"]]) {
  const page = await browser.newPage();
  await page.goto(`${BASE}/login`);
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", password);
  await page.click("button:has-text('Sign in')");
  await page.waitForSelector("[data-testid=role]", { timeout: 15000 });
  const shown = await page.textContent("[data-testid=role]");
  const who = await page.textContent("header");
  if (shown.trim().toLowerCase() !== role) throw new Error(`${email}: role badge "${shown}", want ${role}`);
  if (!who.includes(email)) throw new Error(`${email}: email not in header`);
  console.log(`${email}: badge ${shown.trim()} ok`);
  await page.click("button:has-text('Logout')");
  await page.waitForURL(/\/login/, { timeout: 10000 });
  const token = await page.evaluate(() => sessionStorage.getItem("aml_access_token"));
  if (token) throw new Error("token not cleared on logout");
  console.log(`${email}: logout ok`);
  await page.close();
}
await browser.close();
console.log("HEADER PASS");
