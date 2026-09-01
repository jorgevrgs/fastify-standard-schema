import type { StandardSchemaV1 } from '@standard-schema/spec';

export function isStandardSchema(schema: unknown): schema is StandardSchemaV1 {
  if ((typeof schema !== 'object' && typeof schema !== 'function') || schema === null) {
    return false;
  }

  const standard = Reflect.get(schema, '~standard');

  return (
    typeof standard === 'object' &&
    standard !== null &&
    Reflect.get(standard, 'version') === 1 &&
    typeof Reflect.get(standard, 'validate') === 'function'
  );
}
