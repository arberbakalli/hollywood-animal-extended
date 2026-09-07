import { test } from '../fixtures/base.js';

// data.js ships tags: {}, so there is no local fallback. If the story element
// data does not arrive, every panel is an empty shell — the app used to log to
// the console and render that shell anyway.

const TAG_DATA = '**/data/TagData.json';

test.describe('Start-up failure', () => {
  test('TC07-000001 a failed data load is reported instead of an empty app', async ({ steps, page }) => {
    await page.route(TAG_DATA, route => route.abort());

    await steps.navigateTo('/', { waitUntil: 'domcontentloaded' });

    await steps.on('bootError', 'Navigation').verifyState('visible');
    await steps.on('bootErrorDetail', 'Navigation').verifyText();
    await steps.on('retryBootButton', 'Navigation').verifyState('visible');
    // The app must not claim it is ready when it has no data to work with.
    await steps.verifyWindowProperty('__hollywoodReady', { truthy: false });
  });

  test('TC07-000002 retrying after a failure recovers the app', async ({ steps, page }) => {
    await page.route(TAG_DATA, route => route.abort());
    await steps.navigateTo('/', { waitUntil: 'domcontentloaded' });
    await steps.on('bootError', 'Navigation').verifyState('visible');

    await page.unroute(TAG_DATA);
    await steps.on('retryBootButton', 'Navigation').click();

    await steps.verifyWindowProperty('__hollywoodReady', { truthy: true });
    await steps.on('bootError', 'Navigation').verifyState('hidden');
    await steps.on('evaluateTab', 'Navigation').click();
    await steps.on('genreSelect', 'ScriptEvaluation').verifyState('visible');
  });

  test('TC07-000003 a healthy load shows no failure banner', async ({ steps }) => {
    await steps.navigateTo('/', { waitUntil: 'domcontentloaded' });

    await steps.verifyWindowProperty('__hollywoodReady', { truthy: true });
    await steps.on('bootError', 'Navigation').verifyState('hidden');
  });
});
