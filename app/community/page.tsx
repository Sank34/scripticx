import Link from "next/link";
import { Users } from "lucide-react";

import { createPageMetadata, absoluteUrl, siteConfig } from "@/lib/metadata";
import { createServerSupabase } from "@/lib/supabaseServer";

export const revalidate = 3600;

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

type PublicProfile = {
  username: string;
  avatar_url: string | null;
  bio: string | null;
  total_score: number | null;
};

export default async function CommunityPage() {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from("profiles")
    .select("username, avatar_url, bio, total_score")
    .not("username", "is", null)
    .order("total_score", { ascending: false })
    .limit(500);

  const profiles = (data || []).filter(
    (profile): profile is PublicProfile => Boolean(profile.username)
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
    <main className="mx-auto w-full max-w-6xl space-y-8 p-6 md:p-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(collectionJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <header className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="size-4" />
          <span>{profiles.length} profiluri publice</span>
        </div>
        <h1 className="text-3xl font-bold">Comunitatea ScripticX</h1>
        <p className="max-w-2xl text-muted-foreground">
          Descoperă membrii comunității, progresul lor și proiectele publicate
          pe ScripticX.
        </p>
      </header>

      {profiles.length > 0 ? (
        <section
          aria-label="Profiluri publice ScripticX"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {profiles.map((profile) => {
            const profileHref = `/u/${encodeURIComponent(profile.username)}`;
            const initial = profile.username.charAt(0).toUpperCase();

            return (
              <Link
                key={profile.username}
                href={profileHref}
                className="flex min-w-0 items-center gap-3 rounded-lg border bg-background p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {profile.avatar_url ? (
                  <span
                    aria-label={`Imaginea de profil a utilizatorului ${profile.username}`}
                    role="img"
                    className="size-11 shrink-0 rounded-full border bg-cover bg-center"
                    style={{ backgroundImage: `url("${profile.avatar_url}")` }}
                  />
                ) : (
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full border bg-muted font-medium">
                    {initial}
                  </span>
                )}

                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {profile.username}
                  </span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {profile.bio || "Membru al comunității ScripticX"}
                  </span>
                </span>

                <span className="shrink-0 text-xs text-muted-foreground">
                  {profile.total_score || 0} pct
                </span>
              </Link>
            );
          })}
        </section>
      ) : (
        <p className="rounded-lg border p-6 text-muted-foreground">
          Profilurile publice nu sunt disponibile momentan.
        </p>
      )}
    </main>
  );
}
