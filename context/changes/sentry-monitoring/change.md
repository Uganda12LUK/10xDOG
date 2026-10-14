---
change_id: sentry-monitoring
title: Integrate Sentry error monitoring across server and client
status: impl_reviewed
created: 2026-10-13
updated: 2026-10-13
archived_at: null
---

## Notes

Integracja Sentry (error monitoring) dla aplikacji PawMeet: Astro SSR na Cloudflare Workers + React 19 islands. Zakres: serwer (middleware, API routes, SSR) + klient (React islands). Darmowy plan Sentry. DSN/sekrety przez .env/.dev.vars. Konfiguracja ręczna przez SDK + DSN (bez Sentry MCP).
