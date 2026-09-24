/**
 * Lesson 3 Guard: Causation Isolation
 *
 * Rule: Isolate causes. Ruling out cause A does not mean causes B-Z are ruled out.
 * This test verifies we can identify root causes uniquely, not just find "any problem".
 */

import { describe, test, expect } from '@jest/globals';

describe('Causation Isolation', () => {
  test('detects only the specific failing condition, not all possible failures', () => {
    // Simulate a function that validates three independent conditions
    const validateScript = (genre, protagonist, finale) => {
      const errors = [];
      if (!genre) errors.push('Missing Genre');
      if (!protagonist) errors.push('Missing Protagonist');
      if (!finale) errors.push('Missing Finale');
      return errors;
    };

    // Case A: Missing Genre only
    const errorsA = validateScript(false, true, true);
    expect(errorsA).toEqual(['Missing Genre']);
    expect(errorsA).not.toContain('Missing Protagonist');
    expect(errorsA).not.toContain('Missing Finale');

    // Case B: Missing Protagonist only
    const errorsB = validateScript(true, false, true);
    expect(errorsB).toEqual(['Missing Protagonist']);
    expect(errorsB).not.toContain('Missing Genre');

    // Case C: Missing Finale only
    const errorsC = validateScript(true, true, false);
    expect(errorsC).toEqual(['Missing Finale']);
    expect(errorsC).not.toContain('Missing Genre');

    // Case D: Multiple missing (still distinct errors)
    const errorsD = validateScript(false, false, true);
    expect(errorsD.length).toBe(2);
    expect(errorsD).toContain('Missing Genre');
    expect(errorsD).toContain('Missing Protagonist');
    expect(errorsD).not.toContain('Missing Finale');
  });

  test('does not report "everything is broken" when isolating a single cause', () => {
    const checkSystem = (cpuOk, memoryOk, diskOk) => {
      if (!cpuOk) return 'CPU failed';
      if (!memoryOk) return 'Memory failed';
      if (!diskOk) return 'Disk failed';
      return 'All OK';
    };

    // CPU fails, others pass
    expect(checkSystem(false, true, true)).toBe('CPU failed');
    expect(checkSystem(false, true, true)).not.toBe('Memory failed');

    // Memory fails, others pass
    expect(checkSystem(true, false, true)).toBe('Memory failed');
    expect(checkSystem(true, false, true)).not.toBe('CPU failed');
  });
});
