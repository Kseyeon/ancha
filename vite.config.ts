import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages 프로젝트 경로(https://kseyeon.github.io/ancha/) 대응.
  // 개발 서버(serve)에서는 '/' 로 두어 로컬 접속이 편하도록 함.
  base: command === 'build' ? '/ancha/' : '/',
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // 모든 .vue / .scss 파일에서 변수·믹스인을 별도 import 없이 사용
        additionalData: `@use "@/styles/variables" as *;`,
      },
    },
  },
}))
