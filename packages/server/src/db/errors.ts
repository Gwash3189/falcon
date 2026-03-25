/**
 * SQLite error codes we handle explicitly.
 * https://www.sqlite.org/rescode.html
 */
const SQLITE_UNIQUE_VIOLATION = 'SQLITE_CONSTRAINT_UNIQUE';

export function isUniqueViolation(err: unknown): boolean {
  return (
    err !== null &&
    typeof err === 'object' &&
    'code' in err &&
    (err as { code: unknown }).code === SQLITE_UNIQUE_VIOLATION
  );
}
