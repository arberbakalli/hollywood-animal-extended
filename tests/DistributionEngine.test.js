import { describe, it, expect } from '@jest/globals';
import { DistributionEngine } from '../src/core/DistributionEngine.js';

/**
 * Expected values are computed by hand from the original script.js algorithm:
 *
 *   w1 = max(0, score × 2 × 1000 − screenings)   → ceil if index < 4
 *   w2 = max(0, score × 1 × 1000 − screenings)   → ceil if index < 4
 *   w3..w8 = prev × 0.8                           → floor if index >= 4
 *
 * These numbers are the ground-truth; DistributionEngine must produce them.
 */

describe('DistributionEngine.project — length and type', () => {
    it('always returns exactly 8 values', () => {
        expect(DistributionEngine.project(5, 0)).toHaveLength(8);
    });

    it('all values are integers', () => {
        const results = DistributionEngine.project(7.3, 1500);
        results.forEach(v => expect(Number.isInteger(v)).toBe(true));
    });

    it('all values are non-negative', () => {
        DistributionEngine.project(0, 5000).forEach(v => expect(v).toBeGreaterThanOrEqual(0));
    });
});

describe('DistributionEngine.project — zero score', () => {
    it('returns all zeros when score is 0', () => {
        expect(DistributionEngine.project(0, 0)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    });

    it('returns all zeros when screenings exceed gross', () => {
        // score=1 → w1=2000, w2=1000 — both eaten by 9999 screenings
        expect(DistributionEngine.project(1, 9999)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    });
});

describe('DistributionEngine.project — score=5, screenings=0', () => {
    // w1=10000, w2=5000, w3=4000, w4=3200, w5=2560, w6=2048, w7=1638.4→floor=1638, w8=1310.72→floor=1310
    it('matches hand-computed values', () => {
        expect(DistributionEngine.project(5, 0)).toEqual([10000, 5000, 4000, 3200, 2560, 2048, 1638, 1310]);
    });
});

describe('DistributionEngine.project — score=5, screenings=3185 (HTML default)', () => {
    // w1=max(0,10000-3185)=6815, w2=max(0,5000-3185)=1815
    // w3=1815×0.8=1452, w4=1452×0.8=1161.6→ceil=1162
    // w5=1161.6×0.8=929.28→floor=929, w6=929.28×0.8=743.424→floor=743
    // w7=743.424×0.8=594.7392→floor=594, w8=594.7392×0.8=475.791→floor=475
    it('matches hand-computed values', () => {
        expect(DistributionEngine.project(5, 3185)).toEqual([6815, 1815, 1452, 1162, 929, 743, 594, 475]);
    });
});

describe('DistributionEngine.project — score=10, screenings=0', () => {
    // w1=20000, w2=10000, w3=8000, w4=6400, w5=5120, w6=4096, w7=3276.8→3276, w8=2621.44→2621
    it('matches hand-computed values', () => {
        expect(DistributionEngine.project(10, 0)).toEqual([20000, 10000, 8000, 6400, 5120, 4096, 3276, 2621]);
    });
});

describe('DistributionEngine.project — rounding boundary', () => {
    it('indices 0-3 use Math.ceil', () => {
        // score=0.001, screenings=0: w1=2, w2=1, w3=0.8→ceil=1, w4=0.64→ceil=1
        const r = DistributionEngine.project(0.001, 0);
        expect(r[0]).toBe(2);  // ceil(2)
        expect(r[1]).toBe(1);  // ceil(1)
        expect(r[2]).toBe(1);  // ceil(0.8)
        expect(r[3]).toBe(1);  // ceil(0.64)
    });

    it('indices 4-7 use Math.floor', () => {
        const r = DistributionEngine.project(0.001, 0);
        // w5=0.64×0.8=0.512→floor=0, w6=0.512×0.8=0.4096→floor=0 etc.
        expect(r[4]).toBe(0);
        expect(r[5]).toBe(0);
    });
});
