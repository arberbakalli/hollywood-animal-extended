/**
 * Lesson 13 Guard: Optional Filter Boundaries
 *
 * Rule: Optional filter must support "all" case. Logic should not require filter when filter is semantically optional.
 */

import { describe, test, expect } from '@jest/globals';

describe('Filter Boundaries', () => {
  test('optional filter can select "all" without special handling', () => {
    const applyFilter = (items, categoryFilter) => {
      // Filter is optional; if empty, "all" is valid
      if (!categoryFilter || categoryFilter === '') {
        return items; // All items when filter is empty
      }
      return items.filter(i => i.category === categoryFilter);
    };

    const items = [
      { id: 1, category: 'Action' },
      { id: 2, category: 'Drama' },
      { id: 3, category: 'Comedy' }
    ];

    // Empty filter returns all
    expect(applyFilter(items, '')).toHaveLength(3);
    expect(applyFilter(items, null)).toHaveLength(3);
    expect(applyFilter(items, undefined)).toHaveLength(3);

    // Specific filter narrows
    expect(applyFilter(items, 'Action')).toHaveLength(1);
    expect(applyFilter(items, 'Drama')).toHaveLength(1);
  });

  test('does not require a "select all" option when logic supports it implicitly', () => {
    const scoreValues = [1, 2, 3, 4, 5];
    const filterByMinScore = (items, minScore) => {
      // If minScore is 0 or undefined, show all
      if (!minScore || minScore === 0) {
        return items;
      }
      return items.filter(i => i >= minScore);
    };

    // Minimum score of 0 shows all
    expect(filterByMinScore(scoreValues, 0)).toHaveLength(5);
    expect(filterByMinScore(scoreValues, undefined)).toHaveLength(5);

    // Minimum score of 3 filters correctly
    expect(filterByMinScore(scoreValues, 3)).toHaveLength(3);
  });

  test('optional field does not require mandatory selection', () => {
    const validateScript = (genre, optionalTheme) => {
      // Genre is required, Theme is optional
      const errors = [];
      if (!genre) errors.push('Genre required');
      if (optionalTheme === '' || optionalTheme === null) {
        // Optional field being empty is NOT an error
        return errors; // Proceeds without error
      }
      return errors;
    };

    // Theme unselected (null or empty) should not error
    expect(validateScript('Action', null)).toEqual([]);
    expect(validateScript('Action', '')).toEqual([]);

    // Genre unselected should error
    expect(validateScript(null, 'Comedy')).toContain('Genre required');
  });
});
