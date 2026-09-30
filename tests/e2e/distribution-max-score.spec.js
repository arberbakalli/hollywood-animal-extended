import { test, expect, openHollywood } from '../fixtures/base.js';

const screenings = async (steps, elementName) => {
  const text = await steps.on(elementName, 'MarketingRelease').getText();
  return Number(text.replace(/[^0-9]/g, ''));
};

const getWeekAttribute = async (steps, weekNumber, attribute) => {
  const values = await steps.getAll('weekCards', 'MarketingRelease', { extractAttribute: attribute });
  return Number(values[weekNumber - 1]);
};

test.describe('Marketing Release — maximum score distribution (score 10)', () => {
  test.beforeEach(async ({ steps }) => {
    await openHollywood(steps);
    await steps.on('marketTab', 'Navigation').click();
  });

  // Maximum commercial score: 10.
  // Formula: W1 = score × 2 × 1000, W2 = score × 1 × 1000, W3-8 = previous × 0.8
  test('TC04-MAX-001 commercial score 10 produces high demand across all weeks', async ({ steps }) => {
    await steps.setSliderValue('commercialScoreSlider', 'MarketingRelease', 10);

    const values = await steps.getAll('weekCards', 'MarketingRelease', { extractAttribute: 'data-demand' });
    const numValues = values.map(Number);

    // Week 1 at score 10 = 10 × 2 × 1000 = 20,000
    expect(numValues[0]).toBe(20000);
    // Week 2 at score 10 = 10 × 1 × 1000 = 10,000
    expect(numValues[1]).toBe(10000);
    // Week 3 = week 2 × 0.8 = 8,000
    expect(numValues[2]).toBe(8000);
    // Week 8 should be significantly lower due to decay
    expect(numValues[7]).toBeLessThan(5000);
  });

  // Week one demand at max score should be 20,000 screenings
  test('TC04-MAX-002 week one at score 10 shows 20,000 screenings', async ({ steps }) => {
    await steps.setSliderValue('commercialScoreSlider', 'MarketingRelease', 10);

    const week1 = await screenings(steps, 'weekOneValue');
    expect(week1).toBe(20000);
  });

  // At default owned capacity (3185), week one at score 10 requires substantial rental
  test('TC04-MAX-003 week one at score 10 splits into owned and rented demand', async ({ steps }) => {
    await steps.setSliderValue('commercialScoreSlider', 'MarketingRelease', 10);

    const demands = await steps.getAll('weekCards', 'MarketingRelease', { extractAttribute: 'data-demand' });
    const fromOwnedList = await steps.getAll('weekCards', 'MarketingRelease', { extractAttribute: 'data-from-owned' });
    const rentedList = await steps.getAll('weekCards', 'MarketingRelease', { extractAttribute: 'data-rented' });

    const demand = Number(demands[0]);
    const fromOwned = Number(fromOwnedList[0]);
    const rented = Number(rentedList[0]);

    // Week one demand should be high (20,000) requiring rental
    expect(demand).toBe(20000);
    expect(rented).toBeGreaterThan(0);
    // Owned + rented should equal total demand
    expect(fromOwned + rented).toBe(demand);
  });

  // Max score with increased owned capacity: shifting the split without changing demand
  test('TC04-MAX-004 increasing owned capacity at score 10 shifts rental load but keeps total demand constant', async ({ steps }) => {
    await steps.setSliderValue('commercialScoreSlider', 'MarketingRelease', 10);

    const demandsAtMax = await steps.getAll('weekCards', 'MarketingRelease', { extractAttribute: 'data-demand' });
    const rentedBefore = await steps.getAll('weekCards', 'MarketingRelease', { extractAttribute: 'data-rented' });
    const demandAtMax = Number(demandsAtMax[0]);

    await steps.on('ownedScreeningsInput', 'MarketingRelease').fill('10000');

    const demandsAfter = await steps.getAll('weekCards', 'MarketingRelease', { extractAttribute: 'data-demand' });
    const rentedAfter = await steps.getAll('weekCards', 'MarketingRelease', { extractAttribute: 'data-rented' });

    // Demand is unchanged; only the split changes
    expect(Number(demandsAfter[0])).toBe(demandAtMax);
    // With 10,000 owned theatres, week one rental should be reduced
    expect(Number(rentedAfter[0])).toBeLessThan(Number(rentedBefore[0]));
  });

  // Decay is consistent across the entire run at max score
  test('TC04-MAX-005 decay rate is consistent at score 10', async ({ steps }) => {
    await steps.setSliderValue('commercialScoreSlider', 'MarketingRelease', 10);

    const values = await steps.getAll('weekCards', 'MarketingRelease', { extractAttribute: 'data-demand' });
    const numValues = values.map(Number);

    // Each week should be less than the previous (consistent decay)
    for (let i = 1; i < numValues.length; i++) {
      expect(numValues[i]).toBeLessThan(numValues[i - 1]);
    }

    // Check that decay is approximately 80% (allow for rounding variance)
    for (let i = 1; i < 4; i++) {
      const ratio = numValues[i] / numValues[i - 1];
      expect(ratio).toBeCloseTo(0.8, 0);
    }
  });

  // Bonus interaction at max score: Striking Image
  test('TC04-MAX-006 Striking Image bonus applies at score 10', async ({ steps }) => {
    await steps.setSliderValue('commercialScoreSlider', 'MarketingRelease', 10);
    const baselineWeek1 = await screenings(steps, 'weekOneValue');

    await steps.on('strikingImageToggle', 'MarketingRelease').check();

    const boostedWeek1 = await screenings(steps, 'weekOneValue');
    expect(boostedWeek1).toBeGreaterThan(baselineWeek1);
  });

  // Bonus interaction at max score: Artistic Ability
  test('TC04-MAX-007 Artistic Ability bonus applies at score 10', async ({ steps }) => {
    await steps.setSliderValue('commercialScoreSlider', 'MarketingRelease', 10);
    const baselineWeek1 = await screenings(steps, 'weekOneValue');

    await steps.on('artisticAbilityToggle', 'MarketingRelease').check();

    const boostedWeek1 = await screenings(steps, 'weekOneValue');
    expect(boostedWeek1).toBeGreaterThan(baselineWeek1);
  });

  // Score 10 + both bonuses + genre-mix modifiers
  test('TC04-MAX-008 combined bonuses and genre mix interact at max score', async ({ steps }) => {
    await steps.setSliderValue('commercialScoreSlider', 'MarketingRelease', 10);
    await steps.setSliderValue('artisticScoreSlider', 'MarketingRelease', 5);

    await steps.on('strikingImageToggle', 'MarketingRelease').check();
    await steps.on('artisticAbilityToggle', 'MarketingRelease').check();

    const week1 = await screenings(steps, 'weekOneValue');
    expect(week1).toBeGreaterThan(20000);
  });
});
