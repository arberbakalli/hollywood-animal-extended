/**
 * Lesson 15 Guard: Negative Assertions with State
 *
 * Rule: Negative tests must verify state, not just that an exception was thrown.
 * Exception proof without state verification is vacuous (exception may be from anywhere).
 */

import { describe, test, expect } from '@jest/globals';

describe('Negative Assertions', () => {
  test('catching exception alone is not enough - state must be verified too', () => {
    const processPayment = (amount, account) => {
      if (amount > account.balance) {
        throw new Error('Insufficient funds');
      }
      account.balance -= amount;
      return true;
    };

    const account = { balance: 100 };

    // Bad test (only checks exception):
    // expect(() => processPayment(150, account)).toThrow('Insufficient funds');
    // ^ This passes even if processPayment silently did nothing

    // Good test (checks exception AND state):
    const balanceBefore = account.balance;
    expect(() => processPayment(150, account)).toThrow('Insufficient funds');
    expect(account.balance).toBe(balanceBefore); // State unchanged
  });

  test('negative case must leave state unmodified when error occurs', () => {
    const addTag = (script, tag) => {
      if (!tag || tag.id === '' || tag.category === '') {
        throw new Error('Invalid tag');
      }
      script.tags.push(tag);
      return true;
    };

    const script = { tags: [{ id: 'ACTION', category: 'Genre' }] };
    const countBefore = script.tags.length;

    // Invalid tag (missing id)
    expect(() => addTag(script, { id: '', category: 'Theme' })).toThrow('Invalid tag');
    expect(script.tags).toHaveLength(countBefore); // No tag was added

    // Invalid tag (missing category)
    expect(() => addTag(script, { id: 'TEST', category: '' })).toThrow('Invalid tag');
    expect(script.tags).toHaveLength(countBefore); // Still unchanged
  });

  test('exception @throws is not a substitute for state assertion', () => {
    const deleteItem = (list, index) => {
      if (index < 0 || index >= list.length) {
        throw new RangeError('Index out of bounds');
      }
      list.splice(index, 1);
    };

    const list = ['a', 'b', 'c'];

    // Boundary case: negative index
    expect(() => deleteItem(list, -1)).toThrow(RangeError);
    expect(list).toHaveLength(3); // List still has 3 items (not deleted)

    // Boundary case: index beyond length
    expect(() => deleteItem(list, 10)).toThrow(RangeError);
    expect(list).toHaveLength(3); // Still 3 items
  });
});
