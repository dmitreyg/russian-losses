import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const now = new Date();
const build = [
  String(now.getMonth()+1).padStart(2,'0'),
  String(now.getDate()).padStart(2,'0'),
  String(now.getFullYear()).slice(2),
  String(now.getHours()).padStart(2,'0'),
  String(now.getMinutes()).padStart(2,'0'),
  String(now.getSeconds()).padStart(2,'0'),
].join('');

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD__: JSON.stringify(build),
  },
  server: {
    port: 5173,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})
