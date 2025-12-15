import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Dryg Search",
        short_name: "Dryg",
        description: "Fast bang redirects for your browser",
        theme_color: "#1a1a1a",
        background_color: "#131313",
        display: "standalone",
        icons: [
          {
            src: "/search.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
});
