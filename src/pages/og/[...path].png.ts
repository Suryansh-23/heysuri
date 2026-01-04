import { ImageResponse } from "@vercel/og";
import { createElement } from "react";
import { getCollection } from "astro:content";
import { SITE } from "@/siteConfig";
import { formatDate } from "@/lib/util";

export const prerender = true;

const h = createElement;

const fetchFont = async (url: string) => {
  const fontResponse = await fetch(url);
  if (!fontResponse.ok) {
    throw new Error("Unable to fetch font file.");
  }

  return fontResponse.arrayBuffer();
};

const plexSerifFont = await fetchFont(
  "https://raw.githubusercontent.com/google/fonts/main/ofl/ibmplexserif/IBMPlexSerif-SemiBold.ttf",
);
const plexFont = await fetchFont(
  "https://raw.githubusercontent.com/google/fonts/main/ofl/ibmplexsanscondensed/IBMPlexSansCondensed-Medium.ttf",
);

const STATIC_PAGES = [
  {
    path: "index",
    title: SITE.title,
    description: SITE.description,
    type: "Home",
    slug: "home",
  },
  {
    path: "notes",
    title: "Notes",
    description: "Notes and writing.",
    type: "Notes",
    slug: "notes",
  },
  {
    path: "projects",
    title: "Projects",
    description: "Selected projects and experiments.",
    type: "Projects",
    slug: "projects",
  },
  {
    path: "work",
    title: "Work",
    description: "Roles and work experience.",
    type: "Work",
    slug: "work",
  },
  {
    path: "hello",
    title: "Say hello",
    description: "Ways to reach Suryansh.",
    type: "Contact",
    slug: "hello",
  },
  {
    path: "side-quests",
    title: "Side quests",
    description: "Music and cinema that inspire me.",
    type: "Side quests",
    slug: "side-quests",
  },
];

const ACCENTS = ["#2a4a78", "#1f3a5f", "#6b7a93", "#5c544a"];

const clampText = (value: string, max: number) => {
  if (!value) return "";
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3).trimEnd()}...`;
};

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const buildBarcode = (seed: number, count = 16) =>
  Array.from({ length: count }, (_, index) => {
    const slice = (seed >> (index % 16)) & 7;
    return 4 + slice;
  });

const formatOgDate = (date: Date) =>
  formatDate(date, { year: "numeric", month: "short", day: "2-digit" });

export async function getStaticPaths() {
  const notes = await getCollection("notes");

  return [
    ...STATIC_PAGES.map((page) => ({
      params: { path: page.path },
      props: page,
    })),
    ...notes.map((entry) => ({
      params: { path: `notes/${entry.id}` },
      props: {
        title: entry.data.title,
        description: entry.data.description,
        type: "Note",
        slug: entry.id,
        date: entry.data.publicationDate,
      },
    })),
  ];
}

export async function GET({ params, props }: { params: any; props: any }) {
  const path = params?.path ?? "index";
  const title = clampText(props?.title || SITE.title, 64);
  const description = clampText(props?.description || SITE.description, 140);
  const type = props?.type || "Page";
  const slug = props?.slug || path;
  const date = props?.date ? formatOgDate(props.date) : "Current";
  const seed = hashString(path);
  const serial = `INK-${seed.toString(36).toUpperCase().slice(0, 6)}`;
  const accent = ACCENTS[seed % ACCENTS.length];
  const barcode = buildBarcode(seed, 18);

  const border = "#d7d0c4";
  const surface = "#f1ebdf";
  const ink = "#1b1a17";
  const muted = "#5c544a";

  const barcodeNodes = barcode.map((width, index) =>
    h("span", {
      key: `bar-${index}`,
      style: {
        width: `${width}px`,
        height: "18px",
        backgroundColor: accent,
      },
    }),
  );

  const root = h(
    "div",
    {
      style: {
        width: "1200px",
        height: "630px",
        backgroundColor: "#f6f1e7",
        color: ink,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "56px 64px",
        fontFamily: "IBM Plex Serif",
      },
    },
    h(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontFamily: "IBM Plex Sans Condensed",
          textTransform: "uppercase",
          letterSpacing: "0.32em",
          fontSize: "18px",
          color: muted,
        },
      },
      h("span", null, type),
      h("span", null, serial),
    ),
    h(
      "div",
      {
        style: {
          display: "flex",
          gap: "32px",
          alignItems: "stretch",
          flex: 1,
        },
      },
      h(
        "div",
        {
          style: {
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "18px",
            paddingTop: "24px",
          },
        },
        h(
          "div",
          { style: { fontSize: "62px", fontWeight: 600, lineHeight: 1.1 } },
          title,
        ),
        h(
          "div",
          {
            style: {
              fontSize: "26px",
              lineHeight: 1.4,
              color: muted,
              maxWidth: "720px",
            },
          },
          description,
        ),
        h(
          "div",
          {
            style: {
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              fontFamily: "IBM Plex Sans Condensed",
              fontSize: "14px",
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              marginTop: "12px",
            },
          },
          h(
            "span",
            {
              style: {
                border: `1px solid ${border}`,
                padding: "6px 10px",
                backgroundColor: surface,
              },
            },
            slug,
          ),
          h(
            "span",
            {
              style: {
                border: `1px solid ${border}`,
                padding: "6px 10px",
                backgroundColor: surface,
              },
            },
            date,
          ),
        ),
      ),
      h(
        "div",
        {
          style: {
            width: "300px",
            border: `1px solid ${border}`,
            backgroundColor: surface,
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          },
        },
        h(
          "div",
          {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontFamily: "IBM Plex Sans Condensed",
              textTransform: "uppercase",
              letterSpacing: "0.28em",
              fontSize: "12px",
              color: muted,
            },
          },
          h("span", null, "Receipt"),
          h("span", {
            style: {
              width: "14px",
              height: "14px",
              border: `1px solid ${border}`,
              backgroundColor: accent,
            },
          }),
        ),
        h(
          "div",
          {
            style: {
              borderTop: `1px solid ${border}`,
              paddingTop: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              fontFamily: "IBM Plex Sans Condensed",
              fontSize: "16px",
            },
          },
          h(
            "div",
            { style: { display: "flex", justifyContent: "space-between" } },
            h("span", { style: { color: muted } }, "Type"),
            h("span", null, type),
          ),
          h(
            "div",
            { style: { display: "flex", justifyContent: "space-between" } },
            h("span", { style: { color: muted } }, "Issue"),
            h("span", null, date),
          ),
          h(
            "div",
            { style: { display: "flex", justifyContent: "space-between" } },
            h("span", { style: { color: muted } }, "Ref"),
            h("span", null, serial),
          ),
        ),
        h(
          "div",
          {
            style: {
              marginTop: "auto",
              display: "flex",
              gap: "4px",
              alignItems: "center",
            },
          },
          ...barcodeNodes,
        ),
      ),
    ),
    h(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: "IBM Plex Sans Condensed",
          textTransform: "uppercase",
          letterSpacing: "0.32em",
          fontSize: "12px",
          color: muted,
        },
      },
      h("span", null, SITE.title),
      h(
        "span",
        {
          style: {
            border: `1px solid ${border}`,
            padding: "6px 10px",
            backgroundColor: surface,
          },
        },
        type,
      ),
    ),
  );

  return new ImageResponse(root, {
    width: 1200,
    height: 630,
    fonts: [
      {
        name: "IBM Plex Serif",
        data: plexSerifFont,
        weight: 600,
        style: "normal",
      },
      {
        name: "IBM Plex Sans Condensed",
        data: plexFont,
        weight: 500,
        style: "normal",
      },
    ],
  });
}
