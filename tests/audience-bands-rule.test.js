import { test, expect } from '@jest/globals';
import { readFile } from 'node:fs/promises';
import '../src/marketing/audienceCompatibility.js';

// Owner ruling 2026-10-08: the band ranges in audienceCompatibility.js are the
// rule. The visible legend must show exactly the same bands, in order.
const { AUDIENCE_BANDS, getScoreClass } = globalThis.HACAudienceCompatibility;

test('the legend in index.html shows exactly the band table, in order', async () => {
    const html = await readFile('index.html', 'utf8');
    const legend = html.slice(html.indexOf('class="compatibility-legend"'));
    const items = [...legend.matchAll(/legend-swatch (\w+)"><\/span> ([^<]+)<\/span>/g)].slice(0, 5).map(m => [m[1], m[2].trim()]);
    expect(items).toEqual(AUDIENCE_BANDS.map(band => [band.className, band.legend]));
});

test.each([[4.0, 'excellent'], [3.95, 'good'], [1.0, 'good'], [0.99, 'neutral'], [-0.99, 'neutral'],
    [-1.0, 'bad'], [-3.0, 'bad'], [-3.01, 'disastrous'], [-5, 'disastrous'], [5, 'excellent']])(
    'boundary: %d is %s', (score, band) => {
        expect(getScoreClass(score)).toBe(band);
    });
