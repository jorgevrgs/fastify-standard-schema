import type { StandardSchemaV1 } from '@standard-schema/spec';
import { describe, expect, test } from 'vitest';

import {
  InvalidStandardSchemaError,
  StandardSchemaSerializationError,
  StandardSchemaValidationError,
  formatIssues,
} from './errors.js';

describe('formatIssues', () => {
  test('formats array paths', () => {
    expect(
      formatIssues([
        { message: 'Required', path: ['user', 'name'] },
        { message: 'Too small', path: ['items', 0, 'qty'] },
      ]),
    ).toBe('$.user.name: Required; $.items[0].qty: Too small');
  });

  test('formats string paths with bracket notation', () => {
    const stringPathIssue = {
      message: 'Invalid',
      path: 'user.addresses[2].zip',
    } as unknown as StandardSchemaV1.Issue;

    expect(formatIssues([stringPathIssue])).toBe('$.user.addresses[2].zip: Invalid');
  });

  test('uses root path when issue path is empty', () => {
    expect(formatIssues([{ message: 'Invalid payload' }])).toBe('$: Invalid payload');
  });

  test('formats object path segments with keys', () => {
    expect(formatIssues([{ message: 'Bad', path: [{ key: 'meta' }] }])).toBe('$.meta: Bad');
  });
});

describe('StandardSchemaValidationError', () => {
  test('exposes fastify validation metadata', () => {
    const issues = [{ message: 'Required', path: ['id'] }];
    const error = new StandardSchemaValidationError(issues);

    expect(error.name).toBe('StandardSchemaValidationError');
    expect(error.code).toBe('FST_ERR_VALIDATION');
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('$.id: Required');
    expect(error.issues).toEqual(issues);
  });
});

describe('StandardSchemaSerializationError', () => {
  test('exposes fastify serialization metadata', () => {
    const issues = [{ message: 'Expected string', path: ['title'] }];
    const error = new StandardSchemaSerializationError(issues);

    expect(error.name).toBe('StandardSchemaSerializationError');
    expect(error.code).toBe('FST_ERR_RESPONSE_SERIALIZATION');
    expect(error.statusCode).toBe(500);
    expect(error.message).toBe('$.title: Expected string');
    expect(error.issues).toEqual(issues);
  });
});

describe('InvalidStandardSchemaError', () => {
  test('includes the schema location in the message', () => {
    const error = new InvalidStandardSchemaError('POST /users body');

    expect(error.name).toBe('InvalidStandardSchemaError');
    expect(error.message).toContain('POST /users body');
    expect(error.message).toContain('Standard Schema-compatible schema');
  });
});
