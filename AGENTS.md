# AGENTS

## Overview

- Astro-based personal site/blog with Tailwind CSS and content collections for writing (notes collection), projects, and work.
- Routes live in `src/pages` with shared layout and components; content is Markdown under `src/content`.

## Key directories

- `src/components`: UI building blocks (navigation, posts, projects, theme toggle, SEO).
- `src/pages`: route definitions (home, writing, projects, work, side-quests, hello, 404, rss.xml, robots.txt).
- `src/content`: Markdown content and schemas in `src/content.config.ts`.
- `src/styles`: global Tailwind and typography styles.
- `public`: static assets (only `site.webmanifest` is tracked).

## Entry points

- `src/pages/index.astro`: homepage.
- `src/pages/writing/[...id].astro`: writing detail pages.
- `src/pages/notes/[...id].astro`: legacy redirect to `/writing/:id/`.
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

- `astro.config.mjs` sets `site` (via `SITE_URL` or fallback), `trailingSlash: "always"`, and `build.format: "directory"`.
- Vite build outputs hashed asset filenames.

## Data and schema

- Collections in `src/content.config.ts`: `notes` (writing), `projects`, `work`.
- `notes` supports optional images via `astro:assets`.
- Resume-based project references live in `Suryansh_Chauhan_Resume.pdf` (use for cross-checking project names/blurb only; avoid copying personal details).
- GitHub repo descriptions are the primary source for project blurbs and links; see `https://github.com/Suryansh-23?tab=repositories&type=source` for canonical repo names.
- Projects support an optional `rank` field in frontmatter; lower numbers float to the top of `/projects/` for wow-factor ordering.

## Integrations

- Astro integrations: `@astrojs/sitemap`, `@astrojs/rss`.
- `src/pages/side-quests/index.astro` embeds Spotify and fetches Letterboxd RSS via `https://api.cors.lol/` with a 1-hour localStorage cache.

## Conventions

- Tailwind utility classes with shared `.prose` styles from `src/styles/typography.css`.
- Theme toggling uses localStorage key `currentTheme`, defaulting to light.
- Authoring notation lives in `BLOG_NOTATION.md`; keep it up to date when new content features land.
- Projects page keeps the Toolbox panel above the project list in a bordered, inkprint-style block so it doesn't get visually buried.

## Theming

- Always update and verify **both** light and dark styles for any UI changes (including hover/active/disabled states).
- Theme is controlled by `.dark`/`.light` on `document.documentElement` (see `src/components/ThemeToggle.astro`); use Tailwind `dark:` utilities when possible.
- For component-scoped CSS, wrap dark selectors with `:global(.dark)` (e.g., `:global(.dark) .toast { ... }`) to avoid Astro scope leakage.f
- Prefer theme variables from `src/styles/global.css` and `src/styles/typography.css` (`--color-bg`, `--color-dark-bg`, `--color-muted-text`, `--color-dark-muted-text`, `--color-link`, `--color-dark-link`) over hard-coded colors.
- Keep UI surfaces solid; avoid transparency except for essential motion/fade effects.
- Site aesthetic is inkprint/minimal: avoid rounded corners, avoid translucent fills, and use solid borders with `--color-border`/`--color-dark-border`.
- Typography uses `Newsreader` for body content and `IBM Plex Sans Condensed` for UI/labels; keep this pairing consistent.
- Light/dark backgrounds use a subtle paper gradient (`--color-bg` → `--color-surface`, `--color-dark-bg` → `--color-dark-surface`) instead of flat fills.

## Content authoring & notation

- See `BLOG_NOTATION.md` for the full writing syntax: frontmatter, inline code, math, tables, embeds, images, Mermaid diagrams, and MDX components.
- Pseudocode blocks use ` ```pseudocode ` or ` ```algorithm `; they render as inkprint algorithm blocks (not code).
- Regular code uses language fences (` ```ts `, ` ```solidity `, etc.) and keeps the dark code styling.
- Bare external URLs become "link mentions" automatically; custom link text opts out of that behavior.
- Standalone embed URLs (e.g., Dune embeds) auto-render as themed iframes and stay in sync with site theme.
- Mermaid diagrams and images are clickable for a full-screen preview.
- Update `AGENTS.md` whenever new UI components or content features are added so direction stays current.
- Homepage recent toasts should highlight writing only (no project notifications).

## Design system & UX

### Visual direction (vibe + inspiration)

