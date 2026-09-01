import { describe, expect, test } from 'vitest';

import { isStandardSchema } from './utils.js';

describe('isStandardSchema', () => {
  test('returns false for non-objects', () => {
    expect(isStandardSchema(null)).toBe(false);
    expect(isStandardSchema(undefined)).toBe(false);
    expect(isStandardSchema('schema')).toBe(false);
    expect(isStandardSchema(42)).toBe(false);
  });

  test('returns false for plain objects without a standard property', () => {
    expect(isStandardSchema({})).toBe(false);
    expect(isStandardSchema({ validate: () => ({ value: true }) })).toBe(false);
  });

  test('returns false when the standard marker has the wrong version', () => {
    expect(
      isStandardSchema({
        '~standard': {
          version: 2,
          validate: () => ({ value: true }),
        },
      }),
    ).toBe(false);
  });

  test('returns false when validate is not a function', () => {
    expect(
      isStandardSchema({
        '~standard': {
          version: 1,
          validate: 'not-a-function',
        },
      }),
    ).toBe(false);
  });

  test('returns true for schema-like functions', () => {
    const schema = Object.assign((value: unknown) => ({ value }), {
      '~standard': {
        version: 1,
        validate: (value: unknown) => ({ value }),
      },
    });

    expect(isStandardSchema(schema)).toBe(true);
  });

  test('returns true for valid standard schema objects', () => {
    expect(
      isStandardSchema({
        '~standard': {
          version: 1,
          validate: () => ({ value: 'ok' }),
        },
      }),
    ).toBe(true);
  });
});
