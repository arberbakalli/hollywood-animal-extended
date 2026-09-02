import { describe, it, expect, beforeEach } from '@jest/globals';
import { ExclusionManager } from '../src/features/scriptGenerator/ExclusionManager.js';

describe('ExclusionManager', () => {
    let mgr;
    beforeEach(() => { mgr = new ExclusionManager(); });

    describe('add', () => {
        it('adds a new ID and returns true', () => {
            expect(mgr.add('A')).toBe(true);
            expect(mgr.has('A')).toBe(true);
        });

        it('returns false when ID is already present (dedup)', () => {
            mgr.add('A');
            expect(mgr.add('A')).toBe(false);
            expect(mgr.size).toBe(1);
        });

        it('fires onChange when adding a new ID', () => {
            const calls = [];
            mgr.setOnChange(ids => calls.push([...ids]));
            mgr.add('A');
            expect(calls).toHaveLength(1);
            expect(calls[0]).toEqual(['A']);
        });

        it('does NOT fire onChange when ID is already present', () => {
            mgr.add('A');
            const calls = [];
            mgr.setOnChange(ids => calls.push(ids));
            mgr.add('A');
            expect(calls).toHaveLength(0);
        });
    });

    describe('remove', () => {
        it('removes an existing ID and returns true', () => {
            mgr.add('A');
            expect(mgr.remove('A')).toBe(true);
            expect(mgr.has('A')).toBe(false);
        });

        it('returns false when ID is not present', () => {
            expect(mgr.remove('NOPE')).toBe(false);
        });

        it('fires onChange when removing an existing ID', () => {
            mgr.add('A');
            const calls = [];
            mgr.setOnChange(ids => calls.push([...ids]));
            mgr.remove('A');
            expect(calls).toHaveLength(1);
            expect(calls[0]).toEqual([]);
        });

        it('does NOT fire onChange when ID was absent', () => {
            const calls = [];
            mgr.setOnChange(ids => calls.push(ids));
            mgr.remove('NOPE');
            expect(calls).toHaveLength(0);
        });
    });

    describe('addMany', () => {
        it('adds all unique IDs', () => {
            const added = mgr.addMany(['A', 'B', 'C']);
            expect(added).toBe(3);
            expect(mgr.size).toBe(3);
        });

        it('skips duplicates (already in set)', () => {
            mgr.add('A');
            const added = mgr.addMany(['A', 'B']);
            expect(added).toBe(1);
            expect(mgr.size).toBe(2);
        });

        it('fires onChange once for the whole batch', () => {
            const calls = [];
            mgr.setOnChange(ids => calls.push([...ids]));
            mgr.addMany(['X', 'Y', 'Z']);
            expect(calls).toHaveLength(1);
        });

        it('does NOT fire onChange when nothing was added', () => {
            mgr.add('A');
            const calls = [];
            mgr.setOnChange(ids => calls.push(ids));
            mgr.addMany(['A']);
            expect(calls).toHaveLength(0);
        });
    });

    describe('replaceAll', () => {
        it('replaces the entire set', () => {
            mgr.addMany(['A', 'B']);
            mgr.replaceAll(['C', 'D']);
            expect(mgr.getAll().sort()).toEqual(['C', 'D']);
        });

        it('fires onChange once', () => {
            const calls = [];
            mgr.setOnChange(ids => calls.push([...ids]));
            mgr.replaceAll(['X', 'Y']);
            expect(calls).toHaveLength(1);
        });

        it('replaceAll with empty array clears the set', () => {
            mgr.addMany(['A', 'B']);
            mgr.replaceAll([]);
            expect(mgr.size).toBe(0);
        });
    });

    describe('clear', () => {
        it('removes all IDs', () => {
            mgr.addMany(['A', 'B', 'C']);
            mgr.clear();
            expect(mgr.size).toBe(0);
        });

        it('fires onChange', () => {
            mgr.add('A');
            const calls = [];
            mgr.setOnChange(ids => calls.push([...ids]));
            mgr.clear();
            expect(calls).toHaveLength(1);
            expect(calls[0]).toEqual([]);
        });

        it('does NOT fire onChange when already empty', () => {
            const calls = [];
            mgr.setOnChange(ids => calls.push(ids));
            mgr.clear();
            expect(calls).toHaveLength(0);
        });
    });

    describe('getAll / size / has', () => {
        it('getAll returns a plain array (not the internal Set)', () => {
            mgr.addMany(['A', 'B']);
            const all = mgr.getAll();
            expect(Array.isArray(all)).toBe(true);
            all.push('MUTATION');
            expect(mgr.size).toBe(2); // internal set unaffected
        });

        it('size reflects the current count', () => {
            expect(mgr.size).toBe(0);
            mgr.add('A');
            expect(mgr.size).toBe(1);
        });

        it('has returns false for unknown IDs', () => {
            expect(mgr.has('UNKNOWN')).toBe(false);
        });
    });
});