- Overall vibe: inkprint / newspaper, minimal, editorial, thoughtful, and tactile.
- Surfaces feel like paper: solid fills, fine borders, subtle gradients (no glass, no blur, no transparency).
- Inspiration: print layout grids, book typography, and low-contrast paper stock; modernized with clean spacing and crisp rules.
- UI should feel calm and deliberate, not app-y or over-animated.

### Typography system

- Primary body: `Newsreader` for long-form content (prose).
- UI/labels: `IBM Plex Sans Condensed` for caps labels, meta, buttons, and tool UI.
- Keep headings editorial: heavier weight, tighter leading, strong hierarchy.
- Avoid mixing in new fonts unless explicitly asked.
- Example pairing:
  - Title: Newsreader, bold, tight line-height.
  - Meta label: IBM Plex Sans Condensed, uppercase, letter spacing.

### Color + theming

- Always ship both light and dark variants together.
- Use CSS variables from `src/styles/global.css` and `src/styles/typography.css` for consistency.
- Avoid rounded corners and translucent overlays; prefer solid borders and flat fills.
- Dark mode should feel like e-ink: low contrast, warm blacks, muted highlights.
- Light mode should feel like paper: warm off-white backgrounds with muted inks.

### Layout & spacing

- Keep layouts structured and columnar. Use generous white space.
- Prefer horizontal rules (`border`) for separation instead of cards/shadows.
- Inline elements should align with text baselines and feel typeset.
- When highlighting a section (e.g., Toolbox), elevate with spacing + rules, not heavy boxes.

### Motion & interaction

- Minimal motion only: fades, subtle lifts, short durations.
- Avoid bounce, heavy easing, or elaborate animation stacks.
- Hover states should be quiet: slight border darkening or subtle underline.
- For overlays/fullscreen previews: soft fade + small translate; avoid sudden snaps.

### Components & patterns (do/don't)

- Do:
  - Use bordered blocks for modules that need grouping (thin rules).
  - Use uppercase labels for metadata with letter spacing.
- Keep project/writing lists as clean, text-first entries.
- Keep iconography small, monochrome, and minimal.
- Favicon uses a minimal “S.” set in the body serif; keep it simple and inkprint-consistent.
- Don't:
  - Use rounded pills, shadows, or glass-like layers.
  - Introduce saturated accent colors unless already in the palette.
  - Add unnecessary badges/chips unless they serve content hierarchy.

### Tailwind + CSS tips

- Prefer Tailwind utilities for layout + spacing, but define component-specific styling in scoped CSS when needed.
- Use `:global(.dark)` for dark overrides inside component styles.
- Prefer `border-[0.5px]` for thin rules to match print aesthetics.
- Keep line lengths comfortable: align with `.prose` widths.

### Example patterns

- Section header:
  - `class="text-muted-text dark:text-dark-muted-text text-lg font-bold"`
- Meta label:
  - `class="text-[10px] font-semibold uppercase tracking-[0.18em]"`
- Divider:
  - `class="border-border dark:border-dark-border border-[0.5px]"`

### UX principles

- Content first: text readability wins over visual decoration.
- Reduce cognitive load: fewer UI elements, clearer hierarchy.
- Make interactive elements obvious but not loud.
- Maintain consistency across pages and components.

## Writing UX features

- Share button copies the current page URL; it appears near the writing date and at the end.
- External links inside writing entries open in a new tab with `noopener noreferrer`.
- Math rendering uses KaTeX with inline `$...$` and display `$$...$$`.

## Interactive components

- `src/components/SearchVisualizer.astro` renders the interpolation/binary search demos; keep layout compact and inkprint-aligned.
- Visualizer layout follows a Desmos-style split: top bar with title/metrics and window actions, left rail for controls/readout/compare, and a dominant plot on the right.
- The visualizer breaks out of the prose width via the `search-visualizer-frame` wrapper; keep the width fluid and centered.
- Use `src/components/FullscreenFrame.astro` for fullscreen affordances; wire `data-fullscreen-toggle` and `data-fullscreen-close` buttons and keep open/close motion subtle.
- Use MDX to import components (`import SearchVisualizer from "@/components/SearchVisualizer.astro";`) and pass minimal props.
- New interactive components should follow the same typography pairing and solid-border aesthetic.

## Gotchas

- With `trailingSlash: "always"`, internal links should include a trailing `/` (including RSS item links) to avoid 404s.
- `src/components/Favicons.astro` expects favicon files under `public/` that are not tracked.
