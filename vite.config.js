import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base 用相对路径，部署到 GitHub Pages 的任意子路径都能正常加载资源
export default defineConfig({
  base: './',
  plugins: [react()],
})
