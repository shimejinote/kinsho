import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';

/** Sliding window: max requests per IP per minute (best-effort on cold/multi-instance). */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
const hits = new Map<string, { count: number; windowStart: number }>();

function clientIp(request: HttpRequest): string {
  const forwarded =
    request.headers.get('x-forwarded-for') ??
    request.headers.get('x-azure-clientip') ??
    request.headers.get('x-client-ip');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  return 'unknown';
}

function allowRequest(ip: string): boolean {
  const now = Date.now();
  const row = hits.get(ip);
  if (!row || now - row.windowStart > WINDOW_MS) {
    hits.set(ip, { count: 1, windowStart: now });
    // Bound map size under scan floods
    if (hits.size > 5_000) {
      hits.clear();
      hits.set(ip, { count: 1, windowStart: now });
    }
    return true;
  }
  if (row.count >= MAX_PER_WINDOW) {
    return false;
  }
  row.count += 1;
  return true;
}

/**
 * Shared health endpoint for kinsho SPAs.
 * Kept tiny + rate-limited to reduce abuse / log burn without paid WAF.
 */
export async function health(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const ip = clientIp(request);
  if (!allowRequest(ip)) {
    context.warn(`health rate-limited ip=${ip}`);
    return {
      status: 429,
      headers: {
        'Retry-After': '60',
        'Cache-Control': 'no-store',
      },
      jsonBody: { status: 'error', error: 'rate_limited' },
    };
  }

  return {
    status: 200,
    headers: {
      'Cache-Control': 'no-store',
    },
    jsonBody: {
      status: 'ok',
      service: 'kinsho-api',
      timestamp: new Date().toISOString(),
    },
  };
}

app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: health,
});
