import nextConfig from 'eslint-config-next';

const [baseConfig, ...restConfigs] = nextConfig;

const config = [
  {
    // TypeScript declaration files contain ambient declarations (e.g. `const`
    // without an initializer) that ESLint's default parser cannot handle and
    // that carry no executable code worth linting.
    ignores: ['**/*.d.ts', '**/*.d.mts', '**/*.d.cts'],
  },
  {
    ...baseConfig,
    rules: {
      ...baseConfig.rules,
      '@next/next/no-img-element': 'off',
    },
  },
  ...restConfigs,
];

export default config;
