# Lessons Learned

> Append-only register of recurring rules and patterns. Re-read at start by /10x-frame, /10x-research, /10x-plan, /10x-plan-review, /10x-implement, /10x-impl-review.

## Pre-scaffolding kodu dla kolejnego slice'a wymaga adnotacji w planie

- **Context**: src/components/Topbar.astro — link Meetings dodany w S-04 dla trasy S-05 (/meetings)
- **Problem**: Pre-scaffolding elementów UI (nav linki, trasy) dla przyszłego slice'a w bieżącej zmianie sprawia, że plan jest niezsynchronizowany z implementacją. Przyszli recenzenci nie mogą stwierdzić, czy dodatkowy element był zamierzony czy przypadkowym scope creep.
- **Rule**: Jeśli implementujesz element należący do kolejnego slice'a, dodaj adnotację w planie bieżącej zmiany np. "FORWARD: dodano X dla S-XX". Dzięki temu review i archiwizacja mają kontekst.
- **Applies to**: Wszystkie zmiany dodające UI/API/serwis poza zakresem aktualnego planu (Topbar linki, trasy, funkcje serwisowe pre-scaffolded dla kolejnych slice'ów).
