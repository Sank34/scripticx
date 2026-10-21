import { describe, expect, it } from "vitest";
import { absoluteUrl } from "./metadata";
import { groupChannelHref, groupChannelNavigationUrl, groupDocumentTitle, isGroupChannelId, studyGroupMetadata } from "./group-metadata";

const group = { id: "group-id", name: "Algorithms Club", slug: "algorithms", description: "Discuss **algorithms** and solve problems together.", visibility: "public", banner_url: null };
const channel = { id: "00000000-0000-4000-8000-000000000001", name: "general" };

describe("study group metadata", () => {
  it("uses the public group's identity, excerpt, canonical URL, and generated social preview", () => {
    const metadata = studyGroupMetadata(group);
    expect(metadata).toMatchObject({ title: "Algorithms Club — Study Group", description: "Discuss algorithms and solve problems together.", alternates: { canonical: absoluteUrl("/groups/algorithms") }, robots: { index: true, follow: true } });
    expect(metadata.openGraph).toMatchObject({ title: metadata.title, description: metadata.description, url: absoluteUrl("/groups/algorithms"), siteName: "ScripticX" });
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image", title: metadata.title });
    expect(JSON.stringify(metadata.openGraph)).toContain("section=Study%20Groups");
  });
  it("uses the public banner when present", () => {
    expect(studyGroupMetadata({ ...group, banner_url: "https://example.com/banner.png" }).openGraph).toMatchObject({ images: ["https://example.com/banner.png"] });
  });
  it("gives a channel its own title and canonical link, without indexing conversations", () => {
    const metadata = studyGroupMetadata(group, channel);
    expect(metadata).toMatchObject({ title: "#general · Algorithms Club", alternates: { canonical: absoluteUrl(`/groups/algorithms?channel=${channel.id}`) }, robots: { index: false, follow: false, noarchive: true } });
    expect(metadata.description).toContain("#general");
  });
  it("never discloses private group or channel details in public metadata", () => {
    const metadata = studyGroupMetadata({ ...group, name: "Confidential title", description: "Secret description", visibility: "private", banner_url: "https://example.com/private-banner.png" }, { ...channel, name: "Secret channel" });
    const serialized = JSON.stringify(metadata);
    for (const secret of ["Confidential", "Secret", "private-banner"]) expect(serialized).not.toContain(secret);
    expect(metadata).toMatchObject({ title: "Study Group", robots: { index: false, follow: false } });
    expect(studyGroupMetadata(null)).toEqual(metadata);
  });
  it("uses a readable fallback for blank descriptions and limits long excerpts", () => {
    expect(studyGroupMetadata({ ...group, description: "###" }).description).toContain("Join Algorithms Club");
    expect(studyGroupMetadata({ ...group, description: "Long description ".repeat(40) }).description?.length).toBeLessThanOrEqual(160);
  });
});

describe("channel links and browser titles", () => {
  it("reflects the current channel and group without duplicate hash prefixes", () => {
    expect(groupDocumentTitle("Algorithms Club", "#general")).toBe("#general · Algorithms Club | ScripticX");
    expect(groupDocumentTitle("Algoritmi și idei", "întrebări")).toBe("#întrebări · Algoritmi și idei | ScripticX");
    expect(groupDocumentTitle("  Club\nName  ")).toBe("Club Name | ScripticX");
  });
  it("encodes slugs and identifiers safely", () => {
    expect(groupChannelHref("club & team", channel.id)).toBe(`/groups/club%20%26%20team?channel=${channel.id}`);
    expect(groupChannelHref("club")).toBe("/groups/club");
  });
  it("preserves unrelated query parameters and fragments when switching or clearing a channel", () => {
    const href = groupChannelNavigationUrl("https://example.com/groups/club?view=media&channel=old#message", channel.id);
    expect(href).toBe(`/groups/club?view=media&channel=${channel.id}#message`);
    expect(groupChannelNavigationUrl(`https://example.com${href}`, null)).toBe("/groups/club?view=media#message");
  });
  it("validates channel IDs before database lookups", () => {
    expect(isGroupChannelId(channel.id)).toBe(true);
    for (const value of [undefined, [channel.id], "general", "../private", "invalid"]) expect(isGroupChannelId(value)).toBe(false);
  });
});
