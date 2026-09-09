import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.oficina.app",
  appName: "Oficina",
  // Aponta para o build estático do PWA (apps/web). Rode `pnpm --filter
  // @oficina/web build` antes de `pnpm --filter @oficina/mobile sync`.
  webDir: "../web/dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
