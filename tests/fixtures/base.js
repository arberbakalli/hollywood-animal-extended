import { test as base, expect } from '@playwright/test';
import { baseFixture } from '@civitas-cerebrum/element-interactions';

const configured = baseFixture(base, 'tests/data/page-repository.json', {
  timeout: 30000,
  // index.html pulls Google Fonts in <head>, and Chrome blocks script execution
  // on a pending stylesheet, so app boot waited on an external CDN.
  blockedOrigins: /fonts\.(googleapis|gstatic)\.com/,
});

// appShell.js dispatches 'hollywood:ready' as its last act, after every selector
// context is built AND every listener is bound. Recording it before page scripts
// run lets a test wait on the app's own contract rather than guess at a DOM side
// effect — selectors exist well before the controls that use them are wired.
export const test = configured.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      window.__hollywoodReady = false;
      window.addEventListener('hollywood:ready', () => {
        window.__hollywoodReady = true;
      });
    });
    await use(page);
  },
});

export const openHollywood = async (steps) => {
  await steps.navigateTo('/', { waitUntil: 'domcontentloaded' });

  try {
    await steps.verifyWindowProperty('__hollywoodReady', { truthy: true });
  } catch (error) {
    await steps.refresh();
    await steps.verifyWindowProperty('__hollywoodReady', {
      truthy: true,
      errorMessage: `App did not fire hollywood:ready after navigation or refresh: ${error.message}`,
    });
  }
};

export { expect };
