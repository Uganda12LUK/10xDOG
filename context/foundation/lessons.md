# Lessons Learned

> Append-only register of recurring rules and patterns. Re-read at start by /10x-frame, /10x-research, /10x-plan, /10x-plan-review, /10x-implement, /10x-impl-review.

## Pre-scaffolding kodu dla kolejnego slice'a wymaga adnotacji w planie

- **Context**: src/components/Topbar.astro — link Meetings dodany w S-04 dla trasy S-05 (/meetings)
- **Problem**: Pre-scaffolding elementów UI (nav linki, trasy) dla przyszłego slice'a w bieżącej zmianie sprawia, że plan jest niezsynchronizowany z implementacją. Przyszli recenzenci nie mogą stwierdzić, czy dodatkowy element był zamierzony czy przypadkowym scope creep.
- **Rule**: Jeśli implementujesz element należący do kolejnego slice'a, dodaj adnotację w planie bieżącej zmiany np. "FORWARD: dodano X dla S-XX". Dzięki temu review i archiwizacja mają kontekst.
- **Applies to**: Wszystkie zmiany dodające UI/API/serwis poza zakresem aktualnego planu (Topbar linki, trasy, funkcje serwisowe pre-scaffolded dla kolejnych slice'ów).

## Dev-only trap musi renderować się tam, gdzie testowana rzecz jest aktywna

- **Context**: src/pages/dev/sentry-check.astro:8 (guard `import.meta.env.DEV`) + src/lib/sentry-env.ts:10 (gate `import.meta.env.PROD`)
- **Problem**: Guard trapa (`import.meta.env.DEV`) i gate inicjalizacji Sentry (`import.meta.env.PROD`) nigdy się nie pokrywają: w dev trap renderuje się, ale monitoring jest off; w preview/prod monitoring jest on, ale trap 404-uje. Dodatkowo worker Cloudflare nie działa w `npm run dev`. Efekt: dev-only diagnostyka nie udowodni przechwytywania w żadnej standardowej komendzie bez tymczasowego override.
- **Rule**: Dev-only diagnostyka/trap musi renderować się w tym samym środowisku, w którym aktywna jest testowana funkcja. Gdy monitoring (lub feature flag) jest wyłączony w lokalnym dev, guard trapa opieraj na rozróżnieniu preview/production (flaga env), a nie na `import.meta.env.DEV` — tak, by trap renderował się w preview (monitoring on) i 404-ował tylko w prawdziwym prodzie.
- **Applies to**: strony dev-only (trap/kitchen-sink) weryfikujące zachowanie bramkowane środowiskiem (monitoring, feature flags), zwłaszcza na runtime Cloudflare Workers.
