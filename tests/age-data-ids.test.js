import { describe, test, expect } from '@jest/globals';
import { readFile } from 'node:fs/promises';

// Every data file keyed by story element must use the game's own ids, exactly as
// data/TagData.json has them. AgeRoleCompatibility.json once spelled Supporting
// Characters SUPPORTING_CHARACTER_*, the game spells SUPPORTINGCHARACTER_*, and a
// code shim hid the drift: a search for the real id found nothing (owner, 2026-10-05).
const json = async path => JSON.parse(await readFile(path, 'utf8'));

describe('age data uses the game ids', () => {
    test('every AgeRoleCompatibility.json key is a real TagData id of that category', async () => {
        const tagData = await json('data/TagData.json');
        const tags = Array.isArray(tagData) ? tagData : Object.entries(tagData).map(([id, value]) => ({ id, ...value }));
        const categoryOf = new Map(tags.map(tag => [tag.id, tag.CategoryID]));
        const ageRole = await json('data/AgeRoleCompatibility.json');
        const buckets = { protagonists: 'Protagonist', antagonists: 'Antagonist', supportingCharacters: 'SupportingCharacter' };
        const wrong = Object.entries(buckets).flatMap(([bucket, category]) => Object.keys(ageRole[bucket])
            .filter(id => categoryOf.get(id) !== category)
            .map(id => `${bucket}.${id}`));
        expect(wrong).toEqual([]);
    });

    // Owner ruling 2026-10-05: keep these, recorded in docs/KNOWN_ISSUES.md. They
    // exist nowhere in the game data or localization and the app never reads
    // them. The list may only shrink; a new unknown id fails here.
    test('TagsToAgeCompatibilityData.json holds no unknown ids beyond the recorded ten', async () => {
        const tagData = await json('data/TagData.json');
        const gender = await json('data/TagsToAgeCompatibilityData.json');
        const unknown = Object.keys(gender).filter(id => !(id in tagData)).sort();
        expect(unknown).toEqual([
            'ANTAGONIST_JILTED_LOVER', 'ANTAGONIST_MYSTERIOUS_STRANGER', 'ANTAGONIST_SEDUCTRESS', 'ANTAGONIST_STALKER',
            'PROTAGONIST_FEMINIST_ACTIVIST', 'PROTAGONIST_HOUSEWIFE', 'PROTAGONIST_RIGHTEOUS_ZEALOT',
            'PROTAGONIST_SCHOOLGIRL', 'PROTAGONIST_STREET_URCHIN', 'PROTAGONIST_WEALTHY_WIDOW',
        ]);
    });
});
