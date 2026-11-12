import { defineConfig } from 'vitest/config';
import { transformWithOxc } from 'vite';

export default defineConfig({
  // The existing Next.js application uses JSX inside .js files.
  plugins: [{
    name: 'app-jsx',
    enforce: 'pre',
    async transform(code, id) {
      if (/\/(pages|components|lib)\/.*\.js$/.test(id)) {
        return transformWithOxc(code, id, { lang: 'jsx', jsx: { runtime: 'automatic' } });
      }
    },
  }],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
  },
});
