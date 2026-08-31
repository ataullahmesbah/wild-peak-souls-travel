import next from 'eslint-config-next';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

/**
 * Flat config using the native exports that ship with Next 16.
 * (The legacy FlatCompat bridge is not used — it fails on this plugin set.)
 */
const eslintConfig = [
  ...next,
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    // Prisma's generated client is machine-written and not ours to lint.
    ignores: ['src/generated/**', '.next/**', 'node_modules/**', 'next-env.d.ts'],
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
];

export default eslintConfig;
