import { defineConfig } from 'vitest/config';
export default defineConfig({test:{include:['**/*.test.ts'],exclude:['node_modules/**','.runtime/**','.venv-data/**'],testTimeout:30000,fileParallelism:false}});
