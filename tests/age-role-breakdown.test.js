import { describe, expect, test } from '@jest/globals';
import { readFile } from 'node:fs/promises';

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
});
