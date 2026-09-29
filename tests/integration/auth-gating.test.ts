import { describe, it, expect, vi, beforeAll } from "vitest";
import { PROTECTED_ROUTES } from "../../src/lib/protected-routes.ts";

// Astro virtual modules are not available in vitest's Node environment.
// Mock them so src/middleware.ts can be imported for unit-level testing.
vi.mock("astro:middleware", () => ({
  defineMiddleware: (fn: unknown) => fn,
}));
// Without SUPABASE_URL/SUPABASE_KEY the real createClient returns null,
// which the middleware treats as an unauthenticated session — exactly what
// these tests need. Mock the env module to guarantee that state.
vi.mock("astro:env/server", () => ({
  SUPABASE_URL: undefined,
  SUPABASE_KEY: undefined,
}));

interface MiddlewareContext {
  request: Request;
  url: URL;
  locals: Record<string, unknown>;
  cookies: { get: () => undefined; set: () => void };
  redirect: (location: string, status?: number) => Response;
}

type MiddlewareFn = (ctx: MiddlewareContext, next: () => Promise<Response>) => Promise<Response | undefined>;

let onRequest: MiddlewareFn;

beforeAll(async () => {
  const mod = await import("../../src/middleware.ts");
  onRequest = mod.onRequest as unknown as MiddlewareFn;
});

function makeContext(path: string): MiddlewareContext {
  const url = new URL(`http://localhost:4321${path}`);
  return {
    request: new Request(url),
    url,
    locals: {},
    cookies: { get: () => undefined, set: () => undefined },
    // Return a plain Response so tests can inspect status and Location header.
    redirect: (location: string, status = 302) => new Response(null, { status, headers: { Location: location } }),
  };
}

const next = (): Promise<Response> => Promise.resolve(new Response("ok"));

describe("Auth-gating — unauthenticated requests", () => {
  for (const route of PROTECTED_ROUTES) {
    it(`${route} — unauthenticated request redirects to /auth/signin`, async () => {
      const response = await onRequest(makeContext(route), next);

      expect(response).toBeDefined();
      expect([301, 302]).toContain(response?.status);
      const location = response?.headers.get("location") ?? "";
      expect(location).toContain("/auth/signin");
    });
  }

  // /events is intentionally NOT in PROTECTED_ROUTES — it's a public placeholder.
  it("GET /events is publicly accessible (intentional — placeholder page not in PROTECTED_ROUTES)", async () => {
    const response = await onRequest(makeContext("/events"), next);

    const location = response?.headers.get("location") ?? "";
    const isAuthRedirect =
      response !== undefined && [301, 302].includes(response.status) && location.includes("/auth/signin");

    expect(isAuthRedirect).toBe(false);
  });
});
