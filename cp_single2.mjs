import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto('http://localhost:8080/client-portal/services?category=Take+Off', { waitUntil:'domcontentloaded' }).catch(()=>{});
await page.waitForTimeout(2500);
const trigger = page.locator('button:has-text("All university of interest")').first();
await trigger.click().catch(()=>{});
await page.waitForTimeout(300);
const opts = (await page.locator('[role="option"]').allInnerTexts().catch(()=>[])).slice(1, 12);
await page.keyboard.press('Escape').catch(()=>{});
let found=null;
for (const o of opts) {
  await trigger.click().catch(()=>{});
  await page.waitForTimeout(150);
  const opt = page.locator('[role="option"]', { hasText: o }).first();
  if (!(await opt.count())) { await page.keyboard.press('Escape').catch(()=>{}); continue; }
  await opt.click().catch(()=>{});
  await page.waitForTimeout(350);
  const n = await page.locator('button[aria-pressed]').count();
  if (n === 1) { found = o; break; }
}
console.log('SINGLE FILTER:', found || 'none-in-first-11');
await page.waitForTimeout(300);
await page.screenshot({ path:'/tmp/cp_single.png', clip:{ x: 760, y: 150, width: 660, height: 540 } });
await browser.close();
