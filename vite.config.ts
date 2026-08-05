// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     VITE_* env injection, @ path alias, React/TanStack dedupe, error logger plugins,
//     and sandbox detection (port/host/strictPort).
// This project builds as a STATIC SPA (no SSR / no Nitro server) so the output can be
// packaged with Capacitor for iOS and Android:
//   - nitro: false            -> no server bundle / deploy adapter
//   - spa.enabled             -> TanStack Start SPA mode; the app shell is prerendered to
//                                a plain index.html and all routing happens client-side
//   - spa.prerender.outputPath-> writes the shell as dist/index.html
// Output layout after `npm run build`:
//   dist/         -> the static site (index.html + hashed assets). Point Capacitor's webDir here.
//   dist-server/  -> throwaway SSR scratch bundle used only to prerender the shell at build time.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
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
});
