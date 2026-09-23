import { loadInstrumentedApp } from './helpers/legacyHarness.js';

/**
 * The status line under the distribution toggles.
 *
 * Behemoth carries two effects on two separate gates: the +25% boost rides on
 * the production budget the toggle stands for, so it is live whenever the toggle
 * is on, while the slower decay needs commercial > 9. Boutique only ever carries
 * slower decay, gated on artistic > 9.
 *
 * A film can therefore sit in any combination of those states, and the point of
 * this line is to say which half is actually doing something. These pin the
 * wording so the message cannot quietly start claiming an effect that the grid
 * is not applying.
 */
describe('Distribution — studio policy status line', () => {
    let h;

    const describe_ = (options) => h.call('HACDistributionPlanner.describeStudioPolicies', options);

    beforeAll(async () => {
        h = await loadInstrumentedApp();
    });

    describe('nothing active', () => {
        test('no policy produces an empty line', () => {
            expect(describe_({ behemoth: false, boutique: false, commercialScore: 10, artisticScore: 10 }))
                .toBe('');
        });

        test('a missing options object is treated as nothing active', () => {
            expect(describe_(undefined)).toBe('');
        });
    });

    describe('Behemoth alone', () => {
        test('below the decay gate it reports the boost and names the gate', () => {
            expect(describe_({ behemoth: true, boutique: false, commercialScore: 8, artisticScore: 0 }))
                .toBe('Behemoth: +25% Boost Active (Slower decay at commercial 9+)');
        });

        test('at exactly 9 the decay is still not active', () => {
            expect(describe_({ behemoth: true, boutique: false, commercialScore: 9, artisticScore: 0 }))
                .toBe('Behemoth: +25% Boost Active (Slower decay at commercial 9+)');
        });

        test('above 9 it reports both halves', () => {
            expect(describe_({ behemoth: true, boutique: false, commercialScore: 9.5, artisticScore: 0 }))
                .toBe('Behemoth: +25% Boost + Slower Decay Active');
        });

        test('the boost is reported even at the lowest score', () => {
            expect(describe_({ behemoth: true, boutique: false, commercialScore: 0, artisticScore: 0 }))
                .toContain('+25% Boost Active');
        });

        test('the artistic score never gates Behemoth', () => {
            const low = describe_({ behemoth: true, boutique: false, commercialScore: 10, artisticScore: 0 });
            const high = describe_({ behemoth: true, boutique: false, commercialScore: 10, artisticScore: 10 });
            expect(low).toBe(high);
        });
    });

    describe('Boutique alone', () => {
        test('below the gate it names the gate', () => {
            expect(describe_({ behemoth: false, boutique: true, commercialScore: 0, artisticScore: 8 }))
                .toBe('Boutique: Slower Decay at artistic 9+');
        });

        test('at exactly 9 the decay is still not active', () => {
            expect(describe_({ behemoth: false, boutique: true, commercialScore: 0, artisticScore: 9 }))
                .toBe('Boutique: Slower Decay at artistic 9+');
        });

        test('above 9 the decay is reported active', () => {
            expect(describe_({ behemoth: false, boutique: true, commercialScore: 0, artisticScore: 9.5 }))
                .toBe('Boutique: Slower Decay Active');
        });

        test('Boutique never claims the Behemoth boost', () => {
            expect(describe_({ behemoth: false, boutique: true, commercialScore: 10, artisticScore: 10 }))
                .not.toContain('Boost');
        });

        test('the commercial score never gates Boutique', () => {
            const low = describe_({ behemoth: false, boutique: true, commercialScore: 0, artisticScore: 10 });
            const high = describe_({ behemoth: false, boutique: true, commercialScore: 10, artisticScore: 10 });
            expect(low).toBe(high);
        });
    });

    describe('both policies held at once', () => {
        test('both gates open reports both as active, Behemoth first', () => {
            expect(describe_({ behemoth: true, boutique: true, commercialScore: 10, artisticScore: 10 }))
                .toBe('Behemoth: +25% Boost + Slower Decay Active | Boutique: Slower Decay Active');
        });

        test('each policy reads its own axis independently', () => {
            expect(describe_({ behemoth: true, boutique: true, commercialScore: 10, artisticScore: 5 }))
                .toBe('Behemoth: +25% Boost + Slower Decay Active | Boutique: Slower Decay at artistic 9+');

            expect(describe_({ behemoth: true, boutique: true, commercialScore: 5, artisticScore: 10 }))
                .toBe('Behemoth: +25% Boost Active (Slower decay at commercial 9+) | Boutique: Slower Decay Active');
        });

        test('neither gate open still reports the Behemoth boost', () => {
            expect(describe_({ behemoth: true, boutique: true, commercialScore: 5, artisticScore: 5 }))
                .toBe('Behemoth: +25% Boost Active (Slower decay at commercial 9+) | Boutique: Slower Decay at artistic 9+');
        });
    });

    // The line exists to describe the grid. If it claims slower decay, the
    // planner must actually be applying the slower rate, or the message is a lie.
    describe('the line agrees with the grid it describes', () => {
        const BASE_DECAY = 0.8;

        const decayRate = (commercialScore, artisticScore, behemoth, boutique) =>
            h.call('HACDistributionPlanner.resolveDecayRate', commercialScore, artisticScore, behemoth, boutique);

        test.each([
            [10, 0, true, false],
            [9, 0, true, false],
            [5, 0, true, false],
            [0, 10, false, true],
            [0, 9, false, true],
            [10, 10, true, true],
            [5, 5, true, true],
        ])('score %p/%p behemoth=%p boutique=%p', (com, art, behemoth, boutique) => {
            const line = describe_({ behemoth, boutique, commercialScore: com, artisticScore: art });
            const claimsActiveDecay = line.includes('Slower Decay Active');
            const gridSlowsDecay = decayRate(com, art, behemoth, boutique) > BASE_DECAY;

            expect(claimsActiveDecay).toBe(gridSlowsDecay);
        });
    });
});
