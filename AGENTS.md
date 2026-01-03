# AGENTS

## Overview
- Astro-based personal site/blog with Tailwind CSS and content collections for notes, projects, and work.
- Routes live in `src/pages` with shared layout and components; content is Markdown under `src/content`.
- Build includes a custom IPFS post-processing step that rewrites asset paths and injects a navigation fixer.

## Key directories
- `src/components`: UI building blocks (navigation, posts, projects, theme toggle, SEO).
- `src/pages`: route definitions (home, notes, projects, work, side-quests, hello, 404, rss.xml, robots.txt).
- `src/content`: Markdown content and schemas in `src/content.config.ts`.
- `src/styles`: global Tailwind and typography styles.
- `public`: static assets (only `site.webmanifest` is tracked).

## Entry points
- `src/pages/index.astro`: homepage.
- `src/pages/notes/[...id].astro`: note detail pages.
- `src/pages/rss.xml.js` and `src/pages/robots.txt.ts`: API routes.
- `astro.config.mjs`: site config, integrations, and build hooks.

## Setup
- Install dependencies: `npm install`.
- TypeScript config extends `astro/tsconfigs/strict` and maps `@/*` to `src/*`.
- Site metadata and nav/social links in `src/siteConfig.ts`.

## Run
- `npm run dev` (or `npm run start`) starts the dev server at `localhost:4321`.
- `npm run build` builds to `dist/`.
- `npm run preview` previews the build.
- `npm run astro -- <command>` runs Astro CLI commands.

## Lint/Format/Test
- No lint or test scripts are defined in `package.json`.
- Formatting uses Prettier with Astro and Tailwind plugins (`.prettierrc.mjs`).
- Type-check uses Astro check: `npm run astro -- check`.

## Build/Deploy
- `astro.config.mjs` sets `site` to an IPFS URL, `trailingSlash: "always"`, and `build.format: "directory"`.
- Vite build outputs hashed asset filenames.
- Custom `ipfsIntegration` (build hook) rewrites asset paths and injects a navigation script into each `dist/**/index.html`.

## Data and schema
- Collections in `src/content.config.ts`: `notes`, `projects`, `work`.
- `notes` supports optional images via `astro:assets`.

## Integrations
- Astro integrations: `@astrojs/sitemap`, `@astrojs/rss`.
- `src/pages/side-quests/index.astro` embeds Spotify and fetches Letterboxd RSS via `https://api.cors.lol/` with a 1-hour localStorage cache.

## Conventions
- Tailwind utility classes with shared `.prose` styles from `src/styles/typography.css`.
- Theme toggling uses localStorage key `currentTheme`, defaulting to light.

## Gotchas
- `src/content/notes` is referenced in `src/content.config.ts` but is not tracked; notes pages render an empty state when none exist.
- `src/components/Favicons.astro` expects favicon files under `public/` that are not tracked.
- IPFS post-processing mutates built HTML in `dist/`; be careful if you depend on exact output hashes.
