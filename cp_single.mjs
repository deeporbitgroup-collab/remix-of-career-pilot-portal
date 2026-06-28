import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto('http://localhost:8080/client-portal/services?category=Take+Off', { waitUntil:'networkidle' }).catch(()=>{});
await page.waitForTimeout(2500);
// open the university filter (the SelectTrigger with placeholder "Pick from the list")
const trigger = page.locator('button:has-text("All university of interest")').first();
await trigger.click().catch(()=>{});
await page.waitForTimeout(400);
const opts = await page.locator('[role="option"]').allInnerTexts().catch(()=>[]);
console.log('option count:', opts.length, '| sample:', opts.slice(0,6).join(' | '));
let found=null;
for (const o of opts.slice(1)) { // skip "All"
  await trigger.click().catch(()=>{});
  await page.waitForTimeout(200);
  await page.locator('[role="option"]', { hasText: o }).first().click().catch(()=>{});
  await page.waitForTimeout(500);
  const n = await page.locator('button[aria-pressed]').count();
  if (n === 1) { found = o; break; }
}
console.log('single-associate filter:', found);
if (found) { await page.waitForTimeout(400); await page.screenshot({ path:'/tmp/cp_single.png', clip:{ x: 760, y: 150, width: 640, height: 520 } }); }
else { await page.screenshot({ path:'/tmp/cp_single.png', clip:{ x: 760, y: 150, width: 640, height: 520 } }); }
await browser.close();
