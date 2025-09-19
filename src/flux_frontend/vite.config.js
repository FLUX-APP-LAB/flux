import { fileURLToPath, URL } from 'url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import environment from 'vite-plugin-environment';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export default defineConfig({
  build: {
    emptyOutDir: true,
    rollupOptions: {
      external: [],
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
    include: [
      '@dfinity/agent',
      '@dfinity/auth-client',
      '@dfinity/candid', 
      '@dfinity/identity',
      '@dfinity/principal'
    ],
  },
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4943",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    environment("all", { prefix: "CANISTER_" }),
    environment("all", { prefix: "DFX_" }),
    environment("all", { prefix: "VITE_" }),
  ],
  define: {
    // Explicitly define environment variables for client access
    'import.meta.env.CANISTER_ID_FLUX_BACKEND': JSON.stringify(process.env.CANISTER_ID_FLUX_BACKEND),
    'import.meta.env.CANISTER_ID_INTERNET_IDENTITY': JSON.stringify(process.env.CANISTER_ID_INTERNET_IDENTITY),
    'import.meta.env.CANISTER_ID_FLUX_FRONTEND': JSON.stringify(process.env.CANISTER_ID_FLUX_FRONTEND),
    'import.meta.env.DFX_NETWORK': JSON.stringify(process.env.DFX_NETWORK),
  },
  resolve: {
    alias: [
      {
        find: "declarations",
        replacement: fileURLToPath(
          new URL("../declarations", import.meta.url)
        ),
      },
    ],
    dedupe: ['@dfinity/agent', '@dfinity/candid', '@dfinity/principal'],
  },
});
