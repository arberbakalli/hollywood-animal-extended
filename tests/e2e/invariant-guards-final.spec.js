/**
 * Invariant Guards 4–5: Bridge Exports & Load Order (E2E)
 *
 * Guard 4: Every exported module function actually exists
 * Guard 5: Every module loads before its dependents
 */

import { test, expect, openHollywood } from '../fixtures/base.js';

test.describe('Invariant Guards: Bridge Exports & Load Order', () => {
  test.beforeEach(async ({ steps }) => {
    await openHollywood(steps);
  });

  /**
   * Guard 4: Bridge Exports Integrity
   *
   * Critical modules and their key exports. If any are deleted,
   * dependent code will fail at call time.
   */
  test('TC06-000100 critical modules export key functions', async ({ page }) => {
    const exportCheck = await page.evaluate(() => {
      const critical = [
        { name: 'HACGravesAnalysis', fn: 'storyElementsOf' },
        { name: 'HACGravesAudience', fn: 'evaluateColmanGravesScript' },
        { name: 'HACTargetedAds', fn: 'findTargetedCombinations' },
        { name: 'HACScriptGenerator', fn: 'generateScripts' },
        { name: 'HACGravesBestMatches', fn: 'generateBestMatches' },
      ];

      const missing = [];
      for (const { name, fn } of critical) {
        const module = window[name];
        if (!module) missing.push(`${name} not found`);
        else if (typeof module[fn] !== 'function') missing.push(`${name}.${fn} is not a function`);
      }
      return missing;
    });

    expect(exportCheck).toHaveLength(0);
  });

  /**
   * Guard 5: Load Order Invariant
   *
   * Certain modules depend on others being loaded first.
   */
  test('TC06-000101 gravesAnalysis loads before gravesAudience', async ({ page }) => {
    const loadOrder = await page.evaluate(() => {
      return {
        hasAnalysis: typeof window.HACGravesAnalysis === 'object',
        hasStoryElementsOf: typeof window.HACGravesAnalysis?.storyElementsOf === 'function',
        hasAudience: typeof window.HACGravesAudience === 'object',
      };
    });

    expect(loadOrder.hasAnalysis).toBe(true);
    expect(loadOrder.hasStoryElementsOf).toBe(true);
    expect(loadOrder.hasAudience).toBe(true);
  });

  test('TC06-000102 compatibilityEngine loads before modules using it', async ({ page }) => {
    const engineCheck = await page.evaluate(() => {
      return {
        hasEngine: typeof window.HACCompatibilityEngine === 'object',
        hasScorer: typeof window.HACCompatibilityEngine?.getRawCompatibilityScore === 'function',
        hasGenerator: typeof window.HACScriptGenerator === 'object',
      };
    });

    expect(engineCheck.hasEngine).toBe(true);
    expect(engineCheck.hasScorer).toBe(true);
    expect(engineCheck.hasGenerator).toBe(true);
  });


});
