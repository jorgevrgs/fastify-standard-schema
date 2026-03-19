const assert = require('node:assert/strict');

const pkg = require('../dist/index.cjs');

assert.equal(typeof pkg.standardSchemaPlugin, 'function');
assert.equal(typeof pkg.validatorCompiler, 'function');
assert.equal(typeof pkg.serializerCompiler, 'function');
assert.equal(typeof pkg.isStandardSchema, 'function');
