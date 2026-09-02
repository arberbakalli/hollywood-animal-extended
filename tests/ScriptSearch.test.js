import { describe, it, expect, beforeEach } from '@jest/globals';
import { ScriptSearch } from '../src/features/scriptGenerator/ScriptSearch.js';

describe('ScriptSearch', () => {
    let search;
    beforeEach(() => { search = new ScriptSearch(); });

    describe('initial state', () => {
        it('term is empty', () => {
            expect(search.term).toBe('');
        });

        it('isActive is false', () => {
            expect(search.isActive).toBe(false);
        });
    });

    describe('setTerm', () => {
        it('stores trimmed, lower-cased term', () => {
            search.setTerm('  Hero  ');
            expect(search.term).toBe('hero');
        });

        it('isActive becomes true once term is set', () => {
            search.setTerm('x');
            expect(search.isActive).toBe(true);
        });

        it('isActive is false for whitespace-only input', () => {
            search.setTerm('   ');
            expect(search.isActive).toBe(false);
        });
    });

    describe('filter — no active term', () => {
        it('returns all items unchanged', () => {
            const items = ['Alpha', 'Beta', 'Gamma'];
            expect(search.filter(items)).toEqual(items);
        });

        it('returns empty array for empty input', () => {
            expect(search.filter([])).toEqual([]);
        });
    });

    describe('filter — with active term', () => {
        const tags = [
            { id: 'HERO',    name: 'Hero',    category: 'Protagonist' },
            { id: 'VILLAIN', name: 'Villain', category: 'Antagonist'  },
            { id: 'COWBOY',  name: 'Cowboy',  category: 'Protagonist' },
        ];

        it('filters by label from labelFn (case-insensitive)', () => {
            search.setTerm('hero');
            const result = search.filter(tags, t => t.name);
            expect(result.map(t => t.id)).toEqual(['HERO']);
        });

        it('matches partial strings', () => {
            search.setTerm('ota');
            const result = search.filter(tags, t => t.category);
            expect(result.map(t => t.id)).toEqual(['HERO', 'COWBOY']);
        });

        it('is case-insensitive (term UPPER, label lower)', () => {
            search.setTerm('VILLAIN');
            const result = search.filter(tags, t => t.name);
            expect(result.map(t => t.id)).toEqual(['VILLAIN']);
        });

        it('returns empty when nothing matches', () => {
            search.setTerm('zzz');
            expect(search.filter(tags, t => t.name)).toEqual([]);
        });

        it('uses String(item) as default labelFn', () => {
            search.setTerm('beta');
            const result = search.filter(['Alpha', 'Beta', 'Gamma']);
            expect(result).toEqual(['Beta']);
        });
    });

    describe('clear', () => {
        it('resets term to empty string', () => {
            search.setTerm('hero');
            search.clear();
            expect(search.term).toBe('');
        });

        it('isActive becomes false after clear', () => {
            search.setTerm('hero');
            search.clear();
            expect(search.isActive).toBe(false);
        });

        it('filter returns all items after clear', () => {
            search.setTerm('hero');
            search.clear();
            const items = ['Alpha', 'Beta'];
            expect(search.filter(items)).toEqual(items);
        });
    });
});
