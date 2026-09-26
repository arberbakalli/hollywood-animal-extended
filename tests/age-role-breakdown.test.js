import { describe, expect, test, beforeAll } from '@jest/globals';
import { readFile } from 'node:fs/promises';
import { loadInstrumentedApp } from './helpers/legacyHarness.js';

describe('Age-to-Role Breakdown (Feature 3a)', () => {
    test('loads age/role compatibility data', async () => {
        const data = JSON.parse(await readFile('data/TagsToAgeCompatibilityData.json', 'utf8'));
        expect(data).toBeDefined();
        expect(data).not.toBeNull();
        expect(typeof data).toBe('object');
        expect(Object.keys(data).length).toBeGreaterThan(0);
    });

    test('includes compatibility data for protagonists', async () => {
        const data = JSON.parse(await readFile('data/TagsToAgeCompatibilityData.json', 'utf8'));
        const protagonists = Object.keys(data).filter(key => key.startsWith('PROTAGONIST_'));
        expect(protagonists.length).toBeGreaterThan(5);
    });

    test('includes compatibility data for antagonists', async () => {
        const data = JSON.parse(await readFile('data/TagsToAgeCompatibilityData.json', 'utf8'));
        const antagonists = Object.keys(data).filter(key => key.startsWith('ANTAGONIST_'));
        expect(antagonists.length).toBeGreaterThan(5);
    });

    test('each role has appeal ratings for all age/gender combinations', async () => {
        const data = JSON.parse(await readFile('data/TagsToAgeCompatibilityData.json', 'utf8'));
        const requiredKeys = ['YOUNG_M', 'YOUNG_F', 'MID_M', 'MID_F', 'OLD_M', 'OLD_F'];

        Object.entries(data).forEach(([roleId, roleData]) => {
            requiredKeys.forEach(key => {
                expect(roleData).toHaveProperty(key);
                expect(typeof roleData[key]).toBe('number');
                expect(roleData[key]).toBeGreaterThanOrEqual(-5.0);
                expect(roleData[key]).toBeLessThanOrEqual(5.0);
            });
        });
    });

    test('appeal ratings span a good range within the -5.0 to +5.0 scale', async () => {
        const data = JSON.parse(await readFile('data/TagsToAgeCompatibilityData.json', 'utf8'));
        const allValues = [];

        Object.entries(data).forEach(([roleId, roleData]) => {
            Object.values(roleData).forEach(value => {
                allValues.push(value);
            });
        });

        const minValue = Math.min(...allValues);
        const maxValue = Math.max(...allValues);

        expect(minValue).toBeGreaterThanOrEqual(-1.0);
        expect(maxValue).toBeGreaterThanOrEqual(4.0);
        expect(maxValue).toBeLessThanOrEqual(5.0);
    });

    test('module is present in source files', async () => {
        const moduleSource = await readFile('src/analysis/ageRoleBreakdown.js', 'utf8');
        expect(moduleSource).toContain('HACAnalysisAgeRoleBreakdown');
        expect(moduleSource).toContain('setupAgeRoleBreakdownListeners');
        expect(moduleSource).toContain('updateAgeRoleBreakdown');
        expect(moduleSource).toContain('loadAgeRoleData');
    });

    test('HTML includes age-role breakdown panel', async () => {
        const html = await readFile('index.html', 'utf8');
        expect(html).toContain('ageRoleBreakdownPanel');
        expect(html).toContain('toggleAgeRoleBreakdownButton');
        expect(html).toContain('ageRoleTableContainer');
        expect(html).toContain('ageRoleInsight');
    });

    test('stylesheet includes the rating classes the age-role panel renders', async () => {
        const styles = await readFile('styles.css', 'utf8');
        expect(styles).toContain('.age-role-rating--good');
        expect(styles).toContain('.age-role-rating--neutral');
        expect(styles).toContain('.age-role-rating--bad');
    });

    // New tests for restructured JSON with metadata
    test('age-role-compatibility.json has new metadata structure', async () => {
        const data = JSON.parse(await readFile('data/age-role-compatibility.json', 'utf8'));

        // Check that roles have the new structure
        const protagonist = data.protagonists['PROTAGONIST_COP'];
        expect(protagonist).toHaveProperty('ratings');
        expect(protagonist).toHaveProperty('locked_gender');
        expect(protagonist).toHaveProperty('data_source');
    });

    test('ratings field contains age group compatibility', async () => {
        const data = JSON.parse(await readFile('data/age-role-compatibility.json', 'utf8'));
        const protagonist = data.protagonists['PROTAGONIST_COP'];

        expect(protagonist.ratings).toHaveProperty('YOUNG');
        expect(protagonist.ratings).toHaveProperty('MID');
        expect(protagonist.ratings).toHaveProperty('OLD');
        expect(['Good', 'Neutral', 'Bad']).toContain(protagonist.ratings.YOUNG);
    });

    test('gender-locked roles have locked_gender field set', async () => {
        const data = JSON.parse(await readFile('data/age-role-compatibility.json', 'utf8'));

        // Check known gender-locked roles
        expect(data.protagonists['PROTAGONIST_AMBITIOUS_WOMAN'].locked_gender).toBe('F');
        expect(data.supportingCharacters['SUPPORTING_CHARACTER_PATRIARCH'].locked_gender).toBe('M');
        expect(data.supportingCharacters['SUPPORTING_CHARACTER_FEMME_FATALE'].locked_gender).toBe('F');
        expect(data.supportingCharacters['SUPPORTING_CHARACTER_DAMSEL_IN_DISTRESS'].locked_gender).toBe('F');
    });

    test('flexible-gender roles have locked_gender as null', async () => {
        const data = JSON.parse(await readFile('data/age-role-compatibility.json', 'utf8'));

        // Check roles that allow both genders
        expect(data.protagonists['PROTAGONIST_COP'].locked_gender).toBeNull();
        expect(data.antagonists['ANTAGONIST_ALIEN'].locked_gender).toBeNull();
        expect(data.supportingCharacters['SUPPORTING_CHARACTER_SIDEKICK'].locked_gender).toBeNull();
    });

    test('data_source field distinguishes verified from estimated data', async () => {
        const data = JSON.parse(await readFile('data/age-role-compatibility.json', 'utf8'));

        // All roles should have a data_source field
        Object.entries(data.protagonists).forEach(([roleId, roleData]) => {
            expect(['verified', 'estimated']).toContain(roleData.data_source);
        });

        Object.entries(data.supportingCharacters).forEach(([roleId, roleData]) => {
            expect(['verified', 'estimated']).toContain(roleData.data_source);
        });
    });

    test('all protagonists have complete rating data', async () => {
        const data = JSON.parse(await readFile('data/age-role-compatibility.json', 'utf8'));

        Object.entries(data.protagonists).forEach(([roleId, roleData]) => {
            expect(roleData.ratings.YOUNG).toBeDefined();
            expect(roleData.ratings.MID).toBeDefined();
            expect(roleData.ratings.OLD).toBeDefined();
        });
    });

    test('antagonists section exists with expected structure', async () => {
        const data = JSON.parse(await readFile('data/age-role-compatibility.json', 'utf8'));
        expect(data.antagonists).toBeDefined();
        expect(Object.keys(data.antagonists).length).toBeGreaterThan(10);
    });

    test('supporting characters section has expected entries', async () => {
        const data = JSON.parse(await readFile('data/age-role-compatibility.json', 'utf8'));
        expect(data.supportingCharacters).toBeDefined();
        expect(data.supportingCharacters['SUPPORTING_CHARACTER_PATRIARCH']).toBeDefined();
        expect(data.supportingCharacters['SUPPORTING_CHARACTER_FEMME_FATALE']).toBeDefined();
        expect(data.supportingCharacters['SUPPORTING_CHARACTER_DAMSEL_IN_DISTRESS']).toBeDefined();
    });

    test('stylesheet includes age/gender appeal row styling', async () => {
        const styles = await readFile('styles.css', 'utf8');
        expect(styles).toContain('.age-role-row--protagonist');
        expect(styles).toContain('.age-role-row--antagonist');
        expect(styles).toContain('.age-role-row--supporting');
        expect(styles).toContain('.gender-btn');
    });

    // --- Regression guard for the age-role-compatibility.json id-drift bug ---
    // Every row in this file claims "data_source": "verified", but a number of
    // Protagonist/Antagonist keys had drifted from the real ids in
    // data/TagData.json (typos, a Cyrillic/Latin homoglyph, swapped word
    // order, a dropped word). A drifted key means Script Lab's Age & Gender
    // Appeal panel silently renders "-" for a real, selectable role while the
    // file claims full verified coverage.
    test('every real Protagonist and Antagonist tag id resolves in age-role-compatibility.json', async () => {
        const tagData = JSON.parse(await readFile('data/TagData.json', 'utf8'));
        const ageRole = JSON.parse(await readFile('data/age-role-compatibility.json', 'utf8'));
        const bucketForCategory = { Protagonist: 'protagonists', Antagonist: 'antagonists' };

        // These real tags have NO row at all in age-role-compatibility.json,
        // under any key -- not a drifted id, an absent one. Renaming a key
        // only helps when a (wrong-named) row already exists to rename;
        // inventing appeal ratings that exist nowhere in the current data is
        // out of scope for this fix (flagged to the repo owner separately).
        // Listed explicitly so a *new* unresolved id -- an actual regression
        // -- still fails this test instead of being silently absorbed into
        // "known gap".
        const KNOWN_MISSING_ENTRIES = [
            'PROTAGONIST_LAST_SURVIVOR',
            'PROTAGONIST_RETIRED_LEGEND',
            'PROTAGONIST_CHARISMATIC_CRIMINAL',
            'PROTAGONIST_DIS_IDEALIST',
            'PROTAGONIST_CYNIC',
            'ANTAGONIST_VENGEFUL_SPIRIT',
            'ANTAGONIST_UNDEAD',
            'ANTAGONIST_ROBBER_WITH_A_HUNDRED_DICKS',
            'ANTAGONIST_OLD_FRIEND_ENEMY',
            'ANTAGONIST_ENEMY_FROM_THE_PAST',
            'ANTAGONIST_RULE_ENFORCER',
            'ANTAGONIST_TYRANT',
            'ANTAGONIST_PATRIARCH',
        ].sort();

        const unresolved = [];
        Object.entries(tagData).forEach(([id, entry]) => {
            const bucketName = bucketForCategory[entry?.CategoryID];
            if (!bucketName) return;

            const roleData = ageRole[bucketName]?.[id];
            if (!roleData || !roleData.ratings) {
                unresolved.push(id);
            }
        });

        expect(unresolved.sort()).toEqual(KNOWN_MISSING_ENTRIES);
    });

    // Same id-drift bug, one bucket over: the Supporting Character shim in
    // src/analysis/ageRoleBreakdown.js:82 rewrites the real
    // SUPPORTINGCHARACTER_ prefix to SUPPORTING_CHARACTER_ before lookup, but
    // that only fixes the prefix -- it does not add back an underscore the
    // real id never had (SUPPORTINGCHARACTER_STEPCHILD / STEPPARENT), so
    // SUPPORTING_CHARACTER_STEP_CHILD / STEP_PARENT still failed to resolve
    // even after the shim ran.
    test('every real Supporting Character tag id resolves in age-role-compatibility.json after the id-shim', async () => {
        const tagData = JSON.parse(await readFile('data/TagData.json', 'utf8'));
        const ageRole = JSON.parse(await readFile('data/age-role-compatibility.json', 'utf8'));

        const KNOWN_MISSING_ENTRIES = [
            'SUPPORTINGCHARACTER_FIRST_VICTIM',
            'SUPPORTINGCHARACTER_MYSTERIOUS_GUIDE',
            'SUPPORTINGCHARACTER_CONCERNED_WIFE',
            'SUPPORTINGCHARACTER_KEY_WITNESS',
            'SUPPORTINGCHARACTER_VILLAINS_RIGHT_HAND',
        ].sort();

        const unresolved = [];
        Object.entries(tagData).forEach(([id, entry]) => {
            if (entry?.CategoryID !== 'SupportingCharacter') return;
            const shimmedId = id.replace('SUPPORTINGCHARACTER_', 'SUPPORTING_CHARACTER_');
            const roleData = ageRole.supportingCharacters?.[shimmedId];
            if (!roleData || !roleData.ratings) {
                unresolved.push(id);
            }
        });

        expect(unresolved.sort()).toEqual(KNOWN_MISSING_ENTRIES);
    });

    // --- Regression guard for the gender-lock drift bug (docs/GAME_RULES.md §8) ---
    // data/TagData.json carries a `gender` field (M/F/U) sourced from the
    // extracted game file's SlotsMale/SlotsFemale/SlotsUnisex parameters -- the
    // actual runtime gating mechanism. age-role-compatibility.json's
    // `locked_gender` must agree with it for every character tag, or the Age &
    // Gender Appeal panel silently shows a role as gender-flexible when the
    // game itself locks it. 37 entries carried this exact drift (all
    // locked_gender: null where TagData.json said M or F) until fixed
    // 2026-09-26; this test pins the fix and catches any future regeneration
    // of either file from re-drifting.
    test('gender lock matches TagData.json\'s Slots-derived source of truth', async () => {
        const tagData = JSON.parse(await readFile('data/TagData.json', 'utf8'));
        const ageRole = JSON.parse(await readFile('data/age-role-compatibility.json', 'utf8'));
        const bucketForCategory = { Protagonist: 'protagonists', Antagonist: 'antagonists', SupportingCharacter: 'supportingCharacters' };

        // Both TRASH/UNETHICAL, RECIPE-gated, and unconfirmed in-game -- parked
        // per docs/KNOWN_ISSUES.md, not resolved here.
        const PARKED_CONFLICTS = new Set([
            'ANTAGONIST_HEADLESS_MIDGETS_HYPNOTISTS',
            'ANTAGONIST_WOMENS_BOOK_CLUB_OF_CANNIBALS',
        ]);

        const mismatches = [];
        Object.entries(tagData).forEach(([id, entry]) => {
            if (PARKED_CONFLICTS.has(id)) return;
            if (entry.gender === undefined || entry.gender === 'U') return; // unisex/non-character: locked_gender stays null

            const bucketName = bucketForCategory[entry.CategoryID];
            if (!bucketName) return;

            const shimmedId = id.replace('SUPPORTINGCHARACTER_', 'SUPPORTING_CHARACTER_');
            const bucket = ageRole[bucketName] || {};
            const roleData = bucket[id] || bucket[shimmedId];
            if (!roleData) return; // covered by the "unresolved" tests above

            if (roleData.locked_gender !== entry.gender) {
                mismatches.push({ id, tagDataGender: entry.gender, lockedGender: roleData.locked_gender });
            }
        });

        expect(mismatches).toEqual([]);
    });

    // --- getValidGenders reads TagData.json's `gender` directly (docs/GAME_RULES.md #8) ---
    // This is the actual UI-facing consumer of the gender field: it decides
    // which gender button(s) render for a role in the Age & Gender Appeal
    // panel. It must read GAME_DATA.tags[rawId].gender (sourced from
    // TagData.json), not data/age-role-compatibility.json's locked_gender copy,
    // so a role missing from that second file (or a future drift in it) can
    // never wrongly show both buttons for a role the game actually locks.
    describe('getValidGenders (gender-button source of truth)', () => {
        let h;

        beforeAll(async () => {
            h = await loadInstrumentedApp();
        });

        const validGendersFor = (rawId) =>
            h.evaluate(`window.HACAnalysisAgeRoleBreakdown.getValidGenders(${JSON.stringify(rawId)})`);

        test('male-locked role shows only the male button', () => {
            expect(validGendersFor('SUPPORTINGCHARACTER_PATRIARCH')).toEqual(['M']);
        });

        test('female-locked role shows only the female button', () => {
            expect(validGendersFor('SUPPORTINGCHARACTER_DAMSEL_IN_DISTRESS')).toEqual(['F']);
        });

        test('unisex role shows both buttons', () => {
            expect(validGendersFor('SUPPORTINGCHARACTER_ANGRY_BOSS')).toEqual(['M', 'F']);
        });

        test('a role absent from age-role-compatibility.json still resolves its real lock from TagData.json', () => {
            // PROTAGONIST_LAST_SURVIVOR has no entry at all in
            // age-role-compatibility.json's protagonists bucket (see the
            // "unresolved" test above) -- the old locked_gender-based lookup
            // silently fell back to ['M', 'F'] for any missing entry,
            // regardless of the role's real lock. TagData.json says this one
            // is genuinely unisex, so both answers agree here, but the lookup
            // path no longer depends on presence in the second file to get
            // that answer right.
            expect(validGendersFor('PROTAGONIST_LAST_SURVIVOR')).toEqual(['M', 'F']);
        });

        test('a collective antagonist with no individual gender slot shows both buttons', () => {
            // ANTAGONIST_CRIMINAL_GANG has no SlotsMale/Female/Unisex at all in
            // the source game file -- a gang isn't a single gendered character.
            // TagData.json carries no `gender` field for it; getValidGenders
            // must treat "no gender field" the same as unisex, not throw or
            // wrongly lock it.
            expect(validGendersFor('ANTAGONIST_CRIMINAL_GANG')).toEqual(['M', 'F']);
        });

        test('every currently-fixed drifted entry now resolves its correct single-gender lock', () => {
            // Spot-check a handful of the 37 entries fixed in the drift
            // regression test above, through the actual UI-facing function.
            expect(validGendersFor('PROTAGONIST_COWBOY')).toEqual(['M']);
            expect(validGendersFor('PROTAGONIST_FARM_GIRL')).toEqual(['F']);
            expect(validGendersFor('ANTAGONIST_EVIL_WITCH')).toEqual(['F']);
            expect(validGendersFor('ANTAGONIST_CRIMINAL_MASTERMIND')).toEqual(['M']);
        });
    });
});
