import nextPlugin from 'eslint-config-next';

export default [
  {
    ignores: ['node_modules/', '.next/', 'dist/'],
  },
  {
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
    },
  },
  nextPlugin,
];
