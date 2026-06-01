export async function retryOnce<T>(
  fn: () => Promise<T>,
  isRetryable: (err: unknown) => boolean,
  delayMs: number,
  onRetry?: () => void,
): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (!isRetryable(err)) throw err
    onRetry?.()
    await new Promise(resolve => setTimeout(resolve, delayMs))
    return await fn()
  }
}
