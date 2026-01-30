export type ErrorCode =
  | "INVALID_INPUT"
  | "MISSING_KEY"
  | "INVALID_URL"
  | "INVALID_REF"
  | "INVALID_PATH"
  | "NOT_IN_GIT"
  | "NOT_FOUND"
  | "TYPE_MISMATCH"
  | "SIZE_LIMIT"
  | "NETWORK"
  | "IO";

export class CtxbinError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export function fail(code: ErrorCode, message: string): never {
  throw new CtxbinError(code, message);
}

export function formatError(err: unknown): string {
  if (err instanceof CtxbinError) {
    return `CTXBIN_ERR ${err.code}: ${err.message}`;
  }
  const message = err instanceof Error ? err.message : String(err);
  return `CTXBIN_ERR IO: ${message}`;
}
