import assert from 'node:assert/strict';
import test from 'node:test';

import Fastify from 'fastify';
import * as yup from 'yup';

import { serializerCompiler, standardSchemaPlugin, validatorCompiler } from '../dist/index.js';

test('standardSchemaPlugin validates and normalizes requests with yup', async () => {
  const app = Fastify();

  await app.register(standardSchemaPlugin);

  app.post(
    '/users',
    {
      schema: {
        body: yup.object({
          name: yup.string().trim().min(1).required(),
          age: yup.number().integer().min(0).required(),
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

test('standardSchemaPlugin returns 400 for invalid yup input', async () => {
  const app = Fastify();

  await app.register(standardSchemaPlugin);

  app.post(
    '/users',
    {
      schema: {
        body: yup.object({
          name: yup.string().trim().min(1).required(),
          age: yup.number().integer().min(0).required(),
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

test('standardSchemaPlugin serializes responses with yup', async () => {
  const app = Fastify();

  await app.register(standardSchemaPlugin);

  app.get(
    '/users/:id',
    {
      schema: {
        response: {
          200: yup.object({
            id: yup.string().required(),
            age: yup.number().required(),
          }),
        },
      },
    },
    async () => ({
      id: 'user-1',
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

test('serializerCompiler uses yup validateSync fallback for invalid responses', async () => {
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
    '/users/yup-invalid',
    {
      schema: {
        response: {
          200: yup.object({
            id: yup.string().required(),
          }),
        },
      },
    },
    async () => ({
      wrong: true,
    }),
  );

  await app.ready();

  const response = await app.inject({
    method: 'GET',
    url: '/users/yup-invalid',
  });

  assert.equal(response.statusCode, 500);
  assert.equal(response.json().code, 'FST_ERR_RESPONSE_SERIALIZATION');
  assert.match(response.json().message, /id is a required field/);

  await app.close();
});
