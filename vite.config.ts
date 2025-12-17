import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'ZodUtils',
            formats: ['es', 'cjs'],
            fileName: (format) => `index.${format === 'es' ? 'mjs' : 'cjs'}`,
        },
        rollupOptions: {
            external: ['zod'],
            output: [
                {
                    format: 'es',
                    entryFileNames: 'index.mjs',
                    globals: { zod: 'Zod' },
                    exports: 'named',
                },
                {
                    format: 'cjs',
                    entryFileNames: 'index.cjs',
                    globals: { zod: 'Zod' },
                    exports: 'named',
                },
            ],
        },
        emptyOutDir: true,
    },
    plugins: [dts({ rollupTypes: true })],
});
