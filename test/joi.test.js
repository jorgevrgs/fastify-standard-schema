import Fastify from 'fastify';
import Joi from 'joi';
import { expect, test } from 'vitest';

import { standardSchemaPlugin } from '../dist/index.js';

test('standardSchemaPlugin validates and normalizes requests with joi', async () => {
  const app = Fastify();

  await app.register(standardSchemaPlugin);

  app.post(
    '/users',
    {
      schema: {
        body: Joi.object({
          name: Joi.string().trim().min(1).required(),
          age: Joi.number().integer().min(0).required(),
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

test('standardSchemaPlugin returns 400 for invalid joi input', async () => {
  const app = Fastify();

  await app.register(standardSchemaPlugin);

  app.post(
    '/users',
    {
      schema: {
        body: Joi.object({
          name: Joi.string().trim().min(1).required(),
          age: Joi.number().integer().min(0).required(),
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

test('standardSchemaPlugin serializes responses with joi', async () => {
  const app = Fastify();

  await app.register(standardSchemaPlugin);

  app.get(
    '/users/:id',
    {
      schema: {
        response: {
          200: Joi.object({
            id: Joi.string().required(),
            age: Joi.number().required(),
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
