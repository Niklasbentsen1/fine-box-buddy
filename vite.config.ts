// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     VITE_* env injection, @ path alias, React/TanStack dedupe, error logger plugins,
//     and sandbox detection (port/host/strictPort).
//
// Two build modes:
//
//   `npm run build:mobile`  (Capacitor — used by codemagic.yaml)
//       MOBILE_BUILD=1 -> no server at all (nitro: false) and TanStack Start SPA mode: the
//       shell is prerendered to dist/index.html and every route is resolved client-side.
//       dist/ is exactly what Capacitor bundles into the iOS/Android apps (webDir: "dist").
//       dist-server/ is a throwaway scratch bundle used only to prerender the shell.
//
//   `npm run build`         (web deployment on Lovable hosting)
//       Standard server build, so the API routes under src/routes/api/** are real, reachable
//       HTTPS endpoints — the APNs push sender is one of them and is called by the database
//       dispatcher. The native apps never use this output.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const isMobileBuild = process.env["MOBILE_BUILD"] === "1";

export default defineConfig(
  isMobileBuild
    ? {
        nitro: false,
        tanstackStart: {
          spa: {
            enabled: true,
            prerender: { outputPath: "/index" },
          },
        },
        vite: {
          environments: {
            client: { build: { outDir: "dist" } },
            ssr: { build: { outDir: "dist-server" } },
          },
        },
      }
    : {},
);
