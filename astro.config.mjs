import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import rehypeLinkMentions from "./src/lib/rehypeLinkMentions.mjs";

// https://astro.build/config
const normalizeUrl = (value) => {
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  return `https://${value}`;
};

const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const vercelUrl = process.env.VERCEL_URL;
const siteUrl =
  normalizeUrl(process.env.SITE_URL) ||
  (process.env.VERCEL_ENV === "production" &&
    normalizeUrl(productionHost || vercelUrl)) ||
  normalizeUrl(vercelUrl) ||
  "http://localhost:4321";

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
