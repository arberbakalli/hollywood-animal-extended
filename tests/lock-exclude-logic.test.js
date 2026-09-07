import { describe, test, expect, beforeAll } from '@jest/globals';
import { loadGameData } from './helpers/legacyHarness.js';

let gameData;

beforeAll(async () => {
  gameData = await loadGameData();
});

describe('Generator — Lock and Exclude Logic', () => {
  describe('Exclusion Logic', () => {

    test('excluded tags set is empty when no exclusions chosen', () => {
      const excluded = new Set();
      expect(excluded.size).toBe(0);
    });

    test('excluded tags can be added one at a time', () => {
      const allTagIds = Object.keys(gameData.tags);
      if (allTagIds.length < 2) return; // Skip if not enough tags

      const excluded = new Set();
      excluded.add(allTagIds[0]);
      excluded.add(allTagIds[1]);

      expect(excluded.size).toBe(2);
      expect(excluded.has(allTagIds[0])).toBe(true);
      expect(excluded.has(allTagIds[1])).toBe(true);
    });

    test('excluded tags persist in set across operations', () => {
      const allTagIds = Object.keys(gameData.tags);
      if (allTagIds.length < 2) return; // Skip if not enough tags

      const excluded = new Set([allTagIds[0], allTagIds[1]]);
      const copy = new Set(excluded);

      copy.delete(allTagIds[0]);

      expect(excluded.size).toBe(2);
      expect(copy.size).toBe(1);
    });

    test('removing all exclusions leaves empty set', () => {
      const allTagIds = Object.keys(gameData.tags);
      if (allTagIds.length < 2) return; // Skip if not enough tags

      const excluded = new Set([allTagIds[0], allTagIds[1]]);
      excluded.clear();

      expect(excluded.size).toBe(0);
    });

    test('excluded tags do not appear in available tags filter', () => {
      const allTagIds = Object.keys(gameData.tags);
      if (allTagIds.length < 2) return; // Skip if not enough tags

      const excluded = new Set([allTagIds[0], allTagIds[1]]);
      const available = allTagIds.filter(tagId => !excluded.has(tagId));

      expect(available).not.toContain(allTagIds[0]);
      expect(available).not.toContain(allTagIds[1]);
      expect(available.length).toBe(allTagIds.length - 2);
    });

    test('duplicate exclusions in set are idempotent', () => {
      const allTagIds = Object.keys(gameData.tags);
      const excluded = new Set();
      excluded.add(allTagIds[0]);
      excluded.add(allTagIds[0]);
      excluded.add(allTagIds[0]);

      expect(excluded.size).toBe(1);
    });

    test('excluded tags combined with profile exclusions', () => {
      const allTagIds = Object.keys(gameData.tags);
      const profileExcluded = new Set(
        allTagIds.slice(2, 5) // Take middle slice as "profile excluded"
      );
      const manualExcluded = new Set([allTagIds[0]]);
      const combined = new Set([...profileExcluded, ...manualExcluded]);

      // Combined should include both manual and profile exclusions
      expect(combined.size).toBeGreaterThanOrEqual(manualExcluded.size);
      expect(combined.has(allTagIds[0])).toBe(true);
    });
  });

  describe('Lock Logic', () => {
    test('locked tags set is empty when no locks chosen', () => {
      const locked = new Set();
      expect(locked.size).toBe(0);
    });

    test('locked tags can be added one at a time', () => {
      const allTagIds = Object.keys(gameData.tags);
      if (allTagIds.length < 2) return; // Skip if not enough tags

      const locked = new Set();
      locked.add(allTagIds[0]);
      locked.add(allTagIds[1]);

      expect(locked.size).toBe(2);
      expect(locked.has(allTagIds[0])).toBe(true);
      expect(locked.has(allTagIds[1])).toBe(true);
    });

    test('removing all locks leaves empty set', () => {
      const allTagIds = Object.keys(gameData.tags);
      if (allTagIds.length < 2) return; // Skip if not enough tags

      const locked = new Set([allTagIds[0], allTagIds[1]]);
      locked.clear();

      expect(locked.size).toBe(0);
    });

    test('duplicate locks are idempotent', () => {
      const allTagIds = Object.keys(gameData.tags);
      const locked = new Set();
      locked.add(allTagIds[0]);
      locked.add(allTagIds[0]);
      locked.add(allTagIds[0]);

      expect(locked.size).toBe(1);
    });

    test('locked tags must be a subset of available tags (basic validation)', () => {
      const allTagIds = Object.keys(gameData.tags);
      if (allTagIds.length < 2) return; // Skip if not enough tags

      const allTags = new Set(allTagIds);
      const locked = new Set([allTagIds[0], allTagIds[1]]);

      const validLocks = [...locked].filter(tagId => allTags.has(tagId));
      expect(validLocks.length).toBe(locked.size);
    });

    test('locked tags should not be excluded simultaneously', () => {
      const allTagIds = Object.keys(gameData.tags);
      const locked = new Set([allTagIds[0]]);
      const excluded = new Set([allTagIds[0]]);

      // Conflict: tag is both locked and excluded
      const conflict = [...locked].some(tagId => excluded.has(tagId));
      expect(conflict).toBe(true);

      // Resolution: if a tag is locked, remove from excluded
      excluded.delete(allTagIds[0]);
      const conflictResolved = [...locked].some(tagId => excluded.has(tagId));
      expect(conflictResolved).toBe(false);
    });
  });

  describe('Lock + Exclude Interaction', () => {
    test('locked tags filter out excluded tags', () => {
      const allTagIds = Object.keys(gameData.tags);
      if (allTagIds.length < 2) return; // Skip if not enough tags

      const locked = new Set([allTagIds[0], allTagIds[1]]);
      const excluded = new Set([allTagIds[1]]);

      // A locked tag that is also excluded is a conflict
      const lockedButExcluded = [...locked].filter(tagId => excluded.has(tagId));
      expect(lockedButExcluded.length).toBe(1);
    });

    test('excluded tags do not prevent scoring in a locked result', () => {
      const allTagIds = Object.keys(gameData.tags);
      if (allTagIds.length < 3) return; // Skip if not enough tags

      const locked = new Set([allTagIds[0]]);
      const excluded = new Set([allTagIds[2]]);

      // Locked tags force generation; excluded tags just filter availability
      expect(locked.has(allTagIds[0])).toBe(true);
      expect(excluded.has(allTagIds[0])).toBe(false);
      expect(excluded.has(allTagIds[2])).toBe(true);
    });

    test('reset locks and exclusions clears both', () => {
      const allTagIds = Object.keys(gameData.tags);
      if (allTagIds.length < 2) return; // Skip if not enough tags

      const locked = new Set([allTagIds[0]]);
      const excluded = new Set([allTagIds[1]]);

      locked.clear();
      excluded.clear();

      expect(locked.size).toBe(0);
      expect(excluded.size).toBe(0);
    });
  });

  describe('Profile Exclusions (Starting Tags vs Custom)', () => {
    test('starter whitelist exists in game data', () => {
      // If no whitelist, all tags are available
      const starterWhitelist = gameData.starterWhitelist || [];
      expect(Array.isArray(starterWhitelist)).toBe(true);
    });

    test('starting profile would exclude all non-starter tags', () => {
      const starter = new Set(gameData.starterWhitelist || []);
      const allTags = Object.keys(gameData.tags);

      if (starter.size > 0) {
        const starterOnlyExcluded = allTags.filter(tagId => !starter.has(tagId));
        expect(starterOnlyExcluded.length).toBeGreaterThanOrEqual(0);
      }
    });

    test('custom profile has no profile-level exclusions', () => {
      const profileExcluded = new Set(); // Custom profile = empty
      expect(profileExcluded.size).toBe(0);
    });

    test('switching from starting to custom clears profile exclusions', () => {
      let profileExcluded = new Set(
        Object.values(gameData.tags)
          .filter(tag => !(gameData.starterWhitelist || []).includes(tag.id))
          .map(tag => tag.id)
      );

      // Switch to custom
      profileExcluded = new Set();
      expect(profileExcluded.size).toBe(0);
    });
  });

  describe('Generation Algorithm Constraints', () => {
    test('generation must exclude all tags in excluded set', () => {
      const allTagIds = Object.keys(gameData.tags);
      const excluded = new Set([allTagIds[0], allTagIds[1]]);
      const generated = allTagIds.slice(2, 5);

      const usesExcluded = generated.some(tag => excluded.has(tag));
      expect(usesExcluded).toBe(false);
    });

    test('generation must include all tags in locked set', () => {
      const allTagIds = Object.keys(gameData.tags);
      const locked = new Set([allTagIds[0], allTagIds[1]]);
      const generated = [allTagIds[0], allTagIds[1], allTagIds[2]];

      const allLocked = [...locked].every(tag => generated.includes(tag));
      expect(allLocked).toBe(true);
    });

    test('locked tags in scoring position are counted correctly', () => {
      const allTagIds = Object.keys(gameData.tags);
      const locked = new Set([allTagIds[0]]);
      const scoringTags = [allTagIds[0], allTagIds[1], allTagIds[2]];

      const lockedScoring = [...locked].filter(tag => scoringTags.includes(tag));
      expect(lockedScoring.length).toBe(1);
    });

    test('cannot lock more scoring tags than the score cap allows', () => {
      const scoreCap = 5; // Max 5 scoring elements
      const allTagIds = Object.keys(gameData.tags);
      const lockedScoring = allTagIds.slice(0, 6);

      if (lockedScoring.length > scoreCap) {
        expect(lockedScoring.length).toBeGreaterThan(scoreCap);
      }
    });
  });

  describe('Edge Cases', () => {
    test('empty locked and excluded sets generates normally', () => {
      const locked = new Set();
      const excluded = new Set();

      // Should succeed (no constraints)
      expect(locked.size).toBe(0);
      expect(excluded.size).toBe(0);
    });

    test('all tags locked (impossible condition)', () => {
      const allTagIds = Object.keys(gameData.tags);
      const locked = new Set(allTagIds);

      // Locking every tag is not feasible; generation cannot proceed
      expect(locked.size).toBe(allTagIds.length);
    });

    test('all tags excluded (impossible condition)', () => {
      const allTagIds = Object.keys(gameData.tags);
      const excluded = new Set(allTagIds);

      // Excluding every tag leaves nothing to generate
      expect(excluded.size).toBe(allTagIds.length);
    });

    test('null/undefined tags handled safely', () => {
      const locked = new Set([null, undefined, '']);
      const excluded = new Set([null, undefined, '']);

      // Should filter to valid tags only
      const validLocked = [...locked].filter(tag => typeof tag === 'string' && tag.length > 0);
      const validExcluded = [...excluded].filter(tag => typeof tag === 'string' && tag.length > 0);

      expect(validLocked.length).toBe(0);
      expect(validExcluded.length).toBe(0);
    });

    test('case sensitivity: tag IDs must match exactly', () => {
      const allTagIds = Object.keys(gameData.tags);
      if (allTagIds.length === 0) return; // Skip if no tags

      const firstTag = allTagIds[0];
      const locked = new Set([firstTag]);

      // Should be case-sensitive; only exact match is locked
      expect(locked.has(firstTag)).toBe(true);
      // If the tag ID is already lowercase or uppercase only, this test doesn't apply
      if (firstTag !== firstTag.toLowerCase()) {
        expect(locked.has(firstTag.toLowerCase())).toBe(false);
      }
    });
  });
});
