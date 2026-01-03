import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { SITE } from "@/siteConfig";

export async function GET(context) {
  const notes = await getCollection("notes");
  return rss({
    title: `${SITE.title} — Notes`,
    description: SITE.description,
    site: context.site,
    items: notes.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.publicationDate,
      link: `/notes/${post.id}/`,
    })),
  });
}
