import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // host: true makes the dev server listen on your LAN IP as well as
    // localhost, so other computers on the same network can reach it at
    // http://<this-computer's-IP>:5173 — not just from this machine.
    host: true,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
