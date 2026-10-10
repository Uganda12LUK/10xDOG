// Remove dist/ before an E2E build so every run produces a coherent client
// bundle. On this OneDrive-synced checkout, `astro build` over an existing
// dist can leave a mixed dist/client (old + new island chunks) when sync
// locks block atomic replaces — the HTML then references a chunk hash that
// isn't on disk, so `client:only` islands 404 and never mount, and newly
// added routes 404 (bypassing middleware). A clean dist avoids both.
import { rmSync } from "node:fs";

rmSync("dist", { recursive: true, force: true });
// eslint-disable-next-line no-console
console.log("[clean-dist] removed dist/");
