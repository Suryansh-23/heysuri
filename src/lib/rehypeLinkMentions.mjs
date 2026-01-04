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

const isExternalLink = (href) => /^https?:\/\//i.test(href);

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

export default function rehypeLinkMentions() {
  return async (tree) => {
    const candidates = [];

    visit(tree, (node) => {
      if (node.type !== "element" || node.tagName !== "a") return;
      const href = node.properties?.href;
      if (!href || !isExternalLink(href)) return;
      if (node.properties?.["data-link-mention"] === "true") return;

      const text = getNodeText(node);
      if (!isBareLinkText(text, href)) return;

      candidates.push({ node, href, fallbackText: text });
    });

    if (candidates.length === 0) return;

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
  };
}
