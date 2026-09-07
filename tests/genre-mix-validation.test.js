describe('Genre mix percentage validation', () => {
  // Genre mix must:
  // - Accept 5% increments (5, 10, 15, ..., 95, 100)
  // - Sum to exactly 100% when multiple genres selected
  // - Allow single genre at any value 5-100%
  // - Reject invalid combinations

  function isValidIncrement(percent) {
    return percent > 0 && percent % 5 === 0;
  }

  function isValidSingleGenre(percent) {
    return percent >= 5 && percent <= 100 && isValidIncrement(percent);
  }

  function isValidMix(genres) {
    // All must be valid increments
    if (!genres.every(isValidIncrement)) return false;
    // All must be >= 5
    if (genres.some(p => p < 5)) return false;
    // Sum must be exactly 100
    return genres.reduce((a, b) => a + b, 0) === 100;
  }

  test('single genre: 5% is valid minimum', () => {
    expect(isValidSingleGenre(5)).toBe(true);
  });

  test('single genre: 100% is valid maximum', () => {
    expect(isValidSingleGenre(100)).toBe(true);
  });

  test('single genre: all 5% increments 5-100 are valid', () => {
    for (let p = 5; p <= 100; p += 5) {
      expect(isValidSingleGenre(p)).toBe(true);
    }
  });

  test('single genre: 0% is invalid', () => {
    expect(isValidSingleGenre(0)).toBe(false);
  });

  test('single genre: 3% (non-5-increment) is invalid', () => {
    expect(isValidSingleGenre(3)).toBe(false);
  });

  test('single genre: 102% exceeds max', () => {
    expect(isValidSingleGenre(102)).toBe(false);
  });

  test('mix: 50% + 50% is valid', () => {
    expect(isValidMix([50, 50])).toBe(true);
  });

  test('mix: 25% + 25% + 25% + 25% is valid', () => {
    expect(isValidMix([25, 25, 25, 25])).toBe(true);
  });

  test('mix: 60% + 40% is valid', () => {
    expect(isValidMix([60, 40])).toBe(true);
  });

  test('mix: 5% + 95% is valid boundary', () => {
    expect(isValidMix([5, 95])).toBe(true);
  });

  test('mix: 50% + 50% + 5% (sums to 105) is invalid', () => {
    expect(isValidMix([50, 50, 5])).toBe(false);
  });

  test('mix: 50% + 49% (non-increment) is invalid', () => {
    expect(isValidMix([50, 49])).toBe(false);
  });

  test('mix: 50% + 50% - 5% (only 95%) is invalid', () => {
    expect(isValidMix([50, 45])).toBe(false);
  });

  test('mix: contains 0% is invalid', () => {
    expect(isValidMix([50, 50, 0])).toBe(false);
  });

  test('mix: 3% + 97% (non-increment) is invalid', () => {
    expect(isValidMix([3, 97])).toBe(false);
  });

  test('three genres: 30% + 30% + 40% is valid', () => {
    expect(isValidMix([30, 30, 40])).toBe(true);
  });

  test('three genres: 20% + 20% + 20% (sums to 60) is invalid', () => {
    expect(isValidMix([20, 20, 20])).toBe(false);
  });

  test('all genres equal: 2 × 50%, 4 × 25%, 5 × 20% are all valid', () => {
    expect(isValidMix([50, 50])).toBe(true);
    expect(isValidMix([25, 25, 25, 25])).toBe(true);
    expect(isValidMix([20, 20, 20, 20, 20])).toBe(true);
  });
});
