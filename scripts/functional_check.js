const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://localhost:8791/parkmap/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const results = {};

  // 1. City switch
  results.initialCity = await page.evaluate(() => PM.state.city);
  await page.click('#city-pill');
  await page.waitForTimeout(200);
  await page.click('.city-modal-row[data-city="umea"]');
  await page.waitForTimeout(900);
  results.afterSwitchCity = await page.evaluate(() => PM.state.city);
  results.umeaFeatureCount = await page.evaluate(() => PM.state.geoData.features.length);

  // switch back to lulea for the rest
  await page.click('#city-pill');
  await page.waitForTimeout(200);
  await page.click('.city-modal-row[data-city="lulea"]');
  await page.waitForTimeout(900);

  // 2. Filter affects map
  results.beforeFilterCount = await page.evaluate(() => PM.map.visibleFeatures().length);
  await page.click('.quickbtn[data-quick="free"]');
  await page.waitForTimeout(300);
  results.afterFreeFilterCount = await page.evaluate(() => PM.map.visibleFeatures().length);
  results.freeFilterActive = await page.evaluate(() => PM.state.activeFilters.has('free'));
  await page.click('.quickbtn[data-quick="free"]'); // toggle off
  await page.waitForTimeout(300);

  // 3. Search
  await page.fill('#search-input', 'Storgatan');
  await page.waitForTimeout(300);
  results.searchResultCount = await page.evaluate(() => PM.map.visibleFeatures().length);
  await page.fill('#search-input', '');
  await page.waitForTimeout(300);

  // 4. Payment link href correctness
  results.payHref = await page.evaluate(() => {
    const f = PM.state.geoData.features.find(f => f.properties.payment_apps && f.properties.payment_apps.length);
    if (!f) return null;
    PM.ui.openCard(f.properties);
    return null;
  });
  await page.waitForTimeout(300);
  results.payButtonHref = await page.evaluate(() => document.querySelector('.pc-pay-btn')?.getAttribute('href') || null);
  results.payButtonText = await page.evaluate(() => document.querySelector('.pc-pay-btn')?.textContent || null);
  results.zoneCopyPresent = await page.evaluate(() => !!document.querySelector('[data-copy]'));
  await page.click('#pc-close');

  // 5. Zone code copy button triggers toast
  const f2 = await page.evaluate(() => {
    const f = PM.state.geoData.features.find(f => f.properties.zone_code);
    PM.ui.openCard(f.properties);
    return f.properties.zone_code;
  });
  await page.waitForTimeout(300);
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.click('[data-copy]');
  await page.waitForTimeout(300);
  results.toastVisibleAfterCopy = await page.evaluate(() => document.getElementById('toast').classList.contains('show'));

  // 6. Mobile bottom sheet presence
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  results.mobileSheetVisible = await page.evaluate(() => getComputedStyle(document.getElementById('bottom-sheet')).display !== 'none');
  results.mobileSidebarHidden = await page.evaluate(() => getComputedStyle(document.getElementById('sidebar')).display === 'none');

  console.log(JSON.stringify(results, null, 2));
  if (errors.length) console.log('ERRORS:', errors);
  await browser.close();
}
main();
