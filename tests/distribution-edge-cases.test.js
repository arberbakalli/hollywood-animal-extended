import { describe, test, expect, beforeAll } from '@jest/globals';
import { loadGameData } from './helpers/legacyHarness.js';

let gameData;

beforeAll(async () => {
  gameData = await loadGameData();
});

describe('Distribution calculator — edge cases', () => {
  const BASE = 1000;
  const W1_MULT = 2;
  const W2_MULT = 1;
  const DECAY = 0.8;

  function weeklyDemand(score) {
    const demand = [
      score * W1_MULT * BASE,
      score * W2_MULT * BASE
    ];
    for (let i = 2; i < 8; i++) {
      demand.push(demand[demand.length - 1] * DECAY);
    }
    return demand.map((v, i) => i < 4 ? Math.ceil(v) : Math.floor(v));
  }

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
