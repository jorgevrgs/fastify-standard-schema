import type { StandardSchemaV1 } from '@standard-schema/spec';

type StandardIssue = ReadonlyArray<StandardSchemaV1.Issue>;

function formatPathSegment(segment: PropertyKey): string {
  if (typeof segment === 'number') {
    return `[${segment}]`;
  }

  if (typeof segment === 'symbol') {
    return `[${String(segment)}]`;
  }

  if (/^[A-Za-z_$][\w$]*$/u.test(segment)) {
    return `.${segment}`;
  }

  return `[${JSON.stringify(segment)}]`;
}

function parseStringPath(path: string): PropertyKey[] {
  const normalized = path.replaceAll(/\[(\d+)\]/gu, '.$1');
  const segments = normalized
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    return [path];
  }

  return segments.map((segment) => {
    const numeric = Number(segment);

    return Number.isInteger(numeric) && String(numeric) === segment ? numeric : segment;
  });
}

function formatIssuePath(issue: StandardSchemaV1.Issue): string {
  const rawPath = issue.path as unknown;

  if (rawPath == null || rawPath === '') {
    return '$';
  }

  const pathSegments = Array.isArray(rawPath)
    ? rawPath
    : typeof rawPath === 'string'
      ? parseStringPath(rawPath)
      : [rawPath as PropertyKey];

  return pathSegments.reduce<string>((path, segment) => {
    const key =
      typeof segment === 'object' && segment !== null && 'key' in segment ? segment.key : segment;

    return `${path}${formatPathSegment(key)}`;
  }, '$');
}

export function formatIssues(issues: StandardIssue): string {
  return issues.map((issue) => `${formatIssuePath(issue)}: ${issue.message}`).join('; ');
}

export class StandardSchemaValidationError extends Error {
  readonly code = 'FST_ERR_VALIDATION';
  readonly issues: StandardIssue;
  readonly statusCode = 400;

  constructor(issues: StandardIssue) {
    super(formatIssues(issues));
    this.name = 'StandardSchemaValidationError';
    this.issues = issues;
  }
}

export class StandardSchemaSerializationError extends Error {
  readonly code = 'FST_ERR_RESPONSE_SERIALIZATION';
  readonly issues: StandardIssue;
  readonly statusCode = 500;

  constructor(issues: StandardIssue) {
    super(formatIssues(issues));
    this.name = 'StandardSchemaSerializationError';
    this.issues = issues;
  }
}

export class InvalidStandardSchemaError extends TypeError {
  constructor(location: string) {
    super(
      `fastify-standard-schema expected a Standard Schema-compatible schema for ${location}. Register this plugin only in scopes that use Standard Schema route schemas.`,
    );
    this.name = 'InvalidStandardSchemaError';
  }
}
