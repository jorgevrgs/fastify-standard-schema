# fastify-standard-schema

Fastify validation, serialization, and type-provider support for [Standard Schema](https://standardschema.dev/schema).

This package wires Standard Schema-compatible validators into Fastify's custom
`validatorCompiler` and `serializerCompiler` APIs, and exposes a matching type
provider for `withTypeProvider()`.

It follows the Fastify type-provider model documented in the
[Type Providers reference](https://fastify.dev/docs/latest/Reference/Type-Providers/)
and uses the same compiler pattern Fastify documents for custom validation and
serialization.

## Install

```sh
pnpm add fastify fastify-standard-schema @standard-schema/spec
```

If you are publishing this package, `fastify` and `@standard-schema/spec` are
already declared as peer dependencies.

## What it provides

- `standardSchemaPlugin`: registers both compilers on a Fastify instance
- `validatorCompiler`: validates request parts with Standard Schema
- `serializerCompiler`: validates and serializes responses with Standard Schema
- `StandardSchemaTypeProvider`: infers request types from schema output and
  reply types from schema input
- `FastifyStandardSchema`: helper type for route `schema` objects

## Usage

```ts
import Fastify from 'fastify';
import { z } from 'zod/v4';

import {
  standardSchemaPlugin,
  type FastifyStandardSchema,
  type StandardSchemaTypeProvider,
} from 'fastify-standard-schema';

const app = Fastify();

await app.register(standardSchemaPlugin);

const server = app.withTypeProvider<StandardSchemaTypeProvider>();

const createUserSchema = {
  body: z.object({
    name: z.string().min(1),
    age: z.coerce.number().int().nonnegative(),
  }),
  response: {
    201: z.object({
      id: z.string(),
      name: z.string(),
      age: z.number(),
    }),
  },
} satisfies FastifyStandardSchema;

server.post(
  '/users',
  { schema: createUserSchema },
  async (request, reply) => {
    const user = request.body;
    //    ^? { name: string; age: number }

    return reply.code(201).send({
      id: crypto.randomUUID(),
      name: user.name,
      age: user.age,
    });
  },
);
```

## Type inference model

Fastify v5 type providers separate request-side and reply-side inference:

- request types come from the provider's `validator` slot
- reply types come from the provider's `serializer` slot

This package maps them to Standard Schema like this:

- request schemas use `InferOutput`
- response schemas use `InferInput`

That means transformed or coerced request values are reflected in handler input,
while reply payloads are typed as the values your response schema accepts before
serialization.

## Encapsulation

Fastify compiler registration is encapsulated, so you can scope this plugin to
only the routes that use Standard Schema:

```ts
await app.register(async function standardSchemaRoutes(instance) {
  await instance.register(standardSchemaPlugin);

  const server = instance.withTypeProvider<StandardSchemaTypeProvider>();

  server.get(
    '/health',
    {
      schema: {
        response: {
          200: z.object({ ok: z.literal(true) }),
        },
      } satisfies FastifyStandardSchema,
    },
    async () => ({ ok: true }),
  );
});
```

This is the safest setup when the rest of your application still uses Fastify's
default JSON Schema compilers.

## Response validation note

Fastify serializer compilers are synchronous. Because of that,
`serializerCompiler` only supports Standard Schema implementations whose
response-side `validate()` function resolves synchronously.

Async Standard Schema validators still work for requests through
`validatorCompiler`.

## API

### `standardSchemaPlugin`

Registers the Standard Schema validator and serializer compilers.

```ts
await fastify.register(standardSchemaPlugin);
```

Options:

- `setValidatorCompiler?: boolean` default `true`
- `setSerializerCompiler?: boolean` default `true`

### `validatorCompiler`

Fastify-compatible request validator compiler. It returns `{ value }` on
success and `{ error }` on failure, following Fastify's custom validator
contract.

### `serializerCompiler`

Fastify-compatible serializer compiler. It validates the outgoing payload with
the response schema and serializes the validated result with `JSON.stringify`.

### `StandardSchemaTypeProvider`

Use with `withTypeProvider()`:

```ts
const server = fastify.withTypeProvider<StandardSchemaTypeProvider>();
```

### `FastifyStandardSchema`

Helper interface for route `schema` objects:

```ts
const schema = {
  querystring: z.object({
    page: z.coerce.number().int().positive(),
  }),
  response: {
    200: z.object({
      page: z.number(),
    }),
  },
} satisfies FastifyStandardSchema;
```
