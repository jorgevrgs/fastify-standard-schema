import fp from 'fastify-plugin';
import type {
  FastifyPluginAsync,
  FastifyPluginCallback,
  FastifyPluginOptions,
  RawServerDefault,
} from 'fastify';

import { serializerCompiler, validatorCompiler } from './compilers.js';
import type { StandardSchemaTypeProvider } from './type-provider.js';

export interface StandardSchemaPluginOptions {
  setValidatorCompiler?: boolean;
  setSerializerCompiler?: boolean;
}

const standardSchemaPluginBase: FastifyPluginAsync<StandardSchemaPluginOptions> = async (
  fastify,
  options,
) => {
  if (options.setValidatorCompiler !== false) {
    fastify.setValidatorCompiler(validatorCompiler);
  }

  if (options.setSerializerCompiler !== false) {
    fastify.setSerializerCompiler(serializerCompiler);
  }
};

export const standardSchemaPlugin = fp(standardSchemaPluginBase, {
  name: 'fastify-standard-schema',
  fastify: '5.x',
});

export type FastifyPluginAsyncStandardSchema<
  Options extends FastifyPluginOptions = Record<never, never>,
> = FastifyPluginAsync<Options, RawServerDefault, StandardSchemaTypeProvider>;

export type FastifyPluginCallbackStandardSchema<
  Options extends FastifyPluginOptions = Record<never, never>,
> = FastifyPluginCallback<Options, RawServerDefault, StandardSchemaTypeProvider>;
