import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import rehypeLinkMentions from "./src/lib/rehypeLinkMentions.mjs";

// https://astro.build/config
export default defineConfig({
  integrations: [sitemap()],
  markdown: {
    shikiConfig: {
      theme: "dark-plus",
    },
    rehypePlugins: [rehypeLinkMentions],
  },
  site: process.env.SITE_URL ?? "https://example.com",
  trailingSlash: "always",
  build: {
    format: "directory",
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          assetFileNames: "[name].[hash][extname]",
        },
      },
    },
    define: {
      "import.meta.env.BUILT_AT": JSON.stringify(new Date().toISOString()),
    },
  },
});
