const { chromium } = require('playwright');

async function run() {
  const browser = await chromium.launch();
  const errors = [];

  async function capture(viewport, name, actions) {
    const page = await browser.newPage({ viewport });
    page.on('console', msg => { if (msg.type() === 'error') errors.push(`[${name}] ${msg.text()}`); });
    page.on('pageerror', err => errors.push(`[${name}] pageerror: ${err.message}`));
    await page.goto('http://localhost:8791/parkmap/index.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    if (actions) await actions(page);
    await page.screenshot({ path: `E:/MaxinePlatform/docs/parkmap_redesign_shots/${name}.png`, fullPage: false });
    await page.close();
  }

  await capture({ width: 1440, height: 900 }, 'desktop_default');

  await capture({ width: 1440, height: 900 }, 'desktop_card', async (page) => {
    await page.evaluate(() => {
      const f = PM.state.geoData.features.find(f => f.properties.zone_code) || PM.state.geoData.features[0];
      PM.ui.openCard(f.properties);
    });
    await page.waitForTimeout(400);
  });

  await capture({ width: 1440, height: 900 }, 'desktop_sidebar_collapsed', async (page) => {
    await page.click('#sidebar-toggle');
    await page.waitForTimeout(700);
  });

  await capture({ width: 1440, height: 900 }, 'desktop_city_modal', async (page) => {
    await page.click('#city-pill');
    await page.waitForTimeout(300);
  });

  await capture({ width: 390, height: 844 }, 'mobile_default');

  await capture({ width: 390, height: 844 }, 'mobile_sheet_expanded', async (page) => {
    await page.click('.bottom-sheet .sheet-summary');
    await page.waitForTimeout(400);
  });

  await capture({ width: 390, height: 844 }, 'mobile_card', async (page) => {
    await page.evaluate(() => {
      const f = PM.state.geoData.features.find(f => f.properties.zone_code) || PM.state.geoData.features[0];
      PM.ui.openCard(f.properties);
    });
    await page.waitForTimeout(400);
  });

  await capture({ width: 390, height: 844 }, 'mobile_filters', async (page) => {
    await page.click('#chip-filter');
    await page.waitForTimeout(400);
  });

  // Marketing pages
  async function shotPage(url, viewport, name) {
    const page = await browser.newPage({ viewport });
    page.on('console', msg => { if (msg.type() === 'error') errors.push(`[${name}] ${msg.text()}`); });
    page.on('pageerror', err => errors.push(`[${name}] pageerror: ${err.message}`));
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `E:/MaxinePlatform/docs/parkmap_redesign_shots/${name}.png`, fullPage: true });
    await page.close();
  }
  await shotPage('http://localhost:8791/parkmap/about.html', { width: 1280, height: 900 }, 'about_desktop');
  await shotPage('http://localhost:8791/parkmap/coverage.html', { width: 1280, height: 900 }, 'coverage_desktop');
  await shotPage('http://localhost:8791/parkmap/report.html', { width: 1280, height: 900 }, 'report_desktop');

  await browser.close();

  if (errors.length) {
    console.log('CONSOLE/PAGE ERRORS:');
    errors.forEach(e => console.log(e));
  } else {
    console.log('No console/page errors captured.');
  }
}

run();
