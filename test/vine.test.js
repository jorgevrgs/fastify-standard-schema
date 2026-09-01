import vine from '@vinejs/vine';
import Fastify from 'fastify';
import { expect, test } from 'vitest';
import { z } from 'zod/v4';

import { serializerCompiler, standardSchemaPlugin, validatorCompiler } from '../dist/index.js';

test('standardSchemaPlugin validates and normalizes requests with vine', async () => {
  const app = Fastify();

  await app.register(standardSchemaPlugin);

  app.post(
    '/users',
    {
      schema: {
        body: vine.compile(
          vine.object({
            name: vine.string().trim().minLength(1),
            age: vine.number().min(0),
          }),
        ),
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

test('standardSchemaPlugin returns 400 for invalid vine input', async () => {
  const app = Fastify();

  await app.register(standardSchemaPlugin);

  app.post(
    '/users',
    {
      schema: {
        body: vine.compile(
          vine.object({
            name: vine.string().trim().minLength(1),
            age: vine.number().min(0),
          }),
        ),
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
  expect(response.json().message).not.toMatch(/reduce is not a function/);

  await app.close();
});

test('serializerCompiler rejects async vine response schemas', async () => {
  const app = Fastify();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.setErrorHandler((error, _request, reply) => {
    reply.status(error.statusCode ?? 500).send({
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
          200: vine.compile(
            vine.object({
              id: vine.string(),
            }),
          ),
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
    url: '/users/user-1',
  });

  expect(response.statusCode).toBe(500);
  expect(response.json().message).toMatch(/must validate synchronously/);

  await app.close();
});
