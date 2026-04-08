const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Returns the Supabase column name to query based on whether id is a UUID or short_id */
export function idColumn(id: string): 'id' | 'short_id' {
  return UUID_RE.test(id) ? 'id' : 'short_id'
}

/** Strip anything that looks like an HTML tag or encoded entity, then truncate */
export function sanitizeString(s: string, maxLength = 500): string {
  return s
    .replace(/<[^>]*>?/g, '')        // strip HTML tags (including unclosed)
    .replace(/&[a-z]+;/gi, '')       // strip HTML entities like &lt; &gt;
    .replace(/&#x?[0-9a-f]+;/gi, '') // strip numeric entities like &#60; &#x3C;
    .replace(/javascript:/gi, '')     // strip javascript: URIs
    .replace(/on\w+\s*=/gi, '')      // strip inline event handlers like onerror=
    .slice(0, maxLength)
}
