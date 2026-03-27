/**
 * Simple in-memory rate limiter.
 * No external dependencies — uses a Map with automatic cleanup.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Clean up stale entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key)
    }
  }, 5 * 60 * 1000)
}

/**
 * Check if a request should be rate-limited.
 * @returns `true` if the request is allowed, `false` if rate-limited.
 */
export function rateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= maxRequests) {
    return false
  }

  entry.count++
  return true
}

/** Extract a reasonable IP string from a request */
export function getIP(request: Request): string {
  const forwarded = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim()
  return forwarded || 'unknown'
}
