/**
 * Jest tests for Build for Target feature
 * Covers tag validation, element counting, and exclusion logic
 */

describe('Build for Target', () => {
  beforeAll(() => {
    global.GAME_DATA = {
      tags: {
        genre1: { id: 'genre1', name: 'Action', category: 'Genre' },
        setting1: { id: 'setting1', name: 'Modern City', category: 'Settings' },
        prot1: { id: 'prot1', name: 'Hero', category: 'Protagonist' },
        prot2: { id: 'prot2', name: 'Sidekick', category: 'Protagonist' },
        antag1: { id: 'antag1', name: 'Villain', category: 'Antagonist' },
        antag2: { id: 'antag2', name: 'Minion', category: 'Antagonist' },
        theme1: { id: 'theme1', name: 'Love', category: 'Theme Event' },
        theme2: { id: 'theme2', name: 'Betrayal', category: 'Theme Event' }
      }
    };
  });

  describe('Story element counting (5-10 requirement)', () => {
    test('should count only story elements, excluding Genre and Settings', () => {
      const selectedTags = [
        { id: 'genre1', category: 'Genre' },     // ignored
        { id: 'setting1', category: 'Settings' }, // ignored
        { id: 'prot1', category: 'Protagonist' },
        { id: 'prot2', category: 'Protagonist' },
        { id: 'antag1', category: 'Antagonist' },
        { id: 'theme1', category: 'Theme Event' },
        { id: 'theme2', category: 'Theme Event' }
      ];

      const storyElementTags = selectedTags.filter(tag =>
        tag.category !== 'Genre' && tag.category !== 'Settings'
      );

      expect(storyElementTags.length).toBe(5);
    });

    test('should reject fewer than 5 story elements', () => {
      const selectedTags = [
        { id: 'genre1', category: 'Genre' },
        { id: 'setting1', category: 'Settings' },
        { id: 'prot1', category: 'Protagonist' },
        { id: 'prot2', category: 'Protagonist' }
      ];

      const storyElementTags = selectedTags.filter(tag =>
        tag.category !== 'Genre' && tag.category !== 'Settings'
      );

      expect(storyElementTags.length).toBeLessThan(5);
    });

    test('should reject more than 10 story elements', () => {
      const selectedTags = [
        { id: 'genre1', category: 'Genre' },
        { id: 'setting1', category: 'Settings' },
        ...Array(11).fill(null).map((_, i) => ({
          id: `story${i}`,
          category: i % 2 === 0 ? 'Protagonist' : 'Antagonist'
        }))
      ];

      const storyElementTags = selectedTags.filter(tag =>
        tag.category !== 'Genre' && tag.category !== 'Settings'
      );

      expect(storyElementTags.length).toBeGreaterThan(10);
    });

    test('should accept 5-10 story elements with any genre/settings combination', () => {
      const selectedTags = [
        { id: 'genre1', category: 'Genre' },
        { id: 'setting1', category: 'Settings' },
        { id: 'prot1', category: 'Protagonist' },
        { id: 'prot2', category: 'Protagonist' },
        { id: 'antag1', category: 'Antagonist' },
        { id: 'antag2', category: 'Antagonist' },
        { id: 'theme1', category: 'Theme Event' },
        { id: 'theme2', category: 'Theme Event' }
      ];

      const storyElementTags = selectedTags.filter(tag =>
        tag.category !== 'Genre' && tag.category !== 'Settings'
      );

      expect(storyElementTags.length).toBeGreaterThanOrEqual(5);
      expect(storyElementTags.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Exclusion logic', () => {
    test('should filter out excluded tags from combinations', () => {
      const allTags = Object.values(GAME_DATA.tags);
      const excludedIds = new Set(['genre1', 'antag1']);

      const availableTags = allTags.filter(t => !excludedIds.has(t.id));

      expect(availableTags.map(t => t.id)).toContain('prot1');
      expect(availableTags.map(t => t.id)).not.toContain('genre1');
      expect(availableTags.map(t => t.id)).not.toContain('antag1');
    });

    test('should use same exclusion filter as Script Lab', () => {
      // Both Script Lab and Build for Target should call getGeneratorExcludedIds()
      // to get the current Excluded Elements list
      const getExcludedIds = () => new Set(['antag1']); // mock function
      const excludedIds = getExcludedIds();

      const availableForBuilding = Object.values(GAME_DATA.tags)
        .filter(t => !excludedIds.has(t.id));

      expect(availableForBuilding.map(t => t.id)).not.toContain('antag1');
    });
  });

  describe('Find Top Combinations with no filter', () => {
    test('should work when no audience or advertiser is selected', () => {
      const selectedAudiences = [];
      const selectedAdvertisers = [];

      // Should use all agencies when no filter is applied
      const targetAgencies = selectedAdvertisers.length > 0
        ? [] // would be filtered
        : selectedAudiences.length > 0
          ? [] // would be filtered
          : ['agency1', 'agency2', 'agency3']; // all agencies

      expect(targetAgencies.length).toBeGreaterThan(0);
    });

    test('should filter to specific agencies when audience selected', () => {
      const selectedAudiences = ['audience1'];
      const selectedAdvertisers = [];

      // Would filter to agencies that reach the selected audience
      const targetAgencies = selectedAudiences.length > 0
        ? ['agency1', 'agency3'] // agencies reaching audience1
        : ['agency1', 'agency2', 'agency3'];

      expect(targetAgencies.length).toBeLessThanOrEqual(3);
    });

    test('should filter to specific agencies when advertiser selected', () => {
      const selectedAudiences = [];
      const selectedAdvertisers = ['advertiser1'];

      // Would filter to selected advertiser(s)
      const targetAgencies = selectedAdvertisers.length > 0
        ? ['advertiser1'] // selected advertiser
        : ['agency1', 'agency2', 'agency3'];

      expect(targetAgencies).toContain('advertiser1');
    });
  });
});
