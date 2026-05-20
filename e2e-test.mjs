import pw from '/home/tylermayfield/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.js';
const { chromium } = pw;

const BASE = 'http://localhost:3002';
const MGR = '789820';
const EMP = '996976';
const results = [];
const log = (ok, msg) => { results.push({ ok, msg }); console.log(`${ok ? 'PASS' : 'FAIL'}: ${msg}`); };

const browser = await chromium.launch({ executablePath: '/home/tylermayfield/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome' });
const ctx = await browser.newContext();
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

async function shot(name) { await page.screenshot({ path: `/tmp/e2e-${name}.png`, fullPage: true }); }

try {
  // 1. Login page renders
  await page.goto(BASE, { waitUntil: 'networkidle' });
  log(page.url().includes('/login'), `root redirects to /login (url=${page.url()})`);
  log(await page.getByText('Enter your invite code').isVisible(), 'login prompt visible');

  // 2. Invalid code rejected
  await page.fill('input[inputMode="numeric"]', '000000');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(800);
  log(await page.getByText(/invalid code/i).isVisible().catch(() => false), 'invalid code shows error');

  // 3. Manager login
  await page.fill('input[inputMode="numeric"]', '');
  await page.fill('input[inputMode="numeric"]', MGR);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/manager', { timeout: 8000 });
  log(true, 'manager login navigates to /manager');
  await page.waitForTimeout(800);
  await shot('manager-dashboard');

  // capture starting stats
  const readStat = async (label) => {
    const el = page.locator('div.bg-white', { hasText: label }).first();
    const txt = await el.innerText();
    return parseInt(txt.match(/\d+/)?.[0] ?? '0', 10);
  };
  const totalBefore = await readStat('Total Shifts');
  const openBefore = await readStat('Open');
  log(true, `starting stats total=${totalBefore} open=${openBefore}`);

  // 4. Add an OPEN shift via modal
  await page.getByRole('button', { name: 'Add Shift' }).click();
  await page.waitForTimeout(300);
  log(await page.getByRole('heading', { name: 'Add Shift' }).isVisible(), 'shift modal opens');
  await page.fill('input[type="date"]', '2026-05-21');
  await page.fill('input[type="time"] >> nth=0', '09:00');
  await page.fill('input[type="time"] >> nth=1', '17:00');
  await page.fill('input[placeholder="e.g. Bartender, Server"]', 'Server');
  await page.locator('form button[type="submit"]', { hasText: 'Add Shift' }).click();
  await page.waitForTimeout(1200);
  const totalAfter = await readStat('Total Shifts');
  const openAfter = await readStat('Open');
  log(totalAfter === totalBefore + 1, `total shifts incremented ${totalBefore}->${totalAfter}`);
  log(openAfter === openBefore + 1, `open shifts incremented ${openBefore}->${openAfter}`);
  await shot('after-add-shift');

  // 5. Check Uncovered button
  await page.getByRole('button', { name: 'Check Uncovered' }).click();
  await page.waitForTimeout(800);
  const banner = await page.locator('div.bg-blue-50').innerText().catch(() => '');
  log(banner.length > 0, `check-uncovered shows status: "${banner.trim()}"`);

  // 6. Settings page loads
  await page.getByRole('link', { name: 'Settings' }).click();
  await page.waitForURL('**/manager/settings', { timeout: 6000 });
  await page.waitForTimeout(600);
  log(true, 'manager settings page loads');
  await shot('manager-settings');

  // 7. Logout + employee login (claim flow)
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.fill('input[inputMode="numeric"]', EMP);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/board', { timeout: 8000 });
  log(true, 'employee login navigates to /board');
  await page.waitForTimeout(800);
  log(await page.getByRole('heading', { name: 'Open Shifts' }).isVisible(), 'open shifts board visible');
  await shot('employee-board');

  // 8. Claim a shift
  const claimBtn = page.getByRole('button', { name: /claim/i }).first();
  const hasClaim = await claimBtn.isVisible().catch(() => false);
  if (hasClaim) {
    await claimBtn.click();
    await page.waitForTimeout(1200);
    log(await page.getByText(/claimed successfully/i).isVisible().catch(() => false), 'shift claimed successfully');
    await shot('after-claim');
  } else {
    log(false, 'no claimable shift card found on board');
  }

  log(errors.length === 0, `no console/page errors (count=${errors.length})`);
  if (errors.length) console.log('ERRORS:', errors.slice(0, 5));
} catch (e) {
  log(false, `exception: ${e.message}`);
  await shot('failure');
} finally {
  await browser.close();
  const passed = results.filter((r) => r.ok).length;
  console.log(`\n=== ${passed}/${results.length} checks passed ===`);
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}
