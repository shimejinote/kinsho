import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';

/**
 * Shared health endpoint for all kinsho SPAs.
 * Exposed as GET /api/health (Functions default /api route prefix).
 */
export async function health(
  _request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  context.log('health check');

  return {
    status: 200,
    jsonBody: {
      status: 'ok',
      service: 'kinsho-api',
      timestamp: new Date().toISOString(),
    },
  };
}

app.http('health', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'health',
  handler: health,
});
