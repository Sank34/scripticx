import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/metadata";
import { getDocsPages, getExamplesPages } from "@/lib/server/docs";
import { createServerSupabase } from "@/lib/supabaseServer";

const publicRoutes = [
  "/",
  "/problems",
  "/leaderboard",
  "/community",
  "/help",
  "/contact",
  "/updates",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const docsRoutes = [...new Set(getDocsPages("en").map((page) => page.href))];
  const exampleRoutes = [
    ...new Set(getExamplesPages("en").map((page) => page.href)),
  ];
  const staticEntries: MetadataRoute.Sitemap = [
    ...publicRoutes,
    ...docsRoutes,
    ...exampleRoutes,
  ].map((route) => ({
    url: absoluteUrl(route),
    changeFrequency: route === "/updates" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : route === "/problems" ? 0.9 : 0.7,
  }));

  try {
    // Dynamic entries are an enhancement. A database outage must not block a
    // production build or prevent the static sitemap from being generated.
    const supabase = createServerSupabase({ fetchTimeoutMs: 4_000 });
    const [problemsResult, updatesResult, profilesResult, postsResult] =
      await Promise.all([
        supabase.from("problems").select("id").limit(500),
        supabase.from("updates").select("slug, date").limit(200),
        supabase.from("profiles").select("username").limit(500),
        supabase
          .from("posts")
          .select("id, created_at")
          .order("created_at", { ascending: false })
          .limit(500),
      ]);

    const problemEntries: MetadataRoute.Sitemap = (
      problemsResult.data || []
    ).map((problem) => ({
      url: absoluteUrl(`/problems/${problem.id}`),
      changeFrequency: "monthly",
      priority: 0.8,
    }));

    const updateEntries: MetadataRoute.Sitemap = (updatesResult.data || []).map(
      (update) => ({
        url: absoluteUrl(`/updates/${update.slug}`),
        lastModified: update.date ? new Date(update.date) : undefined,
        changeFrequency: "monthly",
        priority: 0.7,
      })
    );

    const profileEntries: MetadataRoute.Sitemap = (
      profilesResult.data || []
    )
      .filter((profile) => Boolean(profile.username))
      .map((profile) => ({
        url: absoluteUrl(`/u/${encodeURIComponent(profile.username)}`),
        changeFrequency: "weekly",
        priority: 0.5,
      }));

    const postEntries: MetadataRoute.Sitemap = (postsResult.data || []).map(
      (post) => ({
        url: absoluteUrl(`/post/${post.id}`),
        lastModified: post.created_at
          ? new Date(post.created_at)
          : undefined,
        changeFrequency: "monthly",
        priority: 0.5,
      })
    );

    return [
      ...staticEntries,
      ...problemEntries,
      ...updateEntries,
      ...profileEntries,
      ...postEntries,
    ];
  } catch (error) {
    console.warn("Could not build the dynamic sitemap.", error);
    return staticEntries;
  }
}
