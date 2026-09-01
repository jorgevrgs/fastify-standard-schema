import vine from '@vinejs/vine';
import Joi from 'joi';
import { performance } from 'node:perf_hooks';
import { object, string } from 'zod/v4';

import { isStandardSchema, serializerCompiler, validatorCompiler } from '../../dist/index.js';

const WARMUP = 5_000;
const ITERATIONS = 200_000;

function bench(name, fn) {
  for (let index = 0; index < WARMUP; index += 1) {
    fn();
  }

  const start = performance.now();

  for (let index = 0; index < ITERATIONS; index += 1) {
    fn();
  }

  const elapsedMs = performance.now() - start;
  const opsPerSec = (ITERATIONS / elapsedMs) * 1000;

  return {
    name,
    iterations: ITERATIONS,
    elapsedMs: Number(elapsedMs.toFixed(2)),
    opsPerSec: Number(opsPerSec.toFixed(2)),
  };
}

async function benchAsync(name, fn) {
  for (let index = 0; index < WARMUP; index += 1) {
    await fn();
  }

  const start = performance.now();

  for (let index = 0; index < ITERATIONS; index += 1) {
    await fn();
  }

  const elapsedMs = performance.now() - start;
  const opsPerSec = (ITERATIONS / elapsedMs) * 1000;

  return {
    name,
    iterations: ITERATIONS,
    elapsedMs: Number(elapsedMs.toFixed(2)),
    opsPerSec: Number(opsPerSec.toFixed(2)),
  };
}

const zodQuerySchema = object({
  page: string(),
});

const zodResponseSchema = object({
  hello: string(),
});

const joiQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).max(100).default(1),
});

const joiResponseSchema = Joi.object({
  hello: Joi.string().required(),
});

const vineQuerySchema = vine.compile(
  vine.object({
    page: vine.number().min(1).max(100).optional(),
  }),
);

const validateZodQuery = validatorCompiler({
  schema: zodQuerySchema,
  method: 'GET',
  url: '/',
  httpPart: 'querystring',
});

const validateJoiQuery = validatorCompiler({
  schema: joiQuerySchema,
  method: 'GET',
  url: '/',
  httpPart: 'querystring',
});

const validateVineQuery = validatorCompiler({
  schema: vineQuerySchema,
  method: 'GET',
  url: '/',
  httpPart: 'querystring',
});

const serializeZodResponse = serializerCompiler({
  schema: zodResponseSchema,
  method: 'GET',
  url: '/',
  httpStatus: '200',
});

const serializeJoiResponse = serializerCompiler({
  schema: joiResponseSchema,
  method: 'GET',
  url: '/',
  httpStatus: '200',
});

const asyncFallbackSchema = {
  safeParse(value) {
    return { success: true, data: value };
  },
  '~standard': {
    version: 1,
    validate(value) {
      return Promise.resolve({ value });
    },
  },
};

const serializeAsyncFallback = serializerCompiler({
  schema: asyncFallbackSchema,
  method: 'GET',
  url: '/',
  httpStatus: '200',
});

export async function runCompilerMicrobenchmarks() {
  return [
    bench('isStandardSchema (zod)', () => {
      isStandardSchema(zodQuerySchema);
    }),
    bench('isStandardSchema (joi)', () => {
      isStandardSchema(joiQuerySchema);
    }),
    bench('isStandardSchema (vine)', () => {
      isStandardSchema(vineQuerySchema);
    }),
    bench('validatorCompiler sync (zod)', () => {
      validateZodQuery({ page: '1' });
    }),
    bench('validatorCompiler sync (joi)', () => {
      validateJoiQuery({ page: '1' });
    }),
    await benchAsync('validatorCompiler async (vine)', async () => {
      await validateVineQuery({ page: 1 });
    }),
    bench('serializerCompiler sync (zod)', () => {
      serializeZodResponse({ hello: 'world' });
    }),
    bench('serializerCompiler sync (joi)', () => {
      serializeJoiResponse({ hello: 'world' });
    }),
    bench('serializerCompiler sync fallback candidates (safeParse)', () => {
      serializeAsyncFallback({ hello: 'world' });
    }),
  ];
}
