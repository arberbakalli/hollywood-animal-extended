import { chromium } from '@playwright/test';

const baseURL = process.env.PERF_URL || 'http://127.0.0.1:4173';
const runCount = Math.max(1, Number(process.env.PERF_RUNS || 5));
const timeoutMs = Math.max(1000, Number(process.env.PERF_TIMEOUT_MS || 20000));
const measureManualApply = process.env.PERF_MANUAL_APPLY !== 'false';

function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
}

async function createContext(browser, seedAlreadyApplied) {
    const context = await browser.newContext();
    await context.addInitScript(seed => {
        if (seed) localStorage.setItem('hac.startingTagsSeeded.v1', 'true');
        window.__perfLongTasks = [];
        try {
            new PerformanceObserver(list => {
                for (const entry of list.getEntries()) {
                    window.__perfLongTasks.push(Math.round(entry.duration));
                }
            }).observe({ type: 'longtask', buffered: true });
        } catch {}
        window.addEventListener('hollywood:ready', () => {
            window.__hollywoodReady = true;
        }, { once: true });
    }, seedAlreadyApplied);
    return context;
}

async function waitForBoot(page) {
    await page.waitForFunction(() => window.__hollywoodReady === true, null, { timeout: timeoutMs });
    return page.evaluate(() => Math.round(performance.getEntriesByName('app:ready')[0]?.startTime ?? 0));
}

async function inspectPage(page) {
    return page.evaluate(() => ({
        domNodes: document.querySelectorAll('*').length,
        selectors: document.querySelectorAll('select.tag-selector').length,
        options: document.querySelectorAll('select.tag-selector option').length,
        excludedRows: document.querySelectorAll('#selectors-container-excluded .select-row').length,
        selectedExclusions: document.querySelectorAll('#selectors-container-excluded select.tag-selector option:checked:not([value=""])').length,
        startupMeasures: performance.getEntriesByType('measure')
            .filter(entry => entry.name.startsWith('startup:'))
            .map(entry => ({ name: entry.name, durationMs: Math.round(entry.duration) })),
        longTasks: window.__perfLongTasks || []
    }));
}

const browser = await chromium.launch({ headless: true });
const runs = [];

try {
    for (let index = 0; index < runCount; index += 1) {
        const firstVisitContext = await createContext(browser, false);
        const firstVisitPage = await firstVisitContext.newPage();
        const pageErrors = [];
        firstVisitPage.setDefaultTimeout(timeoutMs);
        firstVisitPage.on('pageerror', error => pageErrors.push(error.message));
        firstVisitPage.on('console', message => {
            if (message.type() === 'error') pageErrors.push(`console: ${message.text()}`);
        });
        await firstVisitPage.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
        const coldBootMs = await waitForBoot(firstVisitPage);
        const readyTimestamp = await firstVisitPage.evaluate(() => performance.now());
        await firstVisitPage.waitForFunction(() => document.querySelector('#excluded-count')?.textContent.trim() === '193');
        const exclusionsReadyAfterBootMs = Math.round(await firstVisitPage.evaluate(start => performance.now() - start, readyTimestamp));
        const firstVisit = await inspectPage(firstVisitPage);

        await firstVisitPage.reload({ waitUntil: 'domcontentloaded' });
        const warmBootMs = await waitForBoot(firstVisitPage);
        const warmReadyTimestamp = await firstVisitPage.evaluate(() => performance.now());
        await firstVisitPage.waitForFunction(() => document.querySelector('#excluded-count')?.textContent.trim() === '193');
        const warmExclusionsReadyAfterBootMs = Math.round(await firstVisitPage.evaluate(start => performance.now() - start, warmReadyTimestamp));
        const warmVisit = await inspectPage(firstVisitPage);
        await firstVisitContext.close();

        let manualApply = null;
        let manualApplyMs = null;
        let manualLongTasks = [];
        if (measureManualApply) {
            // Separately time the user-triggered path without mixing it into cold boot.
            const manualContext = await createContext(browser, true);
            const manualPage = await manualContext.newPage();
            manualPage.setDefaultTimeout(timeoutMs);
            manualPage.on('pageerror', error => pageErrors.push(error.message));
            manualPage.on('console', message => {
                if (message.type() === 'error') pageErrors.push(`console: ${message.text()}`);
            });
            await manualPage.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
            await waitForBoot(manualPage);
            const beforeManualApply = await inspectPage(manualPage);
            const startedAt = await manualPage.evaluate(() => performance.now());
            await manualPage.locator('#applyStartingTagsButton').click();
            await manualPage.waitForFunction(() => document.querySelector('#excluded-count')?.textContent.trim() === '193');
            manualApplyMs = Math.round(await manualPage.evaluate(start => performance.now() - start, startedAt));
            const afterManualApply = await inspectPage(manualPage);
            manualLongTasks = afterManualApply.longTasks;
            manualApply = {
                domNodes: [beforeManualApply.domNodes, afterManualApply.domNodes],
                options: [beforeManualApply.options, afterManualApply.options],
                selectedExclusions: afterManualApply.selectedExclusions
            };
            await manualContext.close();
        }

        runs.push({
            run: index + 1,
            coldBootMs,
            warmBootMs,
            exclusionsReadyAfterBootMs,
            warmExclusionsReadyAfterBootMs,
            firstRunExclusionsMs: firstVisit.startupMeasures
                .find(entry => entry.name === 'startup:first-run-exclusions')?.durationMs ?? null,
            manualApplyMs,
            firstRun: {
                domNodes: firstVisit.domNodes,
                selectors: firstVisit.selectors,
                options: firstVisit.options,
                excludedRows: firstVisit.excludedRows,
                selectedExclusions: firstVisit.selectedExclusions
            },
            manualApply,
            startupMeasures: firstVisit.startupMeasures,
            maxLongTaskMs: Math.max(0, ...firstVisit.longTasks, ...warmVisit.longTasks, ...manualLongTasks),
            pageErrors
        });
        console.log(`Completed sample ${index + 1}/${runCount}`);
    }
} finally {
    await browser.close();
}

const measureMedians = runs[0].startupMeasures.map(({ name }) => ({
    name,
    durationMs: median(runs.map(run => run.startupMeasures.find(entry => entry.name === name)?.durationMs ?? 0))
}));

console.log(JSON.stringify({
    url: baseURL,
    runs: runs.map(({ run, coldBootMs, warmBootMs, exclusionsReadyAfterBootMs, warmExclusionsReadyAfterBootMs, firstRunExclusionsMs, manualApplyMs, maxLongTaskMs, pageErrors }) => ({
        run,
        coldBootMs,
        warmBootMs,
        exclusionsReadyAfterBootMs,
        warmExclusionsReadyAfterBootMs,
        firstRunExclusionsMs,
        manualApplyMs,
        maxLongTaskMs,
        pageErrors
    })),
    firstRunFootprint: runs[0]?.firstRun,
    manualApplyFootprint: runs[0]?.manualApply,
    medians: {
        coldBootMs: median(runs.map(run => run.coldBootMs)),
        warmBootMs: median(runs.map(run => run.warmBootMs)),
        exclusionsReadyAfterBootMs: median(runs.map(run => run.exclusionsReadyAfterBootMs)),
        warmExclusionsReadyAfterBootMs: median(runs.map(run => run.warmExclusionsReadyAfterBootMs)),
        firstRunExclusionsMs: median(runs.map(run => run.firstRunExclusionsMs ?? 0)),
        manualApplyMs: measureManualApply ? median(runs.map(run => run.manualApplyMs)) : null,
        startupMeasures: measureMedians
    }
}, null, 2));
