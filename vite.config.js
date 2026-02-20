import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, mkdirSync, existsSync, readdirSync } from 'fs';

// Copy static files that aren't part of the Vite build (prd.html, tests.html, etc.)
function copyStaticFiles() {
  return {
    name: 'copy-static-files',
    closeBundle() {
      const staticFiles = [
        'prd.html',
        'tests.html',
        'config.js',
        'utils.js',
        'release-notes.js',
        'presentation.html',
        'presentation-nontechnical.html',
        'privacy-policy.html',
      ];
      const outDir = resolve(__dirname, 'dist');
      for (const file of staticFiles) {
        const src = resolve(__dirname, file);
        if (existsSync(src)) {
          copyFileSync(src, resolve(outDir, file));
        }
      }

      // Copy presentation directory if it exists
      const presDir = resolve(__dirname, 'presentation');
      if (existsSync(presDir)) {
        const outPresDir = resolve(outDir, 'presentation');
        if (!existsSync(outPresDir)) mkdirSync(outPresDir, { recursive: true });
        for (const file of readdirSync(presDir)) {
          copyFileSync(resolve(presDir, file), resolve(outPresDir, file));
        }
      }

      console.log('Copied static files to dist/');
    }
  };
}

export default defineConfig({
  plugins: [react(), copyStaticFiles()],
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
        parent: resolve(__dirname, 'parent.html'),
        counselor: resolve(__dirname, 'counselor.html'),
      },
    },
  },
});
