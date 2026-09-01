import type { StandardSchemaV1 } from '@standard-schema/spec';

type ValidationResult = StandardSchemaV1.Result<unknown>;

export function createStandardSchema(
  validate: (value: unknown) => ValidationResult | Promise<ValidationResult>,
  extras?: Record<PropertyKey, unknown>,
): StandardSchemaV1 {
  return {
    ...extras,
    '~standard': {
      version: 1,
      vendor: 'test',
      validate,
    },
  };
}

export const issue = (
  message: string,
  path?: StandardSchemaV1.Issue['path'],
): StandardSchemaV1.Issue => ({
  message,
  path,
});
