import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { SvelteKitPWA } from "@vite-pwa/sveltekit";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit(),
    SvelteKitPWA({
      registerType: "autoUpdate",
      scope: "/",
      base: "/",
      devOptions: {
        enabled: true,
      },
      includeAssets: ["robots.txt", "pwa-icon-192.png", "pwa-icon-512.png"],
      manifest: {
        name: "I Wanna Be A Volunteer",
        short_name: "Volunteer",
        description:
          "A multi-council volunteer registration platform for Burnaby North Secondary School events.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        display_override: ["standalone", "window-controls-overlay"],
        orientation: "portrait",
        background_color: "#F8FAFC",
        theme_color: "#F8FAFC",
        icons: [
          {
            src: "/pwa-icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        shortcuts: [
          {
            name: "Events",
            url: "/?section=events",
            description: "Jump directly to the upcoming events list.",
          },
          {
            name: "Profile",
            url: "/admin",
            description: "Open the admin dashboard more quickly.",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,webp}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/([^.]+\.)?supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-data",
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60,
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
    }),
  ],
});
