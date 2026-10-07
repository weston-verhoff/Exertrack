// Run after npm run build. Set SANDBOX_PLAYWRIGHT_PATH if Playwright is supplied externally.
const { chromium } = require(process.env.SANDBOX_PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('assert/strict');

async function main() {
  const build = path.resolve(__dirname, '../build');
  const env = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8');
  const url = env.match(/^REACT_APP_SUPABASE_URL\s*=\s*["']?([^\s"']+)/m)?.[1];
  if (!url) throw new Error('REACT_APP_SUPABASE_URL is required for the local auth fixture');
  const authKey = `sb-${new URL(url).hostname.split('.')[0]}-auth-token`;
  const server = http.createServer((req, res) => {
    const filename = path.resolve(build, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (filename !== build && !filename.startsWith(build + path.sep)) { res.writeHead(403).end(); return; }
    const file = fs.existsSync(filename) && fs.statSync(filename).isFile() ? filename : path.join(build, 'index.html');
    res.setHeader('Content-Type', ({ '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' })[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    let backendCalls = 0;
    await context.route(`${url}/**`, route => { backendCalls++; return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); });
    await context.addInitScript(({ authKey }) => {
      const expires = Math.floor(Date.now() / 1000) + 3600;
      const payload = btoa(JSON.stringify({ exp: expires, sub: 'sandbox-owner', role: 'authenticated' }));
      // A local browser fixture, never submitted to a real backend.
      localStorage.setItem(authKey, JSON.stringify({ access_token: `e30.${payload}.fixture`, refresh_token: 'fixture', token_type: 'bearer', expires_at: expires,
        user: { id: 'sandbox-owner', email: 'westonverhoff@gmail.com', user_metadata: { onboarding_completed: true, theme: 'fall' } } }));
      localStorage.setItem('iwyn-theme', 'fall');
      sessionStorage.setItem('iwyn-sandbox-theme', 'neon');
    }, { authKey });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/theme-sandbox`);
    const preview = page.frameLocator('iframe[title="Isolated theme sandbox"]');
    await preview.getByRole('heading', { name: 'Theme sandbox', exact: true }).waitFor();
    const parentBefore = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, image: getComputedStyle(document.body).backgroundImage, background: getComputedStyle(document.body).backgroundColor }));
    assert.equal(parentBefore.theme, 'fall');
    assert.notEqual(parentBefore.image, 'none', 'Generated artwork must outrank global fallbacks in the production document');
    assert.equal(await page.evaluate(() => Array.from(document.styleSheets).some(sheet => Array.from(sheet.cssRules).some(rule => rule.cssText.includes('.sandbox-grid')))), false, 'Sandbox CSS must only load in the iframe');
    const inspect = () => preview.locator('html').evaluate(element => ({ theme: element.dataset.theme, artwork: getComputedStyle(element).getPropertyValue('--image-surface-canvas').trim(), bodyImage: getComputedStyle(document.body).backgroundImage, surface: getComputedStyle(document.querySelector('.color-context--default')).backgroundImage, sheets: Array.from(document.styleSheets).map(sheet => sheet.href) }));
    let state = await inspect();
    assert.equal(state.theme, 'neon');
    assert.equal(state.artwork, 'none');
    assert.equal(state.bodyImage, 'none');
    assert.equal(state.surface, 'none');
    assert.ok(state.sheets.length > 0, 'Production styles loaded');
    await preview.locator('.sandbox-intro select').selectOption('fall');
    assert.notEqual((await inspect()).bodyImage, 'none');
    await preview.locator('.sandbox-intro select').selectOption('neon');
    assert.equal((await inspect()).bodyImage, 'none');
    await preview.getByRole('button', { name: 'Preview drawer', exact: true }).first().click();
    assert.equal(await preview.locator('.drawer-panel').evaluate(element => element.ownerDocument.documentElement.dataset.theme), 'neon');
    assert.equal(await page.locator('.drawer-panel').count(), 0);
    await preview.locator('.drawer-panel').getByRole('button', { name: 'Add Set', exact: true }).click();
    await preview.getByRole('button', { name: 'Close preview', exact: true }).click();
    await preview.locator('#sandbox-screens').scrollIntoViewIfNeeded();
    assert.equal(await preview.locator('#sandbox-screens .workout-card').count(), 5);
    assert.equal(await preview.locator('canvas').count(), 1);
    const chart = preview.locator('canvas');
    await chart.scrollIntoViewIfNeeded();
    const beforeHover = await chart.evaluate(canvas => canvas.toDataURL());
    await chart.hover({ position: { x: 100, y: 120 } });
    await page.waitForTimeout(350);
    assert.notEqual(await chart.evaluate(canvas => canvas.toDataURL()), beforeHover, 'Live chart renders hover/tooltip feedback');
    await preview.locator('#sandbox-screens .workout-details').getByRole('button', { name: 'Add Set', exact: true }).click();
    await preview.locator('#sandbox-screens .workout-details').getByRole('button', { name: 'Duplicate Workout', exact: true }).click();
    await preview.locator('#sandbox-screens .workout-card').first().getByRole('button', { name: 'Delete', exact: true }).click();
    assert.equal(backendCalls, 0, 'Demo actions must not call the backend');
    if (process.env.THEME_AUDIT) {
      const initialPrimary = await preview.locator('html').evaluate(el => getComputedStyle(el).getPropertyValue('--color-interactive-primary'));
      const initialChart = await chart.evaluate(canvas => canvas.toDataURL());
      await preview.getByLabel('primary seed', { exact: true }).fill('#dd66ff');
      await page.waitForTimeout(300);
      const draftPrimary = await preview.locator('html').evaluate(el => getComputedStyle(el).getPropertyValue('--color-interactive-primary'));
      assert.notEqual(draftPrimary, initialPrimary, 'Valid draft updates without changing theme ID');
      assert.notEqual(await chart.evaluate(canvas => canvas.toDataURL()), initialChart, 'Chart refreshes for a same-ID draft');
      await preview.getByLabel('primary seed', { exact: true }).fill('#bad');
      assert.match(await preview.getByRole('alert').innerText(), /last valid palette/);
      assert.equal(await preview.locator('html').evaluate(el => getComputedStyle(el).getPropertyValue('--color-interactive-primary')), draftPrimary);
      await preview.getByRole('button', { name: 'Preview drawer', exact: true }).first().click();
      assert.equal(await preview.locator('.drawer-panel').evaluate(el => getComputedStyle(el).getPropertyValue('--color-interactive-primary')), draftPrimary, 'Portals inherit draft values');
      await preview.getByRole('button', { name: 'Close preview', exact: true }).click();
      await preview.getByRole('button', { name: 'Reset draft', exact: true }).click();
      assert.equal(await preview.locator('html').evaluate(el => getComputedStyle(el).getPropertyValue('--color-interactive-primary')), initialPrimary);
    }
    if (process.env.THEME_CAPTURE_DIR) {
      const output = path.resolve(process.env.THEME_CAPTURE_DIR);
      fs.mkdirSync(output, { recursive: true });
      const capture = await context.newPage();
      await capture.goto(`http://127.0.0.1:${server.address().port}/theme-sandbox/preview`);
      await capture.getByRole('heading', { name: 'Theme sandbox', exact: true }).waitFor();
      capture.on('pageerror', error => errors.push(error.message));
      const themes = process.env.THEME_REVIEW_THEMES?.split(',') ?? await capture.locator('.sandbox-intro select option').evaluateAll(options => options.map(option => option.value));
      const failures = [];
      for (const width of [1440, 390]) {
        await capture.setViewportSize({ width, height: 1000 });
        for (const theme of themes) {
          await capture.locator('.sandbox-intro select').first().selectOption(theme);
          await capture.locator('#sandbox-screens').scrollIntoViewIfNeeded();
          // Let Chart.js finish its palette transition before visual capture.
          await capture.waitForTimeout(1100);
          await capture.locator('#sandbox-screens').screenshot({ path: path.join(output, `${theme}-${width}.png`) });
          const tokens = await capture.locator('html').evaluate(element => {
            const style = getComputedStyle(element);
            return Object.fromEntries(Array.from(style).filter(name => name.startsWith('--')).map(name => [name, style.getPropertyValue(name).trim()]));
          });
          fs.writeFileSync(path.join(output, `${theme}-${width}.json`), JSON.stringify(tokens, null, 2));
          if (process.env.THEME_AUDIT) {
            const staticDifferences = await capture.locator('html').evaluate(root => {
              const saved = root.getAttribute('style');
              const names = Array.from(root.style).filter(name => name.startsWith('--'));
              const probe = document.createElement('span');
              probe.style.display = 'none'; root.appendChild(probe);
              const resolve = name => {
                const property = name.startsWith('--image-') ? 'background-image' : 'color';
                probe.style.setProperty(property, `var(${name})`);
                return getComputedStyle(probe).getPropertyValue(property);
              };
              const draft = Object.fromEntries(names.map(name => [name, resolve(name)]));
              root.removeAttribute('style');
              const differences = names.filter(name => resolve(name) !== draft[name]);
              if (saved !== null) root.setAttribute('style', saved);
              probe.remove();
              return differences;
            });
            assert.deepEqual(staticDifferences, [], `${theme}: generated CSS and draft compiler must agree`);
            const branding = await capture.locator('html').evaluate(el => ({ mode: getComputedStyle(el).colorScheme, mark: getComputedStyle(el).getPropertyValue('--image-brand-mark') }));
            if (branding.mode === 'light') assert.match(branding.mark, /mark-alternate/, `${theme}: readable brand asset`);
            const audit = await capture.locator('html').evaluate(require('./theme-render-audit.cjs'));
            fs.writeFileSync(path.join(output, `${theme}-${width}-audit.json`), JSON.stringify(audit, null, 2));
            console.log(`${theme}/${width}: ${audit.checked} rendered pairs; ${audit.failures.length} failures; ${audit.unsupported.length} compositions for visual inspection`);
            failures.push(...audit.failures.map(failure => ({ theme, width, ...failure })));
            for (const label of ['primary neutral', 'secondary neutral', 'quiet neutral', 'primary positive', 'secondary danger']) {
              const button = capture.getByRole('button', { name: label, exact: true }).first();
              await button.hover();
              await capture.waitForTimeout(150);
              const hovered = await capture.locator('html').evaluate(require('./theme-render-audit.cjs'));
              failures.push(...hovered.failures.map(failure => ({ theme, width, state: `hover ${label}`, ...failure })));
              await capture.mouse.down();
              await capture.waitForTimeout(150);
              const pressed = await capture.locator('html').evaluate(require('./theme-render-audit.cjs'));
              failures.push(...pressed.failures.map(failure => ({ theme, width, state: `pressed ${label}`, ...failure })));
              await capture.mouse.up();
              await button.focus();
              await capture.keyboard.press('Tab');
              await capture.keyboard.press('Shift+Tab');
              assert.notEqual(await button.evaluate(el => getComputedStyle(el).outlineStyle), 'none', `${theme}: focus indicator`);
            }
            // The builder header and primary action have independent role families.
            const separation = await capture.locator('.plan-workout-card').last().evaluate(el => {
              const style = getComputedStyle(el);
              return { emphasis: style.getPropertyValue('--_context-emphasis'), action: style.getPropertyValue('--_context-strong'), paired: style.getPropertyValue('--_context-on-emphasis'), expected: style.getPropertyValue('--color-on-accent-secondary-subtle') };
            });
            assert.notEqual(separation.emphasis, separation.action);
            assert.equal(separation.paired, separation.expected);
            await capture.getByRole('button', { name: 'Preview drawer', exact: true }).first().click();
            const drawerAudit = await capture.locator('html').evaluate(require('./theme-render-audit.cjs'));
            failures.push(...drawerAudit.failures.map(failure => ({ theme, width, state: 'drawer', ...failure })));
            await capture.locator('.drawer-panel').screenshot({ path: path.join(output, `${theme}-${width}-drawer.png`) });
            await capture.getByRole('button', { name: 'Close preview', exact: true }).click();
            await capture.locator('.drawer-panel').waitFor({ state: 'detached' });
          }
        }
      }
      await capture.close();
      assert.deepEqual(failures, [], 'Rendered theme contrast regressions');
    }
    assert.deepEqual(await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, image: getComputedStyle(document.body).backgroundImage, background: getComputedStyle(document.body).backgroundColor })), parentBefore);
    assert.equal(await page.evaluate(() => localStorage.getItem('iwyn-theme')), 'fall');
    assert.equal(backendCalls, 0, 'Draft and all-theme review must not call the backend');
    await page.setViewportSize({ width: 390, height: 844 });
    await preview.locator('#sandbox-screens').scrollIntoViewIfNeeded();
    assert.ok(await preview.locator('body').evaluate(body => body.scrollWidth <= window.innerWidth + 1), 'Preview fits a narrow viewport');
    assert.deepEqual(errors, []);
    console.log('PASS: Fall parent / Neon iframe isolation, theme switching, production cards/chart, drawer portals, local-only actions, narrow viewport');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
