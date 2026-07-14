import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // three.js(약 1MB)는 별도 청크로 분리되므로 경고 한도를 현실적으로 조정
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // Three.js 관련 라이브러리를 별도 청크로 분리해 초기 번들 경고를 방지
        manualChunks: {
          three: ['three', '@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
});
