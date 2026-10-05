import { useCallback, useSyncExternalStore } from "react";

/**
 * Tracks whether a CSS media query currently matches. Subscribes to `matchMedia`
 * via `useSyncExternalStore`; the server/first-render snapshot is `false`, so a
 * `client:only` component never flashes the desktop branch on a phone.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", callback);
      return () => {
        mql.removeEventListener("change", callback);
      };
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
