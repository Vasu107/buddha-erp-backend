import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/controllers/**", "src/middleware/**"],
      exclude: ["src/tests/**"],
    },
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
