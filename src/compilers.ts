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

const SYNC_CANDIDATE_KEYS = ['validateSync', 'safeParse', 'parse', 'validate'] as const;
type SyncCandidateKey = (typeof SYNC_CANDIDATE_KEYS)[number];

type SerializerStrategy =
  | { kind: 'standard' }
  | { kind: 'fallback'; key: SyncCandidateKey }
  | { kind: 'unsupported' };

const serializerStrategyCache = new WeakMap<StandardSchemaV1, SerializerStrategy>();

function isSyncValidationResult(result: unknown): result is StandardSchemaV1.Result<unknown> {
  return !isPromiseLike(result);
}

function swallowPromiseRejection(result: unknown): void {
  if (isPromiseLike(result)) {
    Promise.resolve(result).catch(() => {});
  }
}

function invokeSyncCandidate(
  schema: StandardSchemaV1,
  key: SyncCandidateKey,
  value: unknown,
): StandardValidationResult {
  const candidate = Reflect.get(schema, key);

  if (typeof candidate !== 'function') {
    throw new TypeError(`Expected ${key} to be a function`);
  }

  try {
    const result = Reflect.apply(candidate, schema, [value]);

    if (isPromiseLike(result)) {
      throw new TypeError(`Expected ${key} to validate synchronously`);
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

function probeSyncCandidateKey(schema: StandardSchemaV1, key: SyncCandidateKey): boolean {
  const candidate = Reflect.get(schema, key);

  if (typeof candidate !== 'function') {
    return false;
  }

  try {
    const result = Reflect.apply(candidate, schema, [undefined]);

    if (isPromiseLike(result)) {
      swallowPromiseRejection(result);
      return false;
    }

    return true;
  } catch (error) {
    return normalizeValidationError(error) !== null;
  }
}

function resolveSyncCandidateKey(schema: StandardSchemaV1): SyncCandidateKey | null {
  for (const key of SYNC_CANDIDATE_KEYS) {
    if (probeSyncCandidateKey(schema, key)) {
      return key;
    }
  }

  return null;
}

function probeStandardValidateIsSync(schema: StandardSchemaV1): boolean {
  try {
    const result = schema['~standard'].validate(undefined);

    if (isPromiseLike(result)) {
      swallowPromiseRejection(result);
      return false;
    }

    return true;
  } catch {
    return true;
  }
}

function resolveSerializerStrategy(schema: StandardSchemaV1): SerializerStrategy {
  const cached = serializerStrategyCache.get(schema);

  if (cached) {
    return cached;
  }

  const strategy: SerializerStrategy = probeStandardValidateIsSync(schema)
    ? { kind: 'standard' }
    : ((key) => (key ? { kind: 'fallback', key } : { kind: 'unsupported' }))(
        resolveSyncCandidateKey(schema),
      );

  serializerStrategyCache.set(schema, strategy);
  return strategy;
}

function serializeWithStrategy(
  schema: StandardSchemaV1,
  strategy: SerializerStrategy,
  value: unknown,
): string {
  if (strategy.kind === 'standard') {
    const result = schema['~standard'].validate(value);

    if (!isSyncValidationResult(result)) {
      throw new TypeError('fastify-standard-schema expected synchronous ~standard.validate');
    }

    if (result.issues) {
      throw new StandardSchemaSerializationError(result.issues);
    }

    return JSON.stringify(result.value);
  }

  if (strategy.kind === 'fallback') {
    const syncResult = invokeSyncCandidate(schema, strategy.key, value);

    if (syncResult.issues) {
      throw new StandardSchemaSerializationError(syncResult.issues);
    }

    return JSON.stringify(syncResult.value);
  }

  return '';
}

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

  const strategy = resolveSerializerStrategy(schema);

  return (value) => {
    if (strategy.kind === 'unsupported') {
      throw new TypeError(
        `fastify-standard-schema response schemas must validate synchronously (${method} ${url} ${httpStatus}).`,
      );
    }

    return serializeWithStrategy(schema, strategy, value);
  };
};
