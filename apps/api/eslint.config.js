import reactConfig from '@kodoko/config/eslint/base';

export default [
  ...reactConfig,
  {
    ignores: ['dist/**', 'vercel.bundle.js'],
  },
];