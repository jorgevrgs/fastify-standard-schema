import { createRequire } from 'node:module';

import { expect, test } from 'vitest';

const require = createRequire(import.meta.url);
const pkg = require('../dist/index.cjs');

test('commonjs bundle exposes the public api', () => {
  expect(pkg.standardSchemaPlugin).toBeTypeOf('function');
  expect(pkg.validatorCompiler).toBeTypeOf('function');
  expect(pkg.serializerCompiler).toBeTypeOf('function');
  expect(pkg.isStandardSchema).toBeTypeOf('function');
});
