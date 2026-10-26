import { loadLegacyScript } from './helpers/legacyHarness.js';

test('clearing a Genre percentage keeps finite 5-percent shares totaling 100', async () => {
    const h = await loadLegacyScript();
    const shares = h.evaluate(`(() => {
        function makeRow(value) {
            const input = { value };
            const slider = { value, style: { setProperty() {} } };
            return {
                input,
                slider,
                querySelector(selector) {
                    if (selector === '.percent-input') return input;
                    if (selector === '.percent-slider') return slider;
                    return null;
                }
            };
        }
        const rows = [makeRow(''), makeRow('50')];
        document.getElementById = id => id === 'inputs-genre-generator'
            ? { querySelectorAll: () => rows }
            : null;

        HACGenreMix.applyGenrePercent('generator', rows[0], parseFloat(rows[0].input.value));
        return rows.map(row => ({ input: Number(row.input.value), slider: Number(row.slider.value) }));
    })()`);

    expect(shares).toHaveLength(2);
    for (const share of shares) {
        expect(Number.isFinite(share.input)).toBe(true);
        expect(share.input).toBeGreaterThanOrEqual(5);
        expect(share.input % 5).toBe(0);
        expect(share.slider).toBe(share.input);
    }
    expect(shares.reduce((total, share) => total + share.input, 0)).toBe(100);
});
