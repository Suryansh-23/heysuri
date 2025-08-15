import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";

// IPFS Integration - Handles dynamic IPFS root detection and asset path resolution
function ipfsIntegration() {
  return {
    name: "ipfs-integration",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        logger.info("Processing HTML files for IPFS compatibility...");

        // Client-side script that detects IPFS root and fixes asset paths and navigation links
        const ipfsScript = `
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
  
  // Fix asset paths and navigation links on page load
  function fixPaths() {
    var root = getIPFSRoot();
    
    if (root !== '/') {
      // Fix all _astro asset links (CSS, JS, etc.)
      var assetLinks = document.querySelectorAll('link[href*="_astro/"], script[src*="_astro/"]');
      assetLinks.forEach(function(element) {
        var attr = element.tagName === 'LINK' ? 'href' : 'src';
        var path = element.getAttribute(attr);
        
        // Convert relative paths to absolute from IPFS root
        if (path && path.indexOf('_astro/') !== -1) {
          if (path.indexOf('../') === 0) {
            // Remove any ../../../ prefixes and make it absolute from IPFS root
            path = path.replace(/^(\\.\\.\\/)+/g, '');
          } else if (path.indexOf('/') !== 0) {
            // If it's already relative, leave it as is for now
            return;
          }
          
          // Ensure it starts from the IPFS root
          if (path.indexOf(root) !== 0) {
            var cleanPath = path.indexOf('/') === 0 ? path.substring(1) : path;
            element.setAttribute(attr, root + cleanPath);
          }
        }
      });
      
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
          // Common routes: /, /notes, /projects, /work, /hello, /side-quests
          // Also handle dynamic routes like /notes/some-note-id
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
    document.addEventListener('DOMContentLoaded', fixPaths);
  } else {
    fixPaths();
  }
})();
</script>`;

        // Process all HTML files recursively
        async function processDirectory(dirPath) {
          const { readdirSync, statSync } = await import("fs");
          const { join } = await import("path");

          const entries = readdirSync(dirPath);

          for (const entry of entries) {
            const fullPath = join(dirPath, entry);
            const stat = statSync(fullPath);

            if (stat.isDirectory()) {
              await processDirectory(fullPath);
            } else if (entry === "index.html") {
              try {
                let content = readFileSync(fullPath, "utf-8");

                // Inject the IPFS script before closing </head>
                if (content.includes("</head>")) {
                  content = content.replace(
                    "</head>",
                    ipfsScript + "\n</head>",
                  );
                  writeFileSync(fullPath, content);
                  logger.info(`Processed: ${fullPath}`);
                }
              } catch (error) {
                logger.error(`Failed to process ${fullPath}: ${error.message}`);
              }
            }
          }
        }

        const distPath = fileURLToPath(dir);
        await processDirectory(distPath);

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
          assetFileNames: "_astro/[name].[hash][extname]",
        },
      },
    },
    define: {
      "import.meta.env.BUILT_AT": JSON.stringify(new Date().toISOString()),
    },
  },
});
