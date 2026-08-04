import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: [
        "/",
        "/problems",
        "/leaderboard",
        "/community",
        "/examples",
        "/help",
        "/contact",
        "/updates",
        "/post",
        "/u",
      ],
      disallow: [
        "/admin",
        "/classes",
        "/dashboard",
        "/editor",
        "/feed",
        "/live",
        "/livecode",
        "/learn",
        "/login",
        "/profile",
        "/search",
        "/settings",
      ],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
