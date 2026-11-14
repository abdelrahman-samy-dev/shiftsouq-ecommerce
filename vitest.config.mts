import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL("./", import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      // Only "@/..." — a bare "@" prefix would also capture "@supabase/*" and "@vitest/*".
      { find: /^@\//, replacement: root },
      // Server-only modules are imported directly in tests.
      { find: /^server-only$/, replacement: fileURLToPath(new URL("./tests/support/empty.ts", import.meta.url)) },
    ],
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/db/**/*.test.ts"],
    testTimeout: 20_000,
  },
});
