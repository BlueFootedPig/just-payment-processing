import { resolve } from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';

export default defineConfig({
  envPrefix: ['VITE_', 'REACT_APP_'],
  publicDir: false,
  plugins: [
    react(),
    dts({
      entryRoot: 'src',
      include: ['src/vite-env.d.ts', 'src/module.ts', 'src/lib.tsx', 'src/core', 'src/Components/PaymentPopup/PaymentPopup.tsx', 'src/config', 'src/types', 'src/utils'],
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/setupTests.ts']
    })
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/module.ts'),
      name: 'JustPaymentProcessing',
      formats: ['es', 'umd'],
      fileName: (format) => `just-payment-processing.${format}.js`
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react-dom/client'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react-dom/client': 'ReactDOM'
        }
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts'
  }
});
