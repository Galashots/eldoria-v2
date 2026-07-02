import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 5173
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    chunkSizeWarningLimit: 1400,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'phaser',
              test: /node_modules[\\/]phaser[\\/]/
            }
          ]
        }
      }
    }
  }
});
