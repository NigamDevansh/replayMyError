import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts', 'src/config.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    target: 'es2020',
    outDir: 'dist',
    external: ['@slack/web-api'],
});
