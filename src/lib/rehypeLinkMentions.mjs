const metadataCache = new Map();
const META_TIMEOUT_MS = 6500;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const decodeHtml = (value = "") =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");

const stripTags = (value = "") =>
  value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]*>/g, " ");

const normalizeText = (value = "") =>
  value
    .replace(/\s+/g, " ")
    .replace(/&nbsp;/gi, " ")
    .trim();

const truncateText = (value = "", max = 140) => {
  if (!value) return value;
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3).trimEnd()}...`;
};

const toTitleCase = (value = "") =>
  value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((word) =>
      word ? `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}` : "",
    )
    .join(" ");

const parseAttributes = (tag) => {
  const attrs = {};
  const attrRegex = /([\w:-]+)\s*=\s*(['"])(.*?)\2/g;
  let match = null;

  while ((match = attrRegex.exec(tag))) {
    attrs[match[1].toLowerCase()] = match[3];
  }

  return attrs;
};

const extractMetaTags = (html) =>
  Array.from(html.matchAll(/<meta\s+[^>]*>/gi), (match) =>
    parseAttributes(match[0]),
  );

const extractLinkTags = (html) =>
  Array.from(html.matchAll(/<link\s+[^>]*>/gi), (match) =>
    parseAttributes(match[0]),
  );

const pickTitle = (html) => {
  const metaTags = extractMetaTags(html);
  const preferred = ["og:title", "twitter:title", "title"];

  for (const key of preferred) {
    const meta = metaTags.find((tag) => {
      const property = (tag.property || tag.name || "").toLowerCase();
      return property === key;
    });
    if (meta?.content) {
      return decodeHtml(meta.content.trim());
    }
  }

  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (titleMatch?.[1]) {
    return decodeHtml(titleMatch[1].trim());
  }

  return null;
};

const pickIcon = (html, baseUrl) => {
  const linkTags = extractLinkTags(html);
  const relPriority = ["apple-touch-icon", "icon", "shortcut icon"];

  for (const rel of relPriority) {
    const link = linkTags.find((tag) => {
      const tagRel = (tag.rel || "").toLowerCase().replace(/\s+/g, " ");
      return tagRel.includes(rel);
    });
    if (link?.href) {
      try {
        return new URL(link.href, baseUrl).toString();
      } catch {
        return link.href;
      }
    }
  }

  return null;
};

const getHostLabel = (url) => {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host.split(".")[0]?.slice(0, 2).toUpperCase() || "EX";
  } catch {
    return "EX";
  }
};

const isTwitterUrl = (url) => {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host === "x.com" || host === "twitter.com";
  } catch {
    return false;
  }
};

const looksLikeUrlTitle = (title) =>
  !title ||
  /^https?:\/\//i.test(title) ||
  title.includes("x.com/") ||
  title.includes("twitter.com/");

const isGenericTwitterTitle = (title = "") => {
  const normalized = title.trim().toLowerCase();
  return normalized === "x" || normalized === "twitter";
};

const extractTweetText = (html = "") => {
  const match = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  const raw = match?.[1] ?? "";
  const cleaned = normalizeText(decodeHtml(stripTags(raw)));
  return cleaned || null;
};

const getTwitterHandle = (authorUrl) => {
  if (!authorUrl) return null;
  try {
    const parts = new URL(authorUrl).pathname.split("/").filter(Boolean);
    return parts[0] || null;
  } catch {
    return null;
  }
};

const fetchTwitterOEmbed = async (url) => {
  const endpoint = `https://publish.twitter.com/oembed?omit_script=true&dnt=true&url=${encodeURIComponent(
    url,
  )}`;
  const response = await fetch(endpoint, {
    headers: { "user-agent": USER_AGENT },
  });

  if (!response.ok) return null;

  const data = await response.json();
  const tweetText = extractTweetText(data?.html || "");
  const handle = getTwitterHandle(data?.author_url);
  const authorLabel = handle ? `@${handle}` : null;

  if (tweetText) {
    const title = authorLabel ? `${authorLabel} — ${tweetText}` : tweetText;
    return {
      title: truncateText(title, 140),
    };
  }

  if (authorLabel) {
    return {
      title: `X post by ${authorLabel}`,
    };
  }

  return null;
};

const deriveTitleFromUrl = (url) => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const segments = parsed.pathname.split("/").filter(Boolean);

    if (host === "x.com" || host === "twitter.com") {
      const user = segments[0];
      if (user) {
        return `X post by @${user}`;
      }
      return "X post";
    }

    if (host === "github.com" && segments.length >= 2) {
      return `GitHub — ${segments[0]}/${segments[1]}`;
    }

    if (host === "dune.com") {
      if (segments[0] === "queries" && segments[1]) {
        return `Dune Query #${segments[1]}`;
      }
      if (segments[0] === "embeds" && segments[1]) {
        return `Dune Embed #${segments[1]}`;
      }
    }

    if (host.endsWith("cs.wisc.edu")) {
      const last = segments[segments.length - 1];
      if (last) {
        const cleaned = last.replace(/\.[a-z0-9]+$/i, "");
        const title = toTitleCase(cleaned);
        if (title) {
          return `${title} (PDF)`;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
};

const fetchMetadata = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), META_TIMEOUT_MS);
  const allowTwitterOEmbed = isTwitterUrl(url);
  let twitterEmbed = null;

  try {
    if (allowTwitterOEmbed) {
      try {
        twitterEmbed = await fetchTwitterOEmbed(url);
      } catch {
        twitterEmbed = null;
      }
    }

    const response = await fetch(url, {
      headers: { "user-agent": USER_AGENT },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Bad response ${response.status}`);
    }

    const html = await response.text();
    const title = pickTitle(html);
    const icon = pickIcon(html, url);

    return {
      title,
      icon,
      hostLabel: getHostLabel(url),
      derivedTitle: deriveTitleFromUrl(url),
      oEmbedTitle: twitterEmbed?.title || null,
    };
  } catch {
    return {
      title: null,
      icon: null,
      hostLabel: getHostLabel(url),
      derivedTitle: deriveTitleFromUrl(url),
      oEmbedTitle: twitterEmbed?.title || null,
    };
  } finally {
    clearTimeout(timeout);
  }
};

const getMetadata = (url) => {
  if (!metadataCache.has(url)) {
    metadataCache.set(url, fetchMetadata(url));
  }
  return metadataCache.get(url);
};

const getNodeText = (node) => {
  if (!node) return "";
  if (node.type === "text") return node.value || "";
  if (Array.isArray(node.children)) {
    return node.children.map(getNodeText).join("");
  }
  return "";
};

const normalizeHref = (href) =>
  typeof href === "string" ? href.trim() : "";

const isExternalLink = (href) => /^https?:\/\//i.test(normalizeHref(href));

const isEmbedLink = (href) => {
  try {
    const url = new URL(normalizeHref(href));
    return (
      /\/embeds?\//i.test(url.pathname) ||
      url.pathname.includes("/embed") ||
      url.searchParams.has("embed")
    );
  } catch {
    return false;
  }
};

const getEmbedThemeParam = (href) => {
  try {
    const url = new URL(normalizeHref(href));
    if (url.searchParams.has("darkMode")) return "darkMode";
    if (url.searchParams.has("theme")) return "theme";
    if (url.hostname.replace(/^www\./, "") === "dune.com") {
      if (/\/embeds?\//i.test(url.pathname)) return "darkMode";
    }
  } catch {
    return null;
  }
  return null;
};

const isBareLinkText = (text, href) => {
  if (!text) return false;
  const normalizedText = text.trim();
  const normalizedHref = href.trim();

  if (normalizedText === normalizedHref) return true;

  const hrefWithoutProtocol = normalizedHref.replace(/^https?:\/\//i, "");
  if (normalizedText === hrefWithoutProtocol) return true;

  try {
    const url = new URL(href);
    const display = `${url.hostname}${url.pathname}${url.search}${url.hash}`;
    return normalizedText === display || normalizedText === url.hostname;
  } catch {
    return false;
  }
};

const visit = (node, callback) => {
  if (!node || typeof node !== "object") return;
  callback(node);
  if (Array.isArray(node.children)) {
    node.children.forEach((child) => visit(child, callback));
  }
};

const ensureClassName = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
};

const getMeaningfulChildren = (node) => {
  if (!Array.isArray(node?.children)) return [];
  return node.children.filter(
    (child) =>
      child.type !== "text" || (child.value || "").trim().length > 0,
  );
};

const PSEUDOCODE_LANGUAGES = new Set(["pseudocode", "algorithm", "algo"]);

const extractCodeLines = (preNode) => {
  const codeNode = Array.isArray(preNode.children)
    ? preNode.children.find(
        (child) => child.type === "element" && child.tagName === "code",
      )
    : null;
  if (!codeNode) return [];

  const lineNodes = Array.isArray(codeNode.children)
    ? codeNode.children.filter((child) => {
        if (child.type !== "element" || child.tagName !== "span") return false;
        const className = ensureClassName(child.properties?.className);
        return className.includes("line");
      })
    : [];

  const lines = lineNodes.length
    ? lineNodes.map((lineNode) =>
        getNodeText(lineNode)
          .replace(/\u00a0/g, " ")
          .replace(/\s+$/g, ""),
      )
    : getNodeText(codeNode)
        .split(/\r?\n/)
        .map((line) => line.replace(/\u00a0/g, " ").replace(/\s+$/g, ""));

  while (lines.length && lines[lines.length - 1].trim() === "") {
    lines.pop();
  }

  return lines;
};

const looksLikePseudocode = (node) => {
  const lines = extractCodeLines(node);
  const firstLine = lines.find((line) => line.trim().length > 0);
  if (!firstLine) return false;
  if (/^Algorithm\b/i.test(firstLine.trim())) return true;
  return lines.some((line) => {
    const trimmed = line.trim();
    return /^Input\s*:/i.test(trimmed) || /^Output\s*:/i.test(trimmed);
  });
};

const isPseudocodeLanguage = (node) => {
  if (!node || node.type !== "element" || node.tagName !== "pre") return false;
  const props = node.properties || {};
  const language = props["data-language"] || props.dataLanguage;
  if (!language) return false;
  const normalized = String(language).toLowerCase();
  if (PSEUDOCODE_LANGUAGES.has(normalized)) return true;
  if (normalized === "plaintext" || normalized === "text") {
    return looksLikePseudocode(node);
  }
  return false;
};

const parsePseudocodeLines = (lines) => {
  let title = null;
  const io = [];
  const steps = [];

  lines.forEach((rawLine) => {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      steps.push({ kind: "spacer" });
      return;
    }

    if (!title && /^Algorithm\b/i.test(trimmed)) {
      title = trimmed;
      return;
    }

    const ioMatch = trimmed.match(/^(Input|Output)\s*:\s*(.*)$/i);
    if (ioMatch) {
      io.push({ label: ioMatch[1], value: ioMatch[2] });
      return;
    }

    const stepMatch = rawLine.match(/^(\d+)\s*:(.*)$/);
    if (stepMatch) {
      steps.push({
        kind: "step",
        number: stepMatch[1],
        text: stepMatch[2].replace(/\s+$/g, ""),
      });
      return;
    }

    steps.push({ kind: "line", text: rawLine });
  });

  if (!title) {
    const firstLineIndex = steps.findIndex(
      (step) => step.kind === "line" && step.text.trim().length > 0,
    );
    if (firstLineIndex >= 0) {
      title = steps[firstLineIndex].text.trim();
      steps.splice(firstLineIndex, 1);
    }
  }

  if (!title && io.length === 0 && steps.length === 0) return null;

  while (steps.length && steps[0].kind === "spacer") {
    steps.shift();
  }
  while (steps.length && steps[steps.length - 1].kind === "spacer") {
    steps.pop();
  }

  return { title, io, steps };
};

const buildAlgorithmChildren = (parsed) => {
  const createText = (value) => ({ type: "text", value });
  const createElement = (tagName, properties, children = []) => ({
    type: "element",
    tagName,
    properties,
    children,
  });

  const children = [];

  if (parsed.title) {
    children.push(
      createElement(
        "div",
        { className: ["algorithm-title"] },
        [createText(parsed.title)],
      ),
    );
  }

  if (parsed.io.length) {
    children.push(
      createElement(
        "div",
        { className: ["algorithm-io"] },
        parsed.io.map((entry) =>
          createElement(
            "div",
            { className: ["algorithm-io-row"] },
            [
              createElement(
                "span",
                { className: ["algorithm-label"] },
                [createText(`${entry.label}:`)],
              ),
              entry.value
                ? createElement(
                    "span",
                    { className: ["algorithm-value"] },
                    [createText(entry.value)],
                  )
                : createElement("span", { className: ["algorithm-value"] }, []),
            ],
          ),
        ),
      ),
    );
  }

  if (parsed.steps.length) {
    children.push(
      createElement(
        "div",
        { className: ["algorithm-steps"] },
        parsed.steps.map((step) => {
          if (step.kind === "spacer") {
            return createElement("div", { className: ["algorithm-spacer"] }, []);
          }

          if (step.kind === "step") {
            return createElement(
              "div",
              { className: ["algorithm-step"] },
              [
                createElement(
                  "span",
                  { className: ["algorithm-step-number"] },
                  [createText(`${step.number}.`)],
                ),
                createElement(
                  "span",
                  { className: ["algorithm-step-text"] },
                  [createText(step.text)],
                ),
              ],
            );
          }

          return createElement(
            "div",
            { className: ["algorithm-line"] },
            [
              createElement(
                "span",
                { className: ["algorithm-step-text"] },
                [createText(step.text)],
              ),
            ],
          );
        }),
      ),
    );
  }

  return children;
};

export default function rehypeLinkMentions() {
  return async (tree) => {
    const candidates = [];
    const embedCandidates = [];

    visit(tree, (node) => {
      if (isPseudocodeLanguage(node)) {
        const lines = extractCodeLines(node);
        const parsed = parsePseudocodeLines(lines);
        if (parsed) {
          node.tagName = "div";
          node.properties = { className: ["algorithm-block"] };
          node.children = buildAlgorithmChildren(parsed);
        }
      }

      if (node.type === "element" && node.tagName === "p") {
        const children = getMeaningfulChildren(node);
        if (children.length === 1) {
          const child = children[0];
          if (child.type === "element" && child.tagName === "a") {
            const href = child.properties?.href;
            if (href && isExternalLink(href) && isEmbedLink(href)) {
              embedCandidates.push({ node, href });
            }
          }
        }
      }

      if (node.type !== "element" || node.tagName !== "a") return;
      const href = node.properties?.href;
      if (!href || !isExternalLink(href)) return;
      if (isEmbedLink(href)) return;
      if (node.properties?.["data-link-mention"] === "true") return;

      const text = getNodeText(node);
      if (!isBareLinkText(text, href)) return;

      candidates.push({ node, href, fallbackText: text });
    });

    if (candidates.length > 0) {
      const metadataList = await Promise.all(
        candidates.map(async ({ href, fallbackText }) => {
          const metadata = await getMetadata(href);
          return {
            href,
            fallbackText,
            metadata,
          };
        }),
      );

      metadataList.forEach(({ href, fallbackText, metadata }, index) => {
        const target = candidates[index]?.node;
        if (!target) return;

        const metaTitle = metadata?.title?.trim() || null;
        const derivedTitle =
          metadata?.derivedTitle || deriveTitleFromUrl(href) || null;
        const oEmbedTitle = metadata?.oEmbedTitle || null;
        const isTwitterLink = isTwitterUrl(href);
        const cleanedMetaTitle =
          metaTitle && !looksLikeUrlTitle(metaTitle) ? metaTitle : null;
        const usableMetaTitle =
          isTwitterLink && cleanedMetaTitle && isGenericTwitterTitle(metaTitle)
            ? null
            : cleanedMetaTitle;
        const twitterTitle =
          oEmbedTitle || derivedTitle || usableMetaTitle || "X post";
        const title = isTwitterLink
          ? twitterTitle
          : usableMetaTitle ||
            oEmbedTitle ||
            derivedTitle ||
            fallbackText ||
            href.replace(/^https?:\/\//i, "");
        const hostLabel = metadata?.hostLabel || getHostLabel(href);

        const className = ensureClassName(target.properties?.className);
        target.properties = {
          ...target.properties,
          className: [...className, "link-mention"],
          "data-link-mention": "true",
        };

        const iconNode = {
          type: "element",
          tagName: "span",
          properties: {
            className: ["link-mention__icon"],
            "data-host": hostLabel,
            "data-has-icon": metadata?.icon ? "true" : "false",
          },
          children: metadata?.icon
            ? [
                {
                  type: "element",
                  tagName: "img",
                  properties: {
                    src: metadata.icon,
                    alt: "",
                    loading: "lazy",
                    decoding: "async",
                  },
                  children: [],
                },
              ]
            : [],
        };

        const titleNode = {
          type: "element",
          tagName: "span",
          properties: { className: ["link-mention__title"] },
          children: [{ type: "text", value: title }],
        };

        target.children = [iconNode, titleNode];
      });
    }

    embedCandidates.forEach(({ node, href }) => {
      let hostLabel = "EM";
      let hostName = href;
      try {
        const parsed = new URL(href);
        hostName = parsed.hostname.replace(/^www\./, "");
        hostLabel = hostName.slice(0, 2).toUpperCase();
      } catch {}

      const themeParam = getEmbedThemeParam(href);
      const properties = {
        className: ["embed-frame"],
        "data-embed-url": href,
        "data-embed-host": hostName,
      };
      if (themeParam) {
        properties["data-embed-theme-param"] = themeParam;
      }

      node.tagName = "div";
      node.properties = properties;
      node.children = [
        {
          type: "element",
          tagName: "div",
          properties: { className: ["embed-frame__shell"] },
          children: [
            {
              type: "element",
              tagName: "iframe",
              properties: {
                className: ["embed-frame__iframe"],
                src: href,
                title: `Embed from ${hostName}`,
                loading: "lazy",
                referrerpolicy: "no-referrer",
                allowfullscreen: true,
              },
              children: [],
            },
          ],
        },
        {
          type: "element",
          tagName: "div",
          properties: { className: ["embed-frame__meta"] },
          children: [
            {
              type: "element",
              tagName: "span",
              properties: { className: ["embed-frame__source"] },
              children: [{ type: "text", value: hostLabel }],
            },
            {
              type: "element",
              tagName: "a",
              properties: {
                className: ["embed-frame__link"],
                href,
                target: "_blank",
                rel: "noopener noreferrer",
              },
              children: [{ type: "text", value: `Open ${hostName}` }],
            },
          ],
        },
      ];
    });
  };
}
