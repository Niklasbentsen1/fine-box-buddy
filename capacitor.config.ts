import type { CapacitorConfig } from "@capacitor/cli";

// The web build is fully static (see vite.config.ts) — `npm run build` emits
// dist/index.html plus hashed assets, which Capacitor bundles into the native apps.
const config: CapacitorConfig = {
  appId: "app.boedekassen",
  appName: "Bødekassen",
  webDir: "dist",
};

export default config;
