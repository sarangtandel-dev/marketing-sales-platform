import { defineConfig } from "vitest/config";

// Each test boots the Worker in Miniflare, which takes longer than Vitest's default 5s.
export default defineConfig({
  test: { testTimeout: 30_000, hookTimeout: 30_000 },
});
