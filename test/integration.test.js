import assert from 'node:assert/strict';
import test from 'node:test';

import Fastify from 'fastify';
import { z } from 'zod/v4';

import { standardSchemaPlugin, validatorCompiler, serializerCompiler } from '../dist/index.js';

test('standardSchemaPlugin validates requests and serializes responses', async () => {
  const app = Fastify();

  await app.register(standardSchemaPlugin);

  app.post(
    '/users',
    {
      schema: {
        body: z.object({
          name: z.string().min(1),
          age: z.coerce.number().int().nonnegative(),
        }),
        response: {
          201: z.object({
            id: z.string(),
            age: z.number(),
          }),
        },
      },
    },
    async (request, reply) => {
      return reply.code(201).send({
        id: 'user-1',
        age: request.body.age,
        ignored: 'removed by serialization',
      });
    },
  );

  await app.ready();

  const response = await app.inject({
    method: 'POST',
    url: '/users',
    payload: {
      name: 'Ada',
      age: '42',
    },
  });

  assert.equal(response.statusCode, 201);
  assert.equal(response.headers['content-type'], 'application/json; charset=utf-8');
  assert.deepEqual(response.json(), {
    id: 'user-1',
    age: 42,
  });

  await app.close();
});

test('standardSchemaPlugin returns 400 for invalid input', async () => {
  const app = Fastify();

  await app.register(standardSchemaPlugin);

  app.post(
    '/users',
    {
      schema: {
        body: z.object({
          name: z.string().min(1),
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

  const body = response.json();
  assert.match(body.message, /\$\.name|\$\.age/);

  await app.close();
});

test('serializerCompiler surfaces response schema failures', async () => {
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
    async (request) => {
      return {
        id: request.params.id,
      };
    },
  );

  await app.ready();

  const response = await app.inject({
    method: 'GET',
    url: '/users/not-a-uuid',
  });

  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.json().code, 'FST_ERR_RESPONSE_SERIALIZATION');

  await app.close();
});
