import { describe, expect, it } from 'vitest';
import { resolveRandomRange } from './randomRange.js';

describe('resolveRandomRange', () => {
  it('returns fixed numeric values', () => {
    expect(resolveRandomRange(4, 1)).toBe(4);
  });

  it('resolves min/max ranges with the provided random function', () => {
    expect(resolveRandomRange({ min: 10, max: 20 }, 1, () => 0.25)).toBe(12.5);
  });

  it('falls back when value is missing', () => {
    expect(resolveRandomRange(undefined, 7)).toBe(7);
  });
});