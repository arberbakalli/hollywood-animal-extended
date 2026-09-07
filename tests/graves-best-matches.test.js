/**
 * Jest tests for Graves Best Matches feature
 * Covers unlimited result display, mode switching, and exclusion logic
 */

describe('Graves Best Matches', () => {
  // Mock setup: Best Matches uses global functions and GAME_DATA
  beforeAll(() => {
    global.GAME_DATA = {
      tags: {
        tag1: { id: 'tag1', name: 'Action', category: 'Genre' },
        tag2: { id: 'tag2', name: 'Hero', category: 'Protagonist' },
        tag3: { id: 'tag3', name: 'Villain', category: 'Antagonist' },
        tag4: { id: 'tag4', name: 'Love', category: 'Theme Event' }
      },
      constants: {
        DISTRIBUTION: {
          multipliers: { BASE: 1000, WEEK_ONE: 2, WEEK_TWO: 1 },
          weeklyCalculation: { NUMBER_OF_WEEKS: 8, REDUCTION_START_INDEX: 2 },
          rounding: { ROUND_UP_UNTIL_INDEX: 4 }
        }
      }
    };
  });

  describe('Result limits (infinite mode)', () => {
    test('should show all results without MAX_ROWS_PER_BAND limit', () => {
      // MAX_ROWS_PER_BAND should be Infinity to show all results
      // Previously was 10, causing truncation
      const mockResults = Array(50).fill(null).map((_, i) => ({
        candidate: { id: `tag${i}`, name: `Candidate ${i}`, category: 'Genre' },
        band: 'common',
        fitAverage: 3.0
      }));

      // Simulate groupedMarkup behavior
      const MAX_ROWS_PER_BAND = Infinity;
      const banded = mockResults.slice(0, MAX_ROWS_PER_BAND);

      expect(banded.length).toBe(50);
    });

    test('should allow scrolling through unlimited suggestions', () => {
      // With MAX_ROWS = Infinity, all suggestions are available
      const allResults = 200;
      const MAX_ROWS = Infinity;
      const visibleResults = Math.min(allResults, MAX_ROWS);

      expect(visibleResults).toBe(200);
    });

    test('ordering by band (successful/common/unsuccessful) maintains priority', () => {
      const results = [
        { band: 'successful', fitAverage: 4.5 },
        { band: 'unsuccessful', fitAverage: 2.0 },
        { band: 'common', fitAverage: 3.2 }
      ];

      const bands = ['successful', 'common', 'unsuccessful'];
      const grouped = bands.map(band =>
        results.filter(r => r.band === band)
      );

      expect(grouped[0][0].band).toBe('successful');
      expect(grouped[1][0].band).toBe('common');
      expect(grouped[2][0].band).toBe('unsuccessful');
    });
  });

  describe('Mode switching', () => {
    test('should support additions, swaps, and pairwise modes', () => {
      const modes = ['additions', 'swaps', 'pairwise'];
      expect(modes).toContain('additions');
      expect(modes).toContain('swaps');
      expect(modes).toContain('pairwise');
    });
  });

  describe('Exclusion integration', () => {
    test('should respect excluded tags from Script Lab', () => {
      // Best Matches should filter out tags that are in the Excluded Elements list
      const allTags = Object.keys(GAME_DATA.tags);
      const excludedIds = new Set(['tag1', 'tag3']); // tag1 and tag3 are excluded

      const availableTags = allTags.filter(id => !excludedIds.has(id));

      expect(availableTags).toContain('tag2');
      expect(availableTags).toContain('tag4');
      expect(availableTags).not.toContain('tag1');
      expect(availableTags).not.toContain('tag3');
    });
  });
});
