import type { CapacitorConfig } from "@capacitor/cli";

// `npm run build:mobile` (MOBILE_BUILD=1, see vite.config.ts) emits the fully static app
// shell to dist/index.html plus hashed assets, which Capacitor bundles into the native apps.
// The plain `npm run build` is the hosted web deployment (API routes) and is never shipped
// inside the app.
const config: CapacitorConfig = {
  appId: "app.boedekassen",
  appName: "Bødekassen",
  webDir: "dist",
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
