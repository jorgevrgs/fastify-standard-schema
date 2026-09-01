import Fastify from 'fastify';
import { expectTypeOf, test } from 'vitest';
import { z } from 'zod/v4';

import type { StandardSchemaTypeProvider } from '../src/index.ts';

test('StandardSchemaTypeProvider infers request output and response input types', () => {
  const server = Fastify().withTypeProvider<StandardSchemaTypeProvider>();

  const schema = {
    body: z.object({
      name: z.string().trim().min(1),
      age: z.coerce.number().int().nonnegative(),
    }),
    response: {
      200: z.object({
        id: z.string(),
        createdAt: z.date().transform((value) => value.toISOString()),
      }),
    },
  };

  server.post('/users', { schema }, async (request, reply) => {
    expectTypeOf(request.body).toEqualTypeOf<{
      name: string;
      age: number;
    }>();

    type ReplyPayload = Parameters<typeof reply.send>[0];

    expectTypeOf<ReplyPayload>().toEqualTypeOf<{
      id: string;
      createdAt: Date;
    }>();

    reply.code(200).send({
      id: 'user-1',
      createdAt: new Date(),
    });

    const _invalidPayload = {
      id: 'user-1',
      // @ts-expect-error response types should use serializer input, not output
      createdAt: '2026-03-19T00:00:00.000Z',
    } satisfies ReplyPayload;

    return reply;
  });
});
