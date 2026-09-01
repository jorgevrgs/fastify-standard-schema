import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { FastifySchemaCompiler, FastifySerializerCompiler, SafePromiseLike } from 'fastify';

import {
  InvalidStandardSchemaError,
  StandardSchemaSerializationError,
  StandardSchemaValidationError,
} from './errors.js';
import { isStandardSchema } from './utils.js';

type StandardIssue = ReadonlyArray<StandardSchemaV1.Issue>;
type StandardValidationResult = { issues?: StandardIssue; value?: unknown };

function isObject(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    (typeof value === 'object' || typeof value === 'function') &&
    value !== null &&
    typeof Reflect.get(value, 'then') === 'function'
  );
}

function normalizeValidationError(error: unknown): StandardIssue | null {
  if (!isObject(error)) {
    return null;
  }

  const standardIssues = Reflect.get(error, 'issues');

  if (Array.isArray(standardIssues)) {
    return standardIssues as StandardIssue;
  }

  const joiDetails = Reflect.get(error, 'details');

  if (Array.isArray(joiDetails)) {
    return joiDetails.map((detail) => {
      if (!isObject(detail)) {
        return {
          message: String(detail),
        } as StandardSchemaV1.Issue;
      }

      return {
        message: String(Reflect.get(detail, 'message') ?? 'Validation error'),
        path: Reflect.get(detail, 'path') as StandardSchemaV1.Issue['path'],
      } satisfies StandardSchemaV1.Issue;
    });
  }

  const yupInner = Reflect.get(error, 'inner');

  if (Array.isArray(yupInner) && yupInner.length > 0) {
    return yupInner.map((issue) => {
      if (!isObject(issue)) {
        return {
          message: String(issue),
        } as StandardSchemaV1.Issue;
      }

      return {
        message: String(Reflect.get(issue, 'message') ?? 'Validation error'),
        path: Reflect.get(issue, 'path') as StandardSchemaV1.Issue['path'],
      } satisfies StandardSchemaV1.Issue;
    });
  }

  if ('message' in error) {
    return [
      {
        message: String(Reflect.get(error, 'message')),
        path: Reflect.get(error, 'path') as StandardSchemaV1.Issue['path'],
      } satisfies StandardSchemaV1.Issue,
    ];
  }

  return null;
}

function normalizeValidationResult(result: unknown): StandardValidationResult {
  if (!isObject(result)) {
    return { value: result };
  }

  if (Array.isArray(Reflect.get(result, 'issues')) || 'value' in result) {
    return result as StandardValidationResult;
  }

  if ('success' in result) {
    if (Reflect.get(result, 'success') === true) {
      return {
        value: Reflect.get(result, 'data'),
      };
    }

    const issues = normalizeValidationError(Reflect.get(result, 'error'));

    if (issues) {
      return { issues };
    }
  }

  if ('error' in result || 'value' in result) {
    const error = Reflect.get(result, 'error');

    if (error != null) {
      const issues = normalizeValidationError(error);

      if (issues) {
        return { issues };
      }

      throw error;
    }

    return {
      value: Reflect.get(result, 'value'),
    };
  }

  return { value: result };
}

function getSynchronousValidationResult(
  schema: StandardSchemaV1,
  value: unknown,
): StandardValidationResult | null {
  const candidates = [
    Reflect.get(schema, 'validateSync'),
    Reflect.get(schema, 'safeParse'),
    Reflect.get(schema, 'parse'),
    Reflect.get(schema, 'validate'),
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== 'function') {
      continue;
    }

    try {
      const result = Reflect.apply(candidate, schema, [value]);

      if (isPromiseLike(result)) {
        continue;
      }

      return normalizeValidationResult(result);
    } catch (error) {
      const issues = normalizeValidationError(error);

      if (issues) {
        return { issues };
      }

      throw error;
    }
  }

  return null;
}

export const validatorCompiler: FastifySchemaCompiler<unknown> = ({
  schema,
  method,
  url,
  httpPart,
}) => {
  if (!isStandardSchema(schema)) {
    throw new InvalidStandardSchemaError(`${method} ${url} ${httpPart}`);
  }

  return (value) => {
    try {
      const result = schema['~standard'].validate(value);

      if (isPromiseLike(result)) {
        return result
          .then((resolved) => {
            if (resolved.issues) {
              return {
                error: new StandardSchemaValidationError(resolved.issues),
              };
            }

            return {
              value: resolved.value,
            };
          })
          .catch((error: unknown) => ({
            error: error instanceof Error ? error : new Error(String(error)),
          })) as unknown as SafePromiseLike<{ error?: Error; value?: unknown }>;
      }

      if (result.issues) {
        return {
          error: new StandardSchemaValidationError(result.issues),
        };
      }

      return {
        value: result.value,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  };
};

export const serializerCompiler: FastifySerializerCompiler<unknown> = ({
  schema,
  method,
  url,
  httpStatus,
}) => {
  if (!isStandardSchema(schema)) {
    throw new InvalidStandardSchemaError(`${method} ${url} ${httpStatus}`);
  }

  return (value) => {
    const result = schema['~standard'].validate(value);

    if (isPromiseLike(result)) {
      const syncResult = getSynchronousValidationResult(schema, value);

      if (syncResult) {
        if (syncResult.issues) {
          throw new StandardSchemaSerializationError(syncResult.issues);
        }

        return JSON.stringify(syncResult.value);
      }

      throw new TypeError(
        `fastify-standard-schema response schemas must validate synchronously (${method} ${url} ${httpStatus}).`,
      );
    }

    if (result.issues) {
      throw new StandardSchemaSerializationError(result.issues);
    }

    return JSON.stringify(result.value);
  };
};
