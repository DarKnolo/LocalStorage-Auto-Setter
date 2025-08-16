const { test, expect, chromium } = require('@playwright/test');
const path = require('path');

let context;
let page;
let extensionId;

async function openPopupPage(ctx) {
  const serviceWorker = ctx.serviceWorkers()[0] || await ctx.waitForEvent('serviceworker');
  if (!serviceWorker) throw new Error('Extension service worker not found');
  extensionId = serviceWorker.url().split('/')[2];
  const popup = await ctx.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  return popup;
}

// Fresh persistent context per test to isolate chrome.storage
test.beforeEach(async () => {
  const pathToExtension = path.resolve('./localstorage-setter');
  context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
    ],
  });
  page = await openPopupPage(context);
});

test.afterEach(async () => {
  await context.close();
});

// Helpers
async function addRule(ui, { pattern, key, value }) {
  await ui.locator('#url-pattern').fill(pattern);
  await ui.locator('#ls-key').fill(key);
  if (value !== undefined) await ui.locator('#ls-value').fill(String(value));
  await ui.getByRole('button', { name: 'Add Rule' }).click();
}

function firstRuleItem(ui) {
  return ui.locator('#enabled-rules-list li, #active-rules-list li').first();
}

async function mockTabsQuery(ui, url) {
  await ui.evaluate((mockUrl) => {
    if (!window.__origTabsQuery) {
      window.__origTabsQuery = chrome.tabs.query.bind(chrome.tabs);
    }
    const responder = (cb) => {
      const result = [{ id: 1, url: mockUrl, lastAccessed: Date.now() }];
      if (typeof cb === 'function') cb(result);
      return result;
    };
    chrome.tabs.query = (queryInfo, callback) => {
      // If callback provided, use callback style
      if (typeof callback === 'function') {
        responder(callback);
        return; // undefined per Chrome API
      }
      // Otherwise, return a promise for await style
      return Promise.resolve(responder());
    };
  }, url);
}

// Tests

test('add rule shows up in list', async () => {
  await addRule(page, { pattern: 'https://example.com/*', key: 'preview_mode', value: 'on' });
  const item = firstRuleItem(page);
  await expect(item).toBeVisible();
  await expect(item).toContainText('https://example.com/*');
  await expect(item).toContainText('preview_mode');
  await expect(item).toContainText('on');
});

test('edit existing rule updates details', async () => {
  await addRule(page, { pattern: 'https://*.original.com/*', key: 'original_key', value: 'original_value' });
  const item = firstRuleItem(page);
  await expect(item).toBeVisible();
  await item.getByRole('button', { name: 'Edit rule' }).click();
  await page.locator('#url-pattern').fill('https://*.edited.com/*');
  await page.locator('#ls-value').fill('new-value');
  await page.getByRole('button', { name: 'Update Rule' }).click();
  await expect(item).toContainText('https://*.edited.com/*');
  await expect(item).toContainText('new-value');
  await expect(item).not.toContainText('original_value');
});

test('delete rule removes it and shows empty state', async () => {
  await addRule(page, { pattern: 'https://deleteme.com/*', key: 'delete-key', value: 'x' });
  const item = firstRuleItem(page);
  await expect(item).toBeVisible();
  await item.getByRole('button', { name: 'Delete rule' }).click();
  await expect(page.locator('#enabled-rules-list li, #active-rules-list li')).toHaveCount(0);
  await expect(page.locator('#no-rules-message')).toBeVisible();
});

test('shows native validation when required fields are empty', async () => {
    await page.getByRole('button', { name: 'Add Rule' }).click();
    await expect(page.locator('#no-rules-message')).toBeVisible();
    const isUrlInputInvalid = await page.locator('#url-pattern').evaluate(el => !el.checkValidity());
    expect(isUrlInputInvalid).toBe(true);
    await page.locator('#url-pattern').fill('https://example.com');
    await page.getByRole('button', { name: 'Add Rule' }).click();
    const isKeyInputInvalid = await page.locator('#ls-key').evaluate(el => !el.checkValidity());
    expect(isKeyInputInvalid).toBe(true);
    await expect(page.locator('#no-rules-message')).toBeVisible();
});

// New: Duplicate/Clone rule

test('duplicate rule clones it and enters edit mode', async () => {
  await addRule(page, { pattern: 'https://dup.com/*', key: 'k', value: 'v' });
  const listBefore = await page.locator('#enabled-rules-list li').count();
  const first = firstRuleItem(page);
  await expect(first).toBeVisible();
  await first.locator('button.copy-btn').click();
  // Toast and edit mode visible
  const dupToast = page.locator('.toast').filter({ hasText: 'Rule duplicated' });
  await expect(dupToast).toBeVisible();
  await expect(page.locator('#cancel-edit-btn')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Update Rule' })).toBeVisible();
  // List count increased by 1
  await expect(page.locator('#enabled-rules-list li')).toHaveCount(listBefore + 1);
});

// New: URL suggestions via mocked current tab

test('URL suggestions show and populate input from current URL', async () => {
  await mockTabsQuery(page, 'https://sub.example.com/path/page');
  await page.locator('#get-current-url-btn').click();
  const dropdown = page.locator('#url-suggestions');
  await expect(dropdown).toBeVisible();
  const items = dropdown.locator('.suggestion-item');
  const count = await items.count();
  expect(count).toBeGreaterThan(1);
  await items.first().click();
  await expect(page.locator('#url-pattern')).not.toBeEmpty();
  await expect(dropdown).not.toBeVisible();
});

// New: Active on This Page grouping (mock current tab URL)

test('rule appears under Active on This Page when it matches current URL', async () => {
  await mockTabsQuery(page, 'https://active.test/site/page');
  await addRule(page, { pattern: 'https://active.test/*', key: 'flag', value: '1' });
  // loadRules runs on add completion, wait for Active container
  const activeContainer = page.locator('#active-rules-container');
  await expect(activeContainer).toBeVisible();
  await expect(page.locator('#active-rules-list li')).toHaveCount(1);
  await expect(page.locator('#active-rules-list li').first()).toContainText('https://active.test/*');
});

// New: Disable and enable a rule

test('disabling and enabling a rule moves it between lists', async () => {
  await addRule(page, { pattern: 'https://toggle.me/*', key: 't', value: '1' });
  // Disable
  let rule = firstRuleItem(page);
  await expect(rule).toBeVisible();
  await rule.locator('button.toggle-btn').click();
  await expect(page.locator('#disabled-rules-list li')).toHaveCount(1);
  await expect(page.locator('#disabled-rules-list li').first()).toContainText('https://toggle.me/*');
  // Enable back
  await page.locator('#disabled-rules-list li').first().locator('button.toggle-btn').click();
  await expect(page.locator('#enabled-rules-list li')).toHaveCount(1);
  await expect(page.locator('#disabled-rules-list li')).toHaveCount(0);
});

// New: Theme switching (prefers-color-scheme)

test('switching between dark and light themes updates styles', async () => {
  // Default (dark) background
  await page.emulateMedia({ colorScheme: 'dark' });
  const darkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  // Light background
  await page.emulateMedia({ colorScheme: 'light' });
  const lightBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(darkBg).not.toBe(lightBg);
});

// New: External support link opens BuyMeACoffee

test('support link opens BuyMeACoffee in a new tab', async () => {
  const [newTab] = await Promise.all([
    context.waitForEvent('page'),
    page.locator('#support-link').click()
  ]);
  await expect.poll(() => newTab.url()).toContain('buymeacoffee.com/darknolo');
});
