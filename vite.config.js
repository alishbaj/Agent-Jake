import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      proxy: {
        // WebRTC needs GET /v1/convai/conversation/token with xi-api-key for auth-enabled agents.
        // The browser SDK cannot send that header to api.elevenlabs.io (CORS), so dev uses this proxy.
        '/elevenlabs-api': {
          target: 'https://api.elevenlabs.io',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/elevenlabs-api/, ''),
          configure(proxy) {
            proxy.on('proxyReq', (proxyReq) => {
              const key = env.ELEVENLABS_API_KEY
              if (key) proxyReq.setHeader('xi-api-key', key)
            })
          },
        },
      },
    },
  }
})