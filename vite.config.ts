import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'ZodUtils',
            fileName: 'index',
        },
        rollupOptions: {
            external: ['zod'],
            output: {
                globals: {
                    zod: 'Zod',
                },
            },
        },
    },
    plugins: [dts({ rollupTypes: true })],
});
