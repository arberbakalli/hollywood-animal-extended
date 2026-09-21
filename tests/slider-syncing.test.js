import { describe, it, expect } from '@jest/globals';

describe('Slider Syncing Mapping Logic', () => {
  describe('genScore to poolSize mapping', () => {
    const mapGenScoreToPool = (genScore) => {
      return genScore === 10 ? 9 : genScore - 1;
    };

    it('genScore 6 maps to poolSize 5', () => {
      expect(mapGenScoreToPool(6)).toBe(5);
    });

    it('genScore 7 maps to poolSize 6', () => {
      expect(mapGenScoreToPool(7)).toBe(6);
    });

    it('genScore 8 maps to poolSize 7', () => {
      expect(mapGenScoreToPool(8)).toBe(7);
    });

    it('genScore 9 maps to poolSize 8', () => {
      expect(mapGenScoreToPool(9)).toBe(8);
    });

    it('genScore 10 maps to poolSize 9 (safe option)', () => {
      expect(mapGenScoreToPool(10)).toBe(9);
    });
  });

  describe('poolSize to genScore mapping', () => {
    const mapPoolToGenScore = (poolSize) => {
      return Math.min(poolSize + 1, 10);
    };

    it('poolSize 5 maps to genScore 6', () => {
      expect(mapPoolToGenScore(5)).toBe(6);
    });

    it('poolSize 6 maps to genScore 7', () => {
      expect(mapPoolToGenScore(6)).toBe(7);
    });

    it('poolSize 7 maps to genScore 8', () => {
      expect(mapPoolToGenScore(7)).toBe(8);
    });

    it('poolSize 8 maps to genScore 9', () => {
      expect(mapPoolToGenScore(8)).toBe(9);
    });

    it('poolSize 9 maps to genScore 10', () => {
      expect(mapPoolToGenScore(9)).toBe(10);
    });

    it('poolSize 10 maps to genScore 10 (better odds option)', () => {
      expect(mapPoolToGenScore(10)).toBe(10);
    });
  });

  describe('Visual track percentage calculation', () => {
    const calculateGenScoreTrackPercent = (genScore) => {
      return ((genScore - 6) / (10 - 6)) * 100;
    };

    it('genScore 6 shows 0% fill', () => {
      expect(calculateGenScoreTrackPercent(6)).toBe(0);
    });

    it('genScore 8 shows 50% fill', () => {
      expect(calculateGenScoreTrackPercent(8)).toBe(50);
    });

    it('genScore 10 shows 100% fill', () => {
      expect(calculateGenScoreTrackPercent(10)).toBe(100);
    });
  });

  describe('Proportional relationship validation', () => {
    const mapGenScoreToPool = (genScore) => {
      return genScore === 10 ? 9 : genScore - 1;
    };

    const mapPoolToGenScore = (poolSize) => {
      return Math.min(poolSize + 1, 10);
    };

    it('score to pool and back maintains consistency (6→5→6)', () => {
      const genScore = 6;
      const pool = mapGenScoreToPool(genScore);
      const scoreBack = mapPoolToGenScore(pool);
      expect(scoreBack).toBe(genScore);
    });

    it('score to pool and back maintains consistency (8→7→8)', () => {
      const genScore = 8;
      const pool = mapGenScoreToPool(genScore);
      const scoreBack = mapPoolToGenScore(pool);
      expect(scoreBack).toBe(genScore);
    });

    it('pool to score and back shows dual-option at max (10→10→10)', () => {
      const pool = 10;
      const genScore = mapPoolToGenScore(pool);
      expect(genScore).toBe(10);
      // Note: from genScore 10, we map to poolSize 9, but user can manually set to 10
    });
  });
});
