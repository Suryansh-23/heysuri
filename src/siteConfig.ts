import type {
  SiteConfiguration,
  NavigationLinks,
  SocialLinks,
} from "@/types.ts";

export const SITE: SiteConfiguration = {
  title: "Suri",
  description:
    "Web3 Full-Stack Developer building DeFi simulators, blockchain data infra, and intent-based dApps.",
  href: "https://example.com",
  author: "Suri",
  locale: "en-IN",
};

export const NAV_LINKS: NavigationLinks = {
  notes: {
    path: "/notes/",
    label: "Notes",
  },
  projects: {
    path: "/projects/",
    label: "Projects",
  },
  work: {
    path: "/work/",
    label: "Work",
  },
  hello: {
    path: "/hello/",
    label: "Say hello",
  },
  sidequests: {
    path: "/side-quests/",
    label: "Side quests",
  },
};

export const SOCIAL_LINKS: SocialLinks = {
  email: {
    label: "Email",
    href: "mailto:heysuri@proton.me",
  },
  github: {
    label: "GitHub",
    href: "https://github.com/Suryansh-23",
  },
  twitter: {
    label: "Twitter/X",
    href: "https://x.com/SuriPuri23",
  },
};
