export interface RetryOptions {
  maxAttempts?: number   // default 5 (ADR-053)
  baseDelayMs?: number   // default 500
}

// HTTP 410 등 재시도가 무의미한 에러 판별
function isNonRetryable(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    (err as { status: number }).status === 410
  )
}

export async function withRetry<T>(
  fn: () => T | Promise<T>,
  { maxAttempts = 5, baseDelayMs = 500 }: RetryOptions = {},
): Promise<T> {
  let lastErr: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (isNonRetryable(err)) throw err
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, baseDelayMs * 2 ** (attempt - 1)))
      }
    }
  }
  throw lastErr
}
