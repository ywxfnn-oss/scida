import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        target: 'node18',
        watch: false,
        sourcemap: false,
        rollupOptions: {
            external: [
                'electron',
                '@prisma/client',
                '@prisma/adapter-better-sqlite3',
                'better-sqlite3'
            ]
        }
    }
});
