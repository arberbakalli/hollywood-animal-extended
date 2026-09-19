import { describe, test, expect, beforeAll } from '@jest/globals';
import { loadGameData, loadLegacyScript } from './helpers/legacyHarness.js';

let gameData;
let h;

beforeAll(async () => {
  gameData = await loadGameData();
  h = await loadLegacyScript();
});

/**
 * Edge cases for the distribution grid.
 *
 * These drive the real weeklyDemandFor() out of src/marketing/distributionPlanner.js.
 * They previously asserted against a local copy of the formula declared in this
 * file, so a regression in the planner could not fail them. Expected values are
 * unchanged; only the function under test is now the shipped one.
 */
describe('Distribution calculator — edge cases', () => {
  // No studio policy and no holiday: these pin the base curve on its own.
  const weeklyDemand = score =>
    h.call('HACDistributionPlanner.weeklyDemandFor', score, {
      behemoth: false,
      boutique: false,
      artisticScore: 0,
      openingMultiplier: 1,
      holidayBonusPercent: 0
    });

  test('score 0 produces zero demand all weeks', () => {
    const demand = weeklyDemand(0);
    expect(demand).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });

  test('score 0.5 rounds correctly', () => {
    const demand = weeklyDemand(0.5);
    expect(demand[0]).toBe(1000);
    expect(demand[1]).toBe(500);
  });

  test('score 10 (max) produces high demand', () => {
    const demand = weeklyDemand(10);
    expect(demand[0]).toBe(20000);
    expect(demand[1]).toBe(10000);
    expect(demand[2]).toBe(8000);
    expect(demand[7]).toBeCloseTo(2621, -1);
  });

  test('score 5 matches golden master', () => {
    const demand = weeklyDemand(5);
    expect(demand).toEqual([10000, 5000, 4000, 3200, 2560, 2048, 1638, 1310]);
  });

  test('decay is approximately 80% per week', () => {
    const demand = weeklyDemand(5);
    for (let i = 2; i < 8; i++) {
      const ratio = demand[i] / demand[i - 1];
      expect(ratio).toBeCloseTo(0.8, 1);
    }
  });

  test('distribution constants match data.js', () => {
    const config = gameData.constants.DISTRIBUTION;
    expect(config.multipliers.BASE).toBe(1000);
    expect(config.multipliers.WEEK_ONE).toBe(2);
    expect(config.multipliers.WEEK_TWO).toBe(1);
    expect(config.weeklyCalculation.WEEKLY_REDUCTION_RATE).toBe(0.8);
  });

  test('own + rented always equals demand', () => {
    const scores = [0, 0.5, 2.5, 5, 10];
    const owned = 3185;

    scores.forEach(score => {
      const demand = weeklyDemand(score);
      demand.forEach((d) => {
        const fromOwned = Math.min(d, owned);
        const rented = Math.max(0, d - owned);
        expect(fromOwned + rented).toBe(d);
      });
    });
  });
});
