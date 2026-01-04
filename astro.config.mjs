import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import rehypeLinkMentions from "./src/lib/rehypeLinkMentions.mjs";

// https://astro.build/config
const siteUrl = process.env.SITE_URL
  ? process.env.SITE_URL
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:4321";

export default defineConfig({
  integrations: [sitemap()],
  markdown: {
    shikiConfig: {
      theme: "dark-plus",
    },
    rehypePlugins: [rehypeLinkMentions],
  },
  site: siteUrl,
  trailingSlash: "always",
  build: {
    format: "directory",
  },
  vite: {
    plugins: [tailwindcss()],
    define: {
      "import.meta.env.BUILT_AT": JSON.stringify(new Date().toISOString()),
    },
  },
});
