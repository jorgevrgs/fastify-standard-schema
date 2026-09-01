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
pnpm add fastify fastify-standard-schema @standard-schema/spec zod
```

If you are publishing this package, `fastify` and `@standard-schema/spec` are
already declared as peer dependencies.

Replace `zod` with whichever Standard Schema library your routes use, such as
`yup`, `joi`, or `@vinejs/vine`. See [What schema libraries implement the spec?](https://standardschema.dev/schema#what-schema-libraries-implement-the-spec).

## What it provides

- `standardSchemaPlugin`: registers both compilers on a Fastify instance
- `validatorCompiler`: validates request parts with Standard Schema
- `serializerCompiler`: validates and serializes responses with Standard Schema
- `StandardSchemaTypeProvider`: infers request types from schema output and
  reply types from schema input
- `FastifyStandardSchema`: helper type for route `schema` objects

## Tested libraries

The integration tests in this repository currently cover these Standard Schema
libraries:

| Library        | Request validation | Response serialization | Sync path                                              |
| -------------- | ------------------ | ---------------------- | ------------------------------------------------------ |
| `zod`          | Yes                | Yes                    | `~standard.validate` (sync)                            |
| `yup`          | Yes                | Yes                    | `validateSync()` (resolved once at compile time)       |
| `joi`          | Yes                | Yes                    | `~standard.validate` (sync)                            |
| `@vinejs/vine` | Yes                | No                     | Async only (`vine.compile(...)`)                       |
| `valibot`      | Yes                | Yes*                   | `~standard.validate` when schema is sync               |
| `arktype`      | Yes                | Yes*                   | `~standard.validate` (sync)                            |
| `effect`       | Yes                | Yes*                   | Sync or async depending on schema composition          |
| `@sinclair/typemap` | Yes           | Yes*                   | Via TypeMap `Compile()` wrapper, not raw TypeBox       |

\*Not covered by integration tests in this repo yet.

Fastify request validation supports both sync and async Standard Schema
validators, but Fastify response serializers are synchronous. At route
registration time, `serializerCompiler` resolves the fastest synchronous path
once per schema (cached on the schema object):

1. Use `~standard.validate` when it returns synchronously (Zod, Joi, Valibot sync schemas, ArkType).
2. Otherwise bind the first working sync helper on the schema object, in order: `validateSync`, `safeParse`, `parse`, `validate` (Yup uses `validateSync`).
3. Reject schemas with no synchronous path (compiled VineJS, Effect schemas with async transforms, Vine, Mongoose async paths).

Libraries that only expose async validation are supported for request validation
but not for response serialization. See the [Standard Schema implementers list](https://standardschema.dev/schema#what-schema-libraries-implement-the-spec) for the full ecosystem.

## Usage

```ts
import Fastify from "fastify";
import {
  standardSchemaPlugin,
  type FastifyStandardSchema,
  type StandardSchemaTypeProvider,
} from "fastify-standard-schema";
import { z } from "zod/v4";

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
};

server.post("/users", { schema: createUserSchema }, async (request, reply) => {
  const user = request.body;
  //    ^? { name: string; age: number }

  return reply.code(201).send({
    id: crypto.randomUUID(),
    name: user.name,
    age: user.age,
  });
});
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

## Other schema libraries

You can pass any Standard Schema-compatible validator to Fastify route schemas.
For example:

```ts
import * as yup from "yup";
import Joi from "joi";
import vine from "@vinejs/vine";

const yupBody = yup.object({
  name: yup.string().trim().min(1).required(),
});

const joiResponse = Joi.object({
  ok: Joi.boolean().required(),
});

const vineBody = vine.compile(
  vine.object({
    age: vine.number().min(0),
  }),
);
```

`zod`, `yup`, and `joi` can be used for both request and response schemas.
Compiled VineJS schemas are supported for request validation, but not for
response serialization because their validation API is async-only.

## Encapsulation

Fastify compiler registration is encapsulated, so you can scope this plugin to
only the routes that use Standard Schema:

```ts
await app.register(async function standardSchemaRoutes(instance) {
  await instance.register(standardSchemaPlugin);

  const server = instance.withTypeProvider<StandardSchemaTypeProvider>();

  server.get(
    "/health",
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
`serializerCompiler` needs a synchronous validation path.

Async Standard Schema validators still work for requests through
`validatorCompiler`. For responses, `serializerCompiler` resolves a synchronous
path once when the route is registered (see the library table above). Libraries
without a synchronous validation API, such as compiled VineJS schemas, are still
request-only.

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
};
```

## Benchmarks

Performance reports are generated automatically on release and can be run locally at any time.

```sh
pnpm benchmark        # full report (10s per scenario)
pnpm benchmark:quick  # shorter local run (3s per scenario)
```

Reports are written to:

- `benchmarks/RESULTS.md` — latest run
- `benchmarks/reports/<version>.md` — versioned archive

HTTP scenarios follow the same layout as [fastify-type-provider-yup](https://github.com/jorgevrgs/fastify-type-provider-yup/tree/main/benchmarks): validation, serializer, and combined runs against JSON Schema, Zod, Yup, and Joi. Vine is included for request validation only — compiled Vine schemas validate asynchronously and cannot be used for response serialization.

Compiler microbenchmarks measure hot paths directly, including the synchronous candidate fallback used by `serializerCompiler` when `~standard.validate` returns a promise.

To run a single server manually:

```sh
pnpm build
node benchmarks/validation-zod.benchmark.cjs
autocannon "http://127.0.0.1:3000/?page=1"
```
