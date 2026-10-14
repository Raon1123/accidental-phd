import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['engine/test/**/*.test.ts', 'web/test/**/*.test.ts'], coverage: { provider: 'v8', include: ['engine/src/**'], thresholds: { lines: 90, functions: 90 } } } });
