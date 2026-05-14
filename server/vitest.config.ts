import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/tests/**/*.test.ts"],
    testTimeout: 30000,
    // First MongoMemoryServer run downloads a full MongoDB binary; default hook timeout is too low.
    hookTimeout: 600_000
  }
});
