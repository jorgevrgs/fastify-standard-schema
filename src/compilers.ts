import type { FastifySchemaCompiler, FastifySerializerCompiler, SafePromiseLike } from 'fastify';

import {
  InvalidStandardSchemaError,
  StandardSchemaSerializationError,
  StandardSchemaValidationError,
} from './errors.js';
import { isStandardSchema } from './utils.js';

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

      if (result instanceof Promise) {
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

    if (result instanceof Promise) {
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
