import { describe, expect, test } from 'vitest';

import { createStandardSchema, issue } from '../test/helpers/standard-schema.js';
import { serializerCompiler, validatorCompiler } from './compilers.js';
import {
  InvalidStandardSchemaError,
  StandardSchemaSerializationError,
  StandardSchemaValidationError,
} from './errors.js';

const compilerContext = {
  method: 'POST',
  url: '/users',
  httpPart: 'body',
  httpStatus: '200',
  contentType: 'application/json',
} as const;

describe('validatorCompiler', () => {
  test('throws when the schema is not standard-schema compatible', () => {
    expect(() =>
      validatorCompiler({
        schema: { type: 'object' },
        ...compilerContext,
      }),
    ).toThrow(InvalidStandardSchemaError);
  });

  test('returns validated value for synchronous success', () => {
    const schema = createStandardSchema((value) => ({ value: { ok: value } }));
    const validate = validatorCompiler({ schema, ...compilerContext });

    expect(validate('payload')).toEqual({
      value: { ok: 'payload' },
    });
  });

  test('returns validation error for synchronous failures', () => {
    const schema = createStandardSchema(() => ({
      issues: [issue('Required', ['name'])],
    }));
    const validate = validatorCompiler({ schema, ...compilerContext });
    const result = validate(null);

    expect(result).toEqual({
      error: expect.any(StandardSchemaValidationError),
    });
    expect((result as { error: StandardSchemaValidationError }).error.message).toBe(
      '$.name: Required',
    );
  });

  test('resolves async validation success', async () => {
    const schema = createStandardSchema(async (value) => ({ value: Number(value) }));
    const validate = validatorCompiler({ schema, ...compilerContext });
    const result = validate('42');

    const resolved = await (result as Promise<{ value?: number }>);
    expect(resolved).toEqual({ value: 42 });
  });

  test('resolves async validation failures', async () => {
    const schema = createStandardSchema(async () => ({
      issues: [issue('Too small', ['age'])],
    }));
    const validate = validatorCompiler({ schema, ...compilerContext });
    const result = validate({ age: -1 });

    const resolved = await (result as Promise<{ error?: StandardSchemaValidationError }>);
    expect(resolved.error).toBeInstanceOf(StandardSchemaValidationError);
    expect(resolved.error?.message).toBe('$.age: Too small');
  });
});

describe('serializerCompiler', () => {
  test('throws when the schema is not standard-schema compatible', () => {
    expect(() =>
      serializerCompiler({
        schema: {},
        ...compilerContext,
      }),
    ).toThrow(InvalidStandardSchemaError);
  });

  test('serializes validated synchronous payloads', () => {
    const schema = createStandardSchema((value) => ({ value }));
    const serialize = serializerCompiler({ schema, ...compilerContext });

    expect(serialize({ id: 'user-1' })).toBe('{"id":"user-1"}');
  });

  test('throws serialization error when validation fails', () => {
    const schema = createStandardSchema(() => ({
      issues: [issue('Expected string', ['title'])],
    }));
    const serialize = serializerCompiler({ schema, ...compilerContext });

    expect(() => serialize({ title: 123 })).toThrow(StandardSchemaSerializationError);
  });

  test('falls back to safeParse for async validate implementations', () => {
    const schema = createStandardSchema((value) => Promise.resolve({ value }), {
      safeParse: (value: unknown) => ({ success: true, data: value }),
    });
    const serialize = serializerCompiler({ schema, ...compilerContext });

    expect(serialize({ ready: true })).toBe('{"ready":true}');
  });

  test('throws when only async validation is available', () => {
    const schema = createStandardSchema((value) => Promise.resolve({ value }));
    const serialize = serializerCompiler({ schema, ...compilerContext });

    expect(() => serialize({ id: 1 })).toThrow(
      'fastify-standard-schema response schemas must validate synchronously',
    );
  });
});
