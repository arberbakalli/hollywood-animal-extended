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

    test('stylesheet includes appeal rating color classes', async () => {
        const styles = await readFile('styles.css', 'utf8');
        expect(styles).toContain('.appeal-excellent');
        expect(styles).toContain('.appeal-very-good');
        expect(styles).toContain('.appeal-good');
        expect(styles).toContain('.appeal-neutral');
        expect(styles).toContain('.appeal-bad');
        expect(styles).toContain('.appeal-disastrous');
    });
});
