import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  // Architecture boundaries (see docs/ARCHITECTURE.md).
  {
    // Layer 1 and the domain modules reach the platform only through the Layer 2 API contract.
    files: ['src/app/**', 'src/components/**', 'src/modules/**', 'src/i18n/**', 'src/config/**', 'src/utils/**'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ group: ['**/api/mock/**', '**/api/mock'], message: 'Use the FarmSenseApi from src/api, not the demo backend.' }] }],
    },
  },
  {
    // Domain modules (3A–3D) are UI-free so they can move server-side.
    files: ['src/modules/**', 'src/types/**'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ group: ['**/components/**', '**/app/**', '**/i18n/**', 'react', 'react-dom'], message: 'Domain modules must not depend on the user application.' }] }],
    },
  },
);
