import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";

// IPFS Integration - Handles IPFS asset path resolution during build time
function ipfsIntegration() {
  return {
    name: "ipfs-integration",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        logger.info("Processing HTML files for IPFS compatibility...");

        // Process all HTML files recursively
        async function processDirectory(dirPath, depth = 0) {
          const { readdirSync, statSync } = await import("fs");
          const { join } = await import("path");

          const entries = readdirSync(dirPath);

          for (const entry of entries) {
            const fullPath = join(dirPath, entry);
            const stat = statSync(fullPath);

            if (stat.isDirectory()) {
              await processDirectory(fullPath, depth + 1);
            } else if (entry === "index.html") {
              try {
                let content = readFileSync(fullPath, "utf-8");
                let originalContent = readFileSync(fullPath, "utf-8");
                let modified = false;

                // Fix CSS asset paths - convert relative paths to absolute from current directory
                // Pattern: href="../file.css" or href="../../file.css" -> href="./file.css"
                content = content.replace(
                  /href="([\.\/]+)([a-zA-Z_.0-9]+)"/g,
                  `href="${depth == 0 ? "./" : "../".repeat(depth)}$2"`,
                );

                // Fix JS asset paths - convert relative paths to absolute from current directory
                content = content.replace(
                  /src="(\.\.\/)+([^"]+\.js)"/g,
                  'src="./$2"',
                );

                // Check if we made any modifications
                if (content !== originalContent) {
                  modified = true;
                }

                if (modified) {
                  writeFileSync(fullPath, content);
                  logger.info(`Fixed asset paths in: ${fullPath}`);
                }
              } catch (error) {
                logger.error(`Failed to process ${fullPath}: ${error.message}`);
              }
            }
          }
        }

        // Client-side script for navigation links only (keeping assets out)
        const navigationScript = `
<script>
(function() {
  // Detect if we're on IPFS and get the root path
  function getIPFSRoot() {
    var path = window.location.pathname;
    
    // Check for IPFS patterns: /ipfs/hash/ or /ipns/hash/
    var ipfsMatch = path.match(/^\\/(ipfs|ipns)\\/([^\\/]+)/);
    if (ipfsMatch) {
      return '/' + ipfsMatch[1] + '/' + ipfsMatch[2] + '/';
    }
    
    return '/';
  }
  
  // Fix navigation links on page load (assets are now fixed at build time)
  function fixNavigationLinks() {
    var root = getIPFSRoot();
    
    if (root !== '/') {
      // Fix internal navigation links (routes like /notes, /projects, etc.)
      var navLinks = document.querySelectorAll('a[href]');
      navLinks.forEach(function(link) {
        var href = link.getAttribute('href');
        
        // Skip if already processed, external links, or special links
        if (!href || 
            href.indexOf('http') === 0 || 
            href.indexOf('mailto:') === 0 || 
            href.indexOf('tel:') === 0 || 
            href.indexOf('#') === 0 || 
            href.indexOf('javascript:') === 0 ||
            href.indexOf(root) === 0) {
          return;
        }
        
        // Check if it's an internal route (starts with /)
        if (href.indexOf('/') === 0) {
          // Internal routes that should be prefixed with IPFS root
          var isInternalRoute = 
            href === '/' ||
            href.indexOf('/notes') === 0 ||
            href.indexOf('/projects') === 0 ||
            href.indexOf('/work') === 0 ||
            href.indexOf('/hello') === 0 ||
            href.indexOf('/side-quests') === 0 ||
            href.indexOf('/sitemap') === 0 ||
            href.indexOf('/rss.xml') === 0 ||
            href.indexOf('/robots.txt') === 0 ||
            href.indexOf('/site.webmanifest') === 0;
            
          if (isInternalRoute) {
            // Prefix with IPFS root, handling root path specially  
            var newHref = href === '/' ? root : root + href.substring(1);
            link.setAttribute('href', newHref);
          }
        }
      });
    }
  }
  
  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixNavigationLinks);
  } else {
    fixNavigationLinks();
  }
})();
</script>`;

        // Now process directories and inject navigation script
        async function processDirectoryWithScript(dirPath) {
          const { readdirSync, statSync } = await import("fs");
          const { join } = await import("path");

          const entries = readdirSync(dirPath);

          for (const entry of entries) {
            const fullPath = join(dirPath, entry);
            const stat = statSync(fullPath);

            if (stat.isDirectory()) {
              await processDirectoryWithScript(fullPath);
            } else if (entry === "index.html") {
              try {
                let content = readFileSync(fullPath, "utf-8");

                // Inject the navigation script before closing </head>
                if (
                  content.includes("</head>") &&
                  !content.includes("getIPFSRoot()")
                ) {
                  content = content.replace(
                    "</head>",
                    navigationScript + "\n</head>",
                  );
                  writeFileSync(fullPath, content);
                  logger.info(`Added navigation script to: ${fullPath}`);
                }
              } catch (error) {
                logger.error(
                  `Failed to add script to ${fullPath}: ${error.message}`,
                );
              }
            }
          }
        }

        const distPath = fileURLToPath(dir);

        // First pass: Fix asset paths in HTML
        await processDirectory(distPath);

        // Second pass: Add navigation script
        await processDirectoryWithScript(distPath);

        logger.info("IPFS processing complete!");
      },
    },
  };
}

// https://astro.build/config
export default defineConfig({
  integrations: [sitemap(), ipfsIntegration()],
  markdown: {
    shikiConfig: {
      theme: "dark-plus",
    },
  },
  site: "https://ipfs.io/ipns/k51qzi5uqu5dlq5t1j65qpm1wxojwdvrqxgk1jm3b230wvwd2ad6y6mankn20s/",
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
