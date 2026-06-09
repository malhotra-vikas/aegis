// Root ESLint flat config for the pure TypeScript libraries (shared, risk-engine,
// connectors, db). apps/api and packages/workers carry their own NestJS-specific
// configs, which ESLint resolves in preference to this one when linting in those
// dirs. Non-type-checked: `typecheck` already covers types, so lint stays fast.
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/.next/**', '**/generated/**', '**/node_modules/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Allow intentional unused args/vars prefixed with _.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
);
