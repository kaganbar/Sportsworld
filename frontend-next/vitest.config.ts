import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      // Mirrors tsconfig.json's "@/*": ["./*"] — without this, @/lib/...
      // and @/components/... imports fail to resolve under Vitest.
      "@": path.resolve(__dirname, "."),
    },
  },
});
