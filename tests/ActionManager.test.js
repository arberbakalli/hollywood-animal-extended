import { describe, it, expect } from '@jest/globals';
import { ActionManager } from '../src/core/ActionManager.js';

const MOCK_TAGS = {
    ACTION:    { id: 'ACTION',    name: 'Action',    category: 'Genre' },
    COMEDY:    { id: 'COMEDY',    name: 'Comedy',    category: 'Genre' },
    FANTASY:   { id: 'FANTASY',   name: 'Fantasy',   category: 'Setting' },
    HERO:      { id: 'HERO',      name: 'Hero',      category: 'Protagonist' },
    VILLAIN:   { id: 'VILLAIN',   name: 'Villain',   category: 'Antagonist' },
    SIDEKICK:  { id: 'SIDEKICK',  name: 'Sidekick',  category: 'Supporting Character' },
    FINALE_A:  { id: 'FINALE_A',  name: 'Finale A',  category: 'Finale' },
};

const MOCK_GENRE_PAIRS = {
    ACTION: { COMEDY: { Item1: '0.5', Item2: '0.3' } },
};

describe('ActionManager.getByCategory', () => {
    const am = new ActionManager(MOCK_TAGS);

    it('returns only tags in the given category', () => {
        const genres = am.getByCategory('Genre');
        expect(genres.map(t => t.id).sort()).toEqual(['ACTION', 'COMEDY']);
    });

    it('returns tags sorted by name', () => {
        const genres = am.getByCategory('Genre');
        expect(genres[0].name).toBe('Action');
        expect(genres[1].name).toBe('Comedy');
    });

    it('returns empty array for unknown category', () => {
        expect(am.getByCategory('Unknown')).toEqual([]);
    });
});

describe('ActionManager.getById', () => {
    const am = new ActionManager(MOCK_TAGS);

    it('returns the correct tag', () => {
        expect(am.getById('HERO')).toEqual(MOCK_TAGS.HERO);
    });

    it('returns null for unknown ID', () => {
        expect(am.getById('NOPE')).toBeNull();
    });
});

describe('ActionManager.getRandomByCategory', () => {
    const am = new ActionManager(MOCK_TAGS);

    it('returns a tag from the correct category', () => {
        const tag = am.getRandomByCategory('Genre');
        expect(['ACTION', 'COMEDY']).toContain(tag.id);
    });

    it('returns null when all are excluded', () => {
        const result = am.getRandomByCategory('Genre', new Set(), new Set(['ACTION', 'COMEDY']));
        expect(result).toBeNull();
    });

    it('never returns an already-existing tag', () => {
        const result = am.getRandomByCategory('Genre', new Set(['ACTION']), new Set());
        expect(result?.id).toBe('COMEDY');
    });

    it('never returns an excluded tag', () => {
        const result = am.getRandomByCategory('Genre', new Set(), new Set(['COMEDY']));
        expect(result?.id).toBe('ACTION');
    });

    it('returned object has correct shape', () => {
        const tag = am.getRandomByCategory('Protagonist');
        expect(tag).toEqual({ id: 'HERO', percent: 1.0, category: 'Protagonist' });
    });
});

describe('ActionManager.getCompatibleGenres', () => {
    const am = new ActionManager(MOCK_TAGS);

    it('returns genres paired with sourceId (forward lookup)', () => {
        const result = am.getCompatibleGenres('ACTION', MOCK_GENRE_PAIRS);
        expect(result).toContain('COMEDY');
    });

    it('returns genres paired with sourceId (reverse lookup)', () => {
        const result = am.getCompatibleGenres('COMEDY', MOCK_GENRE_PAIRS);
        expect(result).toContain('ACTION');
    });

    it('excludes IDs in excludedIds', () => {
        const result = am.getCompatibleGenres('ACTION', MOCK_GENRE_PAIRS, new Set(['COMEDY']));
        expect(result).not.toContain('COMEDY');
    });

    it('returns empty array when no pairs exist', () => {
        expect(am.getCompatibleGenres('FANTASY', MOCK_GENRE_PAIRS)).toEqual([]);
    });
});

describe('ActionManager.countScoringElements', () => {
    it('excludes Genre and Setting from the count', () => {
        const tags = [
            { category: 'Genre' },
            { category: 'Setting' },
            { category: 'Protagonist' },
            { category: 'Antagonist' },
            { category: 'Finale' },
        ];
        expect(ActionManager.countScoringElements(tags)).toBe(3);
    });

    it('returns 0 for empty array', () => {
        expect(ActionManager.countScoringElements([])).toBe(0);
    });

    it('returns 0 when all tags are Genre or Setting', () => {
        const tags = [{ category: 'Genre' }, { category: 'Setting' }];
        expect(ActionManager.countScoringElements(tags)).toBe(0);
    });

    it('matches the tag-cap thresholds in GameConstants', () => {
        // 9 scoring elements → cap 9
        const nine = Array.from({ length: 9 }, () => ({ category: 'Protagonist' }));
        expect(ActionManager.countScoringElements(nine)).toBe(9);
    });
});
