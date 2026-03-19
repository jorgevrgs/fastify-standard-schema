import {
  isStandardSchema,
  serializerCompiler,
  standardSchemaPlugin,
  validatorCompiler,
} from '../dist/index.js';

import { expect, test } from 'vitest';

test('esm bundle exposes the public api', () => {
  expect(standardSchemaPlugin).toBeTypeOf('function');
  expect(validatorCompiler).toBeTypeOf('function');
  expect(serializerCompiler).toBeTypeOf('function');
  expect(isStandardSchema).toBeTypeOf('function');
});
