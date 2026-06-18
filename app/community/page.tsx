import { CommunityDirectory } from "@/components/community/CommunityDirectory";
import { createPageMetadata, absoluteUrl, siteConfig } from "@/lib/metadata";
import { createServerSupabase } from "@/lib/supabaseServer";
import type { CommunityProfile } from "@/lib/community";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "ScripticX Community",
  description:
    "Discover public ScripticX member profiles, programming progress, and community activity.",
  path: "/community",
  keywords: [
    "ScripticX users",
    "programming community",
    "programmer profiles",
  ],
});

export default async function CommunityPage() {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from("profiles")
    .select("username, avatar_url, bio, total_score")
    .not("username", "is", null)
    .order("total_score", { ascending: false })
    .limit(500);

  const profiles = (data || []).filter(
    (profile): profile is CommunityProfile => Boolean(profile.username)
  );
  const communityUrl = absoluteUrl("/community");
  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${communityUrl}#collection`,
    url: communityUrl,
    name: "ScripticX Community",
    description:
      "A directory of public profiles from the ScripticX programming community.",
    isPartOf: {
      "@type": "WebSite",
      "@id": `${siteConfig.url}/#website`,
      name: siteConfig.name,
      url: siteConfig.url,
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: profiles.length,
      itemListElement: profiles.slice(0, 100).map((profile, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(`/u/${encodeURIComponent(profile.username)}`),
        name: profile.username,
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(collectionJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <CommunityDirectory initialProfiles={profiles} />
    </>
  );
}
