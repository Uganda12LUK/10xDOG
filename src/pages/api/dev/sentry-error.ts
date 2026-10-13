import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = () => {
  // Dev-only diagnostic. 404 in production so it never ships.
  if (!import.meta.env.DEV) {
    return new Response(null, { status: 404, statusText: "Not Found" });
  }

  // Throw an unhandled error server-side so it reaches the worker boundary,
  // where sentry.server.config.ts's `withSentry` wrapper can capture it.
  // Intentionally NOT wrapped in try/catch — the point is to let it propagate.
  throw new Error("Sentry server test error");
};
