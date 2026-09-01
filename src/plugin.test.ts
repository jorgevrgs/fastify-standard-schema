import Fastify from 'fastify';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { serializerCompiler, validatorCompiler } from './compilers.js';
import { standardSchemaPlugin } from './plugin.js';

describe('standardSchemaPlugin', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('registers validator and serializer compilers by default', async () => {
    const app = Fastify();
    const setValidatorCompiler = vi.spyOn(app, 'setValidatorCompiler');
    const setSerializerCompiler = vi.spyOn(app, 'setSerializerCompiler');

    await app.register(standardSchemaPlugin);
    await app.ready();

    expect(setValidatorCompiler).toHaveBeenCalledOnce();
    expect(setValidatorCompiler).toHaveBeenCalledWith(validatorCompiler);
    expect(setSerializerCompiler).toHaveBeenCalledOnce();
    expect(setSerializerCompiler).toHaveBeenCalledWith(serializerCompiler);

    await app.close();
  });

  test('can disable individual compilers through plugin options', async () => {
    const app = Fastify();
    const setValidatorCompiler = vi.spyOn(app, 'setValidatorCompiler');
    const setSerializerCompiler = vi.spyOn(app, 'setSerializerCompiler');

    await app.register(standardSchemaPlugin, {
      setValidatorCompiler: false,
      setSerializerCompiler: false,
    });
    await app.ready();

    expect(setValidatorCompiler).not.toHaveBeenCalled();
    expect(setSerializerCompiler).not.toHaveBeenCalled();

    await app.close();
  });
});
