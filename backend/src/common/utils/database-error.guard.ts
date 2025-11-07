export function isDatabaseError(
  error: unknown,
): error is { code: string; [key: string]: unknown } {
  return (
    error instanceof Object &&
    'code' in error &&
    typeof (error as Record<string, unknown>).code === 'string'
  );
}
