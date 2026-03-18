import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { FastifyTypeProvider } from 'fastify';

export interface StandardSchemaTypeProvider extends FastifyTypeProvider {
  validator: this['schema'] extends StandardSchemaV1
    ? StandardSchemaV1.InferOutput<this['schema']>
    : unknown;
  serializer: this['schema'] extends StandardSchemaV1
    ? StandardSchemaV1.InferInput<this['schema']>
    : unknown;
}
