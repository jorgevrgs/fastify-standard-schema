import Fastify from 'fastify';
import { expect, test } from 'vitest';
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

  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({
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

  expect(response.statusCode).toBe(400);
  expect(response.json().message).toMatch(/name|age/i);

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

  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({
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

  expect(response.statusCode).toBe(500);
  expect(response.json().code).toBe('FST_ERR_RESPONSE_SERIALIZATION');
  expect(response.json().message).toMatch(/id is a required field/);

  await app.close();
});
