import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      '**/*.{test,spec}.{ts,tsx}',
      '**/*.property.test.ts',
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      'cdk.out/**',
    ],
    coverage: {
      provider: 'v8',
      include: [
        'backend/src/domain/**',
        'backend/src/validation/**',
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
});
