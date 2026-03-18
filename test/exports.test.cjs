const assert = require('node:assert/strict');
const test = require('node:test');

const pkg = require('../dist/index.cjs');

test('commonjs bundle exposes the public api', () => {
  assert.equal(typeof pkg.standardSchemaPlugin, 'function');
  assert.equal(typeof pkg.validatorCompiler, 'function');
  assert.equal(typeof pkg.serializerCompiler, 'function');
  assert.equal(typeof pkg.isStandardSchema, 'function');
});
