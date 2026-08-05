import reactConfig from '@kodoko/config/eslint/react';

export default [
  ...reactConfig,
  {
    ignores: ['dist/**', 'dev-dist/**'],
  },
];