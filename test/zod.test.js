import assert from 'node:assert/strict';
import test from 'node:test';

import Fastify from 'fastify';
import { z } from 'zod/v4';

import { serializerCompiler, standardSchemaPlugin, validatorCompiler } from '../dist/index.js';

test('standardSchemaPlugin validates and normalizes requests with zod', async () => {
  const app = Fastify();

  await app.register(standardSchemaPlugin);

  app.post(
    '/users',
    {
      schema: {
        body: z.object({
          name: z.string().trim().min(1),
          age: z.coerce.number().int().nonnegative(),
        }),
      },
    },
    async (request) => request.body,
  );

  await app.ready();

  const response = await app.inject({
    method: 'POST',
    url: '/users',
    payload: {
      name: ' Ada ',
      age: '42',
    },
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    name: 'Ada',
    age: 42,
  });

  await app.close();
});

test('standardSchemaPlugin returns 400 for invalid zod input', async () => {
  const app = Fastify();

  await app.register(standardSchemaPlugin);

  app.post(
    '/users',
    {
      schema: {
        body: z.object({
          name: z.string().trim().min(1),
          age: z.coerce.number().int().nonnegative(),
        }),
      },
    },
    async () => ({ ok: true }),
  );

  await app.ready();

  const response = await app.inject({
    method: 'POST',
    url: '/users',
    payload: {
      name: '',
      age: -1,
    },
  });

  assert.equal(response.statusCode, 400);
  assert.match(response.json().message, /name|age/i);

  await app.close();
});

test('standardSchemaPlugin serializes responses with zod', async () => {
  const app = Fastify();

  await app.register(standardSchemaPlugin);

  app.get(
    '/users/:id',
    {
      schema: {
        params: z.object({
          id: z.string(),
        }),
        response: {
          200: z.object({
            id: z.string(),
            age: z.number(),
          }),
        },
      },
    },
    async (request) => ({
      id: request.params.id,
      age: 42,
    }),
  );

  await app.ready();

  const response = await app.inject({
    method: 'GET',
    url: '/users/user-1',
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    id: 'user-1',
    age: 42,
  });

  await app.close();
});

test('serializerCompiler surfaces zod response schema failures', async () => {
  const app = Fastify();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.setErrorHandler((error, _request, reply) => {
    reply.status(error.statusCode ?? 500).send({
      code: error.code,
      message: error.message,
    });
  });

  app.get(
    '/users/:id',
    {
      schema: {
        params: z.object({
          id: z.string(),
        }),
        response: {
          200: z.object({
            id: z.string().uuid(),
          }),
        },
      },
    },
    async (request) => ({
      id: request.params.id,
    }),
  );

  await app.ready();

  const response = await app.inject({
    method: 'GET',
    url: '/users/not-a-uuid',
  });

  assert.equal(response.statusCode, 500);
  assert.equal(response.json().code, 'FST_ERR_RESPONSE_SERIALIZATION');

  await app.close();
});
