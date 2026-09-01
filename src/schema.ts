import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { FastifySchema } from 'fastify';

export interface StandardSchemaResponseConfig {
  content: Record<string, { schema: StandardSchemaV1 }>;
}

export interface FastifyStandardSchema extends Omit<
  FastifySchema,
  'body' | 'querystring' | 'params' | 'headers' | 'response'
> {
  body?: StandardSchemaV1;
  querystring?: StandardSchemaV1;
  params?: StandardSchemaV1;
  headers?: StandardSchemaV1;
  response?: Record<string | number, StandardSchemaV1 | StandardSchemaResponseConfig>;
}
