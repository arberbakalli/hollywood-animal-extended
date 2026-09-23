import { describe, test, expect, beforeAll } from '@jest/globals';
import { loadInstrumentedApp } from './helpers/legacyHarness.js';

describe('Genre mix percentage validation', () => {
  let h;

  beforeAll(async () => {
    h = await loadInstrumentedApp();
  });

  test.each([
    { weights: [1], expected: [100] },
    { weights: [1, 1], expected: [50, 50] },
    { weights: [1, 1, 1, 1], expected: [25, 25, 25, 25] },
    { weights: [1, 1, 1, 1, 1], expected: [20, 20, 20, 20, 20] },
    { weights: [3, 3, 4], expected: [30, 30, 40] },
    { weights: [95, 5], expected: [95, 5] },
  ])('splits genre weights into valid 5% shares: $weights', ({ weights, expected }) => {
    expect(h.call('HACGenreMix.splitGenrePercent', 100, weights)).toEqual(expected);
  });

  test.each([
    [50, [1, 1], 50],
    [95, [1], 95],
    [15, [1, 1, 1], 15],
  ])('split shares always sum to the requested total', (total, weights, expectedTotal) => {
    const split = h.call('HACGenreMix.splitGenrePercent', total, weights);

    expect(split.reduce((sum, share) => sum + share, 0)).toBe(expectedTotal);
    split.forEach(share => {
      expect(share).toBeGreaterThanOrEqual(5);
      expect(share % 5).toBe(0);
    });
  });

  test('applying a genre percent snaps the changed row and redistributes the rest', () => {
    const result = h.evaluate(`(() => {
      const rows = [
        makeRow(62),
        makeRow(20),
        makeRow(20)
      ];

      function makeRow(value) {
        const input = { value: String(value) };
        const slider = { value: String(value), style: { setProperty() {} } };
        return {
          input,
          slider,
          querySelector(selector) {
            if (selector === '.percent-input') return input;
            if (selector === '.percent-slider') return slider;
            return null;
          }
        };
      }

      document = {
        getElementById(id) {
          if (id === 'inputs-genre-graves') {
            return { querySelectorAll: selector => selector === '.genre-row' ? rows : [] };
          }
          return null;
        }
      };

      HACGenreMix.applyGenrePercent('graves', rows[0], 62);
      return rows.map(row => Number(row.input.value));
    })()`);

    expect(result).toEqual([60, 20, 20]);
  });

  test('a single genre is forced back to 100%', () => {
    const result = h.evaluate(`(() => {
      const input = { value: '35' };
      const slider = { value: '35', style: { setProperty() {} } };
      const row = {
        querySelector(selector) {
          if (selector === '.percent-input') return input;
          if (selector === '.percent-slider') return slider;
          return null;
        }
      };

      document = {
        getElementById(id) {
          if (id === 'inputs-genre-graves') {
            return { querySelectorAll: selector => selector === '.genre-row' ? [row] : [] };
          }
          return null;
        }
      };

      HACGenreMix.applyGenrePercent('graves', row, 35);
      return Number(input.value);
    })()`);

    expect(result).toBe(100);
  });
});
