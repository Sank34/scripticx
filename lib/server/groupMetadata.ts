import "server-only";

import { cache } from "react";
import {
  isGroupChannelId,
  studyGroupMetadata,
  type ChannelMetadataIdentity,
  type GroupMetadataIdentity,
} from "@/lib/group-metadata";
import { createServerSupabase } from "@/lib/supabaseServer";

export const getStudyGroupMetadata = cache(async (slug: string, channelId?: string) => {
  try {
    const supabase = createServerSupabase({ fetchTimeoutMs: 3_000 });
    const { data: group, error } = await supabase
      .from("study_groups")
      .select("id, name, slug, description, visibility, banner_url")
      .eq("slug", slug)
      .eq("visibility", "public")
      .maybeSingle<GroupMetadataIdentity>();
    if (error || !group || group.visibility !== "public") return studyGroupMetadata(null);

    if (isGroupChannelId(channelId)) {
      const { data: channel, error: channelError } = await supabase
        .from("study_group_channels")
        .select("id, name")
        .eq("group_id", group.id)
        .eq("id", channelId)
        .maybeSingle<ChannelMetadataIdentity>();
      if (!channelError && channel) return studyGroupMetadata(group, channel);
    }
    return studyGroupMetadata(group);
  } catch {
    return studyGroupMetadata(null);
  }
});
