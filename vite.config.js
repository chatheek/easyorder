import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // We use 'generateSW' because it's more stable for dynamic start_urls
      strategies: 'generateSW', 
      registerType: 'autoUpdate',
      
      // --- IMPORTANT: SET THIS TO FALSE ---
      // We are now injecting the manifest via DynamicManifest.jsx in App.jsx
      manifest: false, 
      
      injectRegister: 'auto',
      devOptions: {
        enabled: true 
      },
      // Keep your assets so the service worker knows to cache them
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Ensures the service worker doesn't try to cache the old static manifest
        navigateFallbackDenylist: [/manifest\.webmanifest$/]
      }
    })
  ],
  server: {
    allowedHosts: true,
    headers: {
      "ngrok-skip-browser-warning": "true"
    },
    hmr: {
      clientPort: 443, 
      overlay: false
    },
  },
})