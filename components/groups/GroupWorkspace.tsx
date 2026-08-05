"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  Check,
  Copy,
  ExternalLink,
  Hash,
  ImagePlus,
  LinkIcon,
  Lock,
  LogOut,
  MessageSquare,
  Pencil,
  Plus,
  Radio,
  Search,
  Send,
  SmilePlus,
  Settings,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  api,
  type MentionCandidate,
  type ProfileSummary,
  type StudyGroupMember,
  type StudyGroupMessage,
  type StudyGroupSticker,
  type StudyGroupWorkspace as StudyGroupWorkspaceData,
} from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";
import { EmptyState } from "@/components/common/EmptyState";
import {
  markStudyGroupChannelSeen,
  markStudyGroupSeen,
  useGroupActivity,
} from "@/hooks/useGroupActivity";
import { UserAvatar } from "@/components/user/UserAvatar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Bubble, BubbleContent, BubbleReactions } from "@/components/ui/bubble";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageGroup,
  MessageHeader,
} from "@/components/ui/message";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type GroupWorkspaceProps = {
  slug: string;
};

function DeferredRender({
  delayMs = 32,
  fallback,
  render,
}: {
  delayMs?: number;
  fallback: ReactNode;
  render: () => ReactNode;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setReady(true);
    }, delayMs);

    return () => window.clearTimeout(timeout);
  }, [delayMs]);

  return ready ? <>{render()}</> : <>{fallback}</>;
}

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🔥", "🎉"];
const EMOJI_REACTIONS = [
  { emoji: "😀", label: "grinning happy smile" },
  { emoji: "😃", label: "smile happy" },
  { emoji: "😄", label: "laugh happy" },
  { emoji: "😁", label: "grin" },
  { emoji: "😆", label: "laughing" },
  { emoji: "🥹", label: "holding tears" },
  { emoji: "😂", label: "joy laugh tears" },
  { emoji: "🤣", label: "rolling laugh" },
  { emoji: "🙂", label: "slight smile" },
  { emoji: "😊", label: "blush smile" },
  { emoji: "😇", label: "angel" },
  { emoji: "🥰", label: "love hearts" },
  { emoji: "😍", label: "heart eyes" },
  { emoji: "🤩", label: "star eyes" },
  { emoji: "😘", label: "kiss" },
  { emoji: "😎", label: "cool sunglasses" },
  { emoji: "🥳", label: "party celebrate" },
  { emoji: "😏", label: "smirk" },
  { emoji: "😅", label: "sweat smile" },
  { emoji: "😭", label: "cry sob" },
  { emoji: "😢", label: "sad cry" },
  { emoji: "🥲", label: "tear smile" },
  { emoji: "😤", label: "triumph" },
  { emoji: "😡", label: "angry" },
  { emoji: "🤯", label: "mind blown" },
  { emoji: "😳", label: "flushed" },
  { emoji: "😱", label: "scream" },
  { emoji: "😴", label: "sleep" },
  { emoji: "🤔", label: "thinking" },
  { emoji: "🫡", label: "salute" },
  { emoji: "🤨", label: "raised eyebrow" },
  { emoji: "🙃", label: "upside down" },
  { emoji: "🫠", label: "melting" },
  { emoji: "🤝", label: "handshake" },
  { emoji: "👏", label: "clap applause" },
  { emoji: "🙌", label: "raised hands" },
  { emoji: "🙏", label: "pray thanks" },
  { emoji: "👌", label: "ok" },
  { emoji: "👍", label: "thumbs up like" },
  { emoji: "👎", label: "thumbs down dislike" },
  { emoji: "✌️", label: "peace" },
  { emoji: "🤞", label: "fingers crossed" },
  { emoji: "💪", label: "strong flex" },
  { emoji: "🫶", label: "heart hands" },
  { emoji: "👀", label: "eyes watch" },
  { emoji: "🧠", label: "brain smart" },
  { emoji: "💻", label: "laptop code" },
  { emoji: "⌨️", label: "keyboard" },
  { emoji: "🐛", label: "bug" },
  { emoji: "🚀", label: "rocket launch" },
  { emoji: "🔥", label: "fire hot" },
  { emoji: "⚡", label: "lightning fast" },
  { emoji: "✨", label: "sparkles" },
  { emoji: "⭐", label: "star" },
  { emoji: "🌟", label: "glowing star" },
  { emoji: "💫", label: "dizzy star" },
  { emoji: "🎯", label: "target" },
  { emoji: "🏆", label: "trophy" },
  { emoji: "🥇", label: "gold medal" },
  { emoji: "🎉", label: "party popper" },
  { emoji: "🎊", label: "confetti" },
  { emoji: "❤️", label: "red heart love" },
  { emoji: "🧡", label: "orange heart" },
  { emoji: "💛", label: "yellow heart" },
  { emoji: "💚", label: "green heart" },
  { emoji: "💙", label: "blue heart" },
  { emoji: "💜", label: "purple heart" },
  { emoji: "🖤", label: "black heart" },
  { emoji: "🤍", label: "white heart" },
  { emoji: "💔", label: "broken heart" },
  { emoji: "💯", label: "hundred perfect" },
  { emoji: "✅", label: "check done" },
  { emoji: "❌", label: "x wrong" },
  { emoji: "⚠️", label: "warning" },
  { emoji: "❗", label: "exclamation" },
  { emoji: "❓", label: "question" },
  { emoji: "📝", label: "notes write" },
  { emoji: "📌", label: "pin" },
  { emoji: "📚", label: "books learn" },
  { emoji: "💡", label: "idea lightbulb" },
  { emoji: "🔒", label: "lock" },
  { emoji: "🔑", label: "key" },
  { emoji: "🍀", label: "luck clover" },
  { emoji: "☕", label: "coffee" },
  { emoji: "🍕", label: "pizza" },
  { emoji: "🍰", label: "cake" },
  { emoji: "🐢", label: "turtle slow" },
  { emoji: "🐍", label: "snake python" },
  { emoji: "🐱", label: "cat" },
  { emoji: "🐶", label: "dog" },
];

function normalizeChannelSlug(value: string) {
  const slug = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug || "channel-name";
}

type TypingUser = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  lastSeen: number;
};

function getJoinedProfile(
  value: ProfileSummary | ProfileSummary[] | null | undefined
) {
  return Array.isArray(value) ? value[0] : value || null;
}

type ReactionUser = {
  id: string;
  username: string;
  avatarUrl: string | null;
};

function buildReactionGroups(
  reactions: StudyGroupMessage["reactions"] = [],
  userId: string | null
) {
  const grouped = new Map<
    string,
    {
      emoji: string;
      count: number;
      reactedByMe: boolean;
      users: ReactionUser[];
    }
  >();

  for (const reaction of reactions) {
    const current =
      grouped.get(reaction.emoji) ||
      { emoji: reaction.emoji, count: 0, reactedByMe: false, users: [] };
    const profile = getJoinedProfile(reaction.profiles);
    const username = profile?.username || "user";

    current.count += 1;
    current.reactedByMe = current.reactedByMe || reaction.user_id === userId;
    current.users.push({
      id: reaction.user_id,
      username,
      avatarUrl: profile?.avatar_url || null,
    });
    grouped.set(reaction.emoji, current);
  }

  return Array.from(grouped.values());
}

function MentionPreview({ profile }: { profile: ProfileSummary }) {
  const username = profile.username || "user";
  const initial = username.slice(0, 1).toUpperCase();

  return (
    <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-64 -translate-x-1/2 overflow-hidden rounded-2xl border bg-white text-left text-zinc-950 shadow-xl group-hover/mention:block">
      <span
        className="block h-14 bg-gradient-to-br from-zinc-900 via-zinc-700 to-emerald-400 bg-cover bg-center"
        style={
          profile.banner_url
            ? {
                backgroundImage: `linear-gradient(120deg, rgba(9,9,11,0.34), rgba(16,185,129,0.08)), url("${profile.banner_url}")`,
              }
            : undefined
        }
      />
      <span className="-mt-5 flex items-end gap-3 px-3 pb-3">
        <span
          className="flex size-12 shrink-0 items-center justify-center rounded-full border-4 border-white bg-zinc-100 bg-cover bg-center text-sm font-semibold text-zinc-500 shadow-sm"
          style={
            profile.avatar_url
              ? { backgroundImage: `url(${profile.avatar_url})` }
              : undefined
          }
        >
          {profile.avatar_url ? null : initial}
        </span>
        <span className="min-w-0 pb-1">
          <span className="block truncate text-sm font-semibold">
            {username}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            @{username}
          </span>
        </span>
      </span>
    </span>
  );
}

function renderMessageContent(
  content: string,
  profilesByUsername: Map<string, ProfileSummary>,
  stickersByToken: Map<string, StudyGroupSticker>
) {
  const pattern = /(\/live\/[a-f0-9-]+|@[a-zA-Z0-9_-]+|:sticker-[a-f0-9-]+:)/gi;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(pattern)) {
    const token = match[0];
    const index = match.index || 0;

    if (index > lastIndex) {
      nodes.push(content.slice(lastIndex, index));
    }

    if (token.startsWith("/live/")) {
      nodes.push(
        <Link
          key={`${token}-${index}`}
          href={token}
          className="font-medium text-emerald-600 underline-offset-4 hover:underline"
        >
          {token}
        </Link>
      );
    } else if (token.toLowerCase().startsWith(":sticker-")) {
      const sticker = stickersByToken.get(token.toLowerCase());

      nodes.push(
        sticker ? (
          <img
            key={`${token}-${index}`}
            src={sticker.image_url}
            alt={sticker.name}
            className="mx-0.5 inline-block size-8 object-contain align-middle"
          />
        ) : (
          token
        )
      );
    } else {
      const username = token.slice(1);
      const profile = profilesByUsername.get(username.toLowerCase());

      nodes.push(
        <span
          key={`${token}-${index}`}
          className="group/mention relative inline-flex align-baseline"
        >
          {profile?.username ? (
            <Link
              href={`/u/${profile.username}`}
              className="font-semibold text-emerald-600 underline-offset-4 hover:underline"
            >
              @{profile.username}
            </Link>
          ) : (
            <span className="font-semibold text-emerald-600">{token}</span>
          )}
          {profile ? <MentionPreview profile={profile} /> : null}
        </span>
      );
    }

    lastIndex = index + token.length;
  }

  if (lastIndex < content.length) {
    nodes.push(content.slice(lastIndex));
  }

  return <>{nodes}</>;
}

function getInlineStickerToken(sticker: Pick<StudyGroupSticker, "id">) {
  return `:sticker-${sticker.id}:`;
}

function getStickerMessageData(item: StudyGroupMessage) {
  const metadata = item.metadata || {};
  const stickerUrl =
    typeof metadata.stickerUrl === "string" ? metadata.stickerUrl : null;
  const stickerName =
    typeof metadata.stickerName === "string" ? metadata.stickerName : item.content;

  return { stickerUrl, stickerName };
}

function getGroupRoleLabel(role: string | null | undefined, t: (key: string) => string) {
  if (role === "owner") return t("groups.roles.owner");
  if (role === "admin") return t("groups.roles.admin");
  return t("groups.roles.member");
}

function getProfileDisplayName(
  profile: ProfileSummary | null | undefined,
  fallback: string
) {
  if (typeof profile?.username === "string" && profile.username.trim()) {
    return profile.username;
  }

  if (typeof profile?.email === "string" && profile.email.trim()) {
    return profile.email;
  }

  return fallback;
}

function StudyGroupMemberPreview({
  member,
  profile,
  t,
}: {
  member: StudyGroupMember;
  profile: ProfileSummary | null;
  t: (key: string) => string;
}) {
  const username = profile?.username || "user";
  const profileHref = profile?.username ? `/u/${profile.username}` : null;
  const roleLabel = getGroupRoleLabel(member.role, t);
  const totalScore =
    typeof profile?.total_score === "number" ? profile.total_score : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition hover:bg-white"
        >
          <UserAvatar
            avatarUrl={profile?.avatar_url}
            username={username}
            equippedRewards={profile?.equipped_rewards}
            className="size-8"
          />
          <div className="min-w-0">
            <p className="truncate font-medium text-zinc-950">{username}</p>
            <p className="text-xs text-muted-foreground">{roleLabel}</p>
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="left"
        align="start"
        sideOffset={12}
        className="w-80 overflow-hidden rounded-3xl border-zinc-200 bg-white p-0 shadow-2xl"
      >
        <div
          className={
            profile?.banner_url
              ? "h-24 bg-cover bg-center"
              : "h-24 bg-gradient-to-br from-zinc-800 via-zinc-700 to-emerald-500"
          }
          style={
            profile?.banner_url
              ? { backgroundImage: `url("${profile.banner_url}")` }
              : undefined
          }
        />
        <div className="px-5 pb-5">
          <div className="-mt-10 flex items-end justify-between gap-3">
            <UserAvatar
              avatarUrl={profile?.avatar_url}
              username={username}
              equippedRewards={profile?.equipped_rewards}
              className="size-20 border-4 border-white shadow-sm"
            />
            <span className="rounded-full border bg-white px-3 py-1 text-xs font-medium text-zinc-700 shadow-sm">
              {roleLabel}
            </span>
          </div>

          <div className="mt-4 space-y-1">
            <h3 className="truncate text-2xl font-bold text-zinc-950">
              {username}
            </h3>
            <p className="truncate text-sm text-muted-foreground">
              @{username}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl border bg-zinc-50 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {t("groups.memberPreview.role")}
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-zinc-950">
                {roleLabel}
              </p>
            </div>
            <div className="rounded-2xl border bg-zinc-50 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {t("groups.memberPreview.score")}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-zinc-950">
                <Award className="size-3.5 text-amber-500" />
                {totalScore ?? 0} pts
              </p>
            </div>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {t("groups.memberPreview.description").replace(
              "{groupRole}",
              roleLabel.toLowerCase()
            )}
          </p>

          {profileHref ? (
            <Button asChild className="mt-4 w-full gap-2" size="lg">
              <Link href={profileHref}>
                {t("groups.memberPreview.viewProfile")}
                <ExternalLink className="size-4" />
              </Link>
            </Button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function GroupWorkspace({ slug }: GroupWorkspaceProps) {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastTypingSentRef = useRef(0);
  const typingStopTimeoutRef = useRef<number | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, TypingUser>>({});
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionActiveIndex, setMentionActiveIndex] = useState(0);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState("");
  const [savingMessageId, setSavingMessageId] = useState<string | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [emojiSearch, setEmojiSearch] = useState("");
  const [emojiPickerMessageId, setEmojiPickerMessageId] = useState<
    string | null
  >(null);
  const [composerPickerOpen, setComposerPickerOpen] = useState(false);
  const [composerPickerTab, setComposerPickerTab] = useState("emoji");
  const [composerEmojiSearch, setComposerEmojiSearch] = useState("");
  const [stickerSearch, setStickerSearch] = useState("");
  const [channelDialogOpen, setChannelDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState("general");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [deletingChannelId, setDeletingChannelId] = useState<string | null>(null);
  const [inviteQuery, setInviteQuery] = useState("");
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [settingsName, setSettingsName] = useState("");
  const [settingsDescription, setSettingsDescription] = useState("");
  const [settingsVisibility, setSettingsVisibility] = useState<"public" | "private">("public");
  const [settingsAvatarFile, setSettingsAvatarFile] = useState<File | null>(null);
  const [settingsBannerFile, setSettingsBannerFile] = useState<File | null>(null);
  const [settingsAvatarPreviewUrl, setSettingsAvatarPreviewUrl] =
    useState<string | null>(null);
  const [settingsBannerPreviewUrl, setSettingsBannerPreviewUrl] =
    useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [startingLive, setStartingLive] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [creatingInviteLink, setCreatingInviteLink] = useState(false);
  const [stickerName, setStickerName] = useState("");
  const [stickerFile, setStickerFile] = useState<File | null>(null);
  const [savingSticker, setSavingSticker] = useState(false);
  const [deletingStickerId, setDeletingStickerId] = useState<string | null>(null);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [transferringOwnerId, setTransferringOwnerId] = useState<string | null>(null);
  const [leavingGroup, setLeavingGroup] = useState(false);

  const workspaceQuery = useQuery<StudyGroupWorkspaceData>({
    queryKey: ["groups", slug],
    queryFn: () => api.groups.getWorkspace(slug),
  });

  const workspace = workspaceQuery.data;
  const group = workspace?.group || null;
  const groupId = group?.id || null;
  const userId = workspace?.userId || null;
  const membership = workspace?.membership || null;
  const channels = useMemo(
    () => workspace?.channels || [],
    [workspace?.channels]
  );
  const members = useMemo(
    () => workspace?.members || [],
    [workspace?.members]
  );
  const stickers = useMemo(
    () => workspace?.stickers || [],
    [workspace?.stickers]
  );
  const activeChannel =
    channels.find((channel) => channel.id === activeChannelId) ||
    channels[0] ||
    null;
  const activeMembership = membership?.status === "active";
  const canManage =
    membership?.role === "owner" || membership?.role === "admin";
  const canInvite = activeMembership;
  const canManageChannels = membership?.role === "owner";
  const canManageStickers = membership?.role === "owner";
  const isGroupOwner = membership?.role === "owner";
  const channelSlugPreview = normalizeChannelSlug(newChannelName);
  const groupInitial = group?.name?.charAt(0).toUpperCase() || "S";
  const settingsAvatarPreview =
    settingsAvatarPreviewUrl || group?.avatar_url || null;
  const settingsBannerPreview =
    settingsBannerPreviewUrl || group?.banner_url || null;
  const groupActivity = useGroupActivity(userId);
  const currentMember = useMemo(
    () => members.find((member) => member.user_id === userId) || null,
    [members, userId]
  );
  const currentProfile = currentMember
    ? api.groups.getMemberProfile(currentMember)
    : null;
  const activeMembers = useMemo(
    () => members.filter((member) => member.status === "active"),
    [members]
  );
  const memberIds = useMemo(
    () => new Set(members.map((member) => member.user_id)),
    [members]
  );
  const visibleTypingUsers = useMemo(
    () => Object.values(typingUsers),
    [typingUsers]
  );
  const mentionProfilesByUsername = useMemo(() => {
    const map = new Map<string, ProfileSummary>();

    for (const member of members) {
      const profile = api.groups.getMemberProfile(member);
      if (profile?.username) {
        map.set(profile.username.toLowerCase(), profile);
      }
    }

    return map;
  }, [members]);
  const filteredEmojiReactions = useMemo(() => {
    const query = emojiSearch.trim().toLowerCase();

    if (!query) return EMOJI_REACTIONS;

    return EMOJI_REACTIONS.filter(
      (item) =>
        item.emoji.includes(query) ||
      item.label.toLowerCase().includes(query)
    );
  }, [emojiSearch]);
  const filteredComposerEmojis = useMemo(() => {
    const query = composerEmojiSearch.trim().toLowerCase();

    if (!query) return EMOJI_REACTIONS;

    return EMOJI_REACTIONS.filter(
      (item) =>
        item.emoji.includes(query) ||
        item.label.toLowerCase().includes(query)
    );
  }, [composerEmojiSearch]);
  const filteredStickers = useMemo(() => {
    const query = stickerSearch.trim().toLowerCase();

    if (!query) return stickers;

    return stickers.filter((sticker) =>
      sticker.name.toLowerCase().includes(query)
    );
  }, [stickerSearch, stickers]);
  const stickersByInlineToken = useMemo(() => {
    const map = new Map<string, StudyGroupSticker>();

    for (const sticker of stickers) {
      map.set(getInlineStickerToken(sticker).toLowerCase(), sticker);
    }

    return map;
  }, [stickers]);
  const closeComposerPicker = () => {
    setComposerPickerOpen(false);
    setComposerEmojiSearch("");
    setStickerSearch("");
  };
  const closeEmojiPicker = () => {
    flushSync(() => {
      setEmojiPickerMessageId(null);
      setEmojiSearch("");
    });
  };
  const mentionCandidates = useMemo<MentionCandidate[]>(() => {
    const query = mentionQuery.trim().toLowerCase();

    return members
      .map((member) => {
        const profile = api.groups.getMemberProfile(member);
        const username = profile?.username || "";

        if (!username || member.user_id === userId) return null;
        if (query && !username.toLowerCase().includes(query)) return null;

        return {
          id: member.user_id,
          username,
          avatar_url: profile?.avatar_url || null,
          isFollowing: false,
        };
      })
      .filter((candidate): candidate is MentionCandidate => Boolean(candidate))
      .slice(0, 8);
  }, [members, mentionQuery, userId]);
  const membersRef = useRef<StudyGroupWorkspaceData["members"]>([]);

  useEffect(() => {
    membersRef.current = members;
  }, [members]);

  useEffect(() => {
    if (!activeChannelId && channels[0]) {
      setActiveChannelId(channels[0].id);
    }
  }, [activeChannelId, channels]);

  useEffect(() => {
    if (!group) return;

    setSettingsName(group.name);
    setSettingsDescription(group.description || "");
    setSettingsVisibility(group.visibility === "private" ? "private" : "public");
    setSettingsAvatarFile(null);
    setSettingsBannerFile(null);
  }, [group]);

  useEffect(() => {
    if (!settingsAvatarFile) {
      setSettingsAvatarPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(settingsAvatarFile);
    setSettingsAvatarPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [settingsAvatarFile]);

  useEffect(() => {
    if (!settingsBannerFile) {
      setSettingsBannerPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(settingsBannerFile);
    setSettingsBannerPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [settingsBannerFile]);

  useEffect(() => {
    if (!groupId || !userId || !activeMembership) return;

    markStudyGroupSeen(userId, groupId);

    void api.notifications
      .markGroupMentionsAsRead(userId, groupId)
      .then(() =>
        Promise.all([
          queryClient.invalidateQueries({ queryKey: ["notifications"] }),
          queryClient.invalidateQueries({ queryKey: ["groups", "activity", userId] }),
        ])
      )
      .catch((error) => {
        console.warn("Could not mark group mentions as read:", error);
      });
  }, [activeMembership, groupId, queryClient, userId]);

  const messagesQuery = useQuery<StudyGroupMessage[]>({
    queryKey: ["groups", slug, "messages", activeChannel?.id],
    queryFn: () =>
      activeChannel ? api.groups.listMessages(activeChannel.id) : Promise.resolve([]),
    enabled: Boolean(activeChannel?.id && activeMembership),
  });

  const latestMessageAt = messagesQuery.data?.at(-1)?.created_at || null;

  useEffect(() => {
    if (!groupId || !userId || !activeMembership || !latestMessageAt) return;

    markStudyGroupSeen(userId, groupId);
    if (activeChannel?.id) {
      markStudyGroupChannelSeen(userId, groupId, activeChannel.id);
    }

    void api.notifications
      .markGroupMentionsAsRead(userId, groupId)
      .then(() =>
        Promise.all([
          queryClient.invalidateQueries({ queryKey: ["notifications"] }),
          queryClient.invalidateQueries({ queryKey: ["groups", "activity", userId] }),
        ])
      )
      .catch((error) => {
        console.warn("Could not mark live group mentions as read:", error);
      });
  }, [
    activeChannel?.id,
    activeMembership,
    groupId,
    latestMessageAt,
    queryClient,
    userId,
  ]);

  const inviteCandidatesQuery = useQuery<MentionCandidate[]>({
    queryKey: ["groups", slug, "invite-candidates", inviteQuery],
    queryFn: () =>
      userId
        ? api.profiles.searchMentionCandidates(userId, inviteQuery, 20)
        : Promise.resolve([]),
    enabled: Boolean(inviteDialogOpen && userId && canInvite),
  });

  const inviteCandidates = (inviteCandidatesQuery.data || []).filter(
    (candidate) => !memberIds.has(candidate.id)
  );

  useEffect(() => {
    if (!groupId) return;

    const channel = supabase
      .channel(`study-group:${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "study_group_channels",
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["groups", slug] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "study_group_members",
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["groups", slug] });
          void queryClient.invalidateQueries({ queryKey: ["groups"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "study_group_messages",
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          const eventType = payload.eventType;
          const nextMessage = payload.new as StudyGroupMessage | null;

          if (eventType === "INSERT" && nextMessage?.channel_id) {
            const member = membersRef.current.find(
              (item) => item.user_id === nextMessage.user_id
            );
            const profile = member ? api.groups.getMemberProfile(member) : null;

            queryClient.setQueryData<StudyGroupMessage[]>(
              ["groups", slug, "messages", nextMessage.channel_id],
              (current = []) => {
                if (current.some((item) => item.id === nextMessage.id)) {
                  return current;
                }

                const withoutOptimisticDuplicate = current.filter(
                  (item) =>
                    !(
                      item.id.startsWith("optimistic-") &&
                      item.user_id === nextMessage.user_id &&
                      item.content === nextMessage.content &&
                      item.kind === nextMessage.kind
                    )
                );

                return [
                  ...withoutOptimisticDuplicate,
                  {
                    ...nextMessage,
                    profiles: profile,
                    reactions: [],
                  },
                ];
              }
            );
            return;
          }

          void queryClient.invalidateQueries({
            queryKey: ["groups", slug, "messages"],
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "study_group_message_reactions",
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          void queryClient.invalidateQueries({
            queryKey: ["groups", slug, "messages"],
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "study_group_stickers",
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["groups", slug] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, queryClient, slug]);

  useEffect(() => {
    if (!groupId || !activeChannel?.id || !userId || !activeMembership) {
      setTypingUsers({});
      typingChannelRef.current = null;
      return;
    }

    setTypingUsers({});

    const channel = supabase
      .channel(`study-group-typing:${groupId}:${activeChannel.id}`)
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const typingPayload = payload as {
          userId?: string;
          username?: string;
          avatarUrl?: string | null;
          channelId?: string;
          isTyping?: boolean;
        };

        if (
          !typingPayload.userId ||
          typingPayload.userId === userId ||
          typingPayload.channelId !== activeChannel.id
        ) {
          return;
        }

        const typingUserId = typingPayload.userId;

        setTypingUsers((current) => {
          const next = { ...current };

          if (!typingPayload.isTyping) {
            delete next[typingUserId];
            return next;
          }

          next[typingUserId] = {
            userId: typingUserId,
            username: typingPayload.username || "user",
            avatarUrl: typingPayload.avatarUrl || null,
            lastSeen: Date.now(),
          };

          return next;
        });
      })
      .subscribe();

    typingChannelRef.current = channel;

    const cleanupInterval = window.setInterval(() => {
      setTypingUsers((current) => {
        const now = Date.now();
        const next = Object.fromEntries(
          Object.entries(current).filter(
            ([, typingUser]) => now - typingUser.lastSeen < 3500
          )
        );

        return Object.keys(next).length === Object.keys(current).length
          ? current
          : next;
      });
    }, 1500);

    return () => {
      window.clearInterval(cleanupInterval);
      if (typingStopTimeoutRef.current) {
        window.clearTimeout(typingStopTimeoutRef.current);
      }
      typingChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [activeChannel?.id, activeMembership, groupId, userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messagesQuery.data?.length, activeChannel?.id, visibleTypingUsers.length]);

  useEffect(() => {
    setMentionActiveIndex(0);
  }, [mentionQuery, activeChannel?.id]);

  function broadcastTyping(isTyping: boolean) {
    if (!typingChannelRef.current || !activeChannel?.id || !userId) return;

    void typingChannelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: {
        userId,
        username: currentProfile?.username || "user",
        avatarUrl: currentProfile?.avatar_url || null,
        channelId: activeChannel.id,
        isTyping,
      },
    });
  }

  function updateMentionSearch(value: string, cursor: number) {
    const beforeCursor = value.slice(0, cursor);
    const match = beforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_-]*)$/);

    if (!match) {
      setMentionOpen(false);
      setMentionStart(null);
      setMentionQuery("");
      return;
    }

    const query = match[1] || "";
    setMentionOpen(true);
    setMentionStart(cursor - query.length - 1);
    setMentionQuery(query);
  }

  function handleMessageChange(value: string, cursor = value.length) {
    setMessage(value);
    updateMentionSearch(value, cursor);

    if (!value.trim()) {
      broadcastTyping(false);
      return;
    }

    const now = Date.now();
    if (now - lastTypingSentRef.current > 1200) {
      lastTypingSentRef.current = now;
      broadcastTyping(true);
    }

    if (typingStopTimeoutRef.current) {
      window.clearTimeout(typingStopTimeoutRef.current);
    }

    typingStopTimeoutRef.current = window.setTimeout(() => {
      broadcastTyping(false);
    }, 1800);
  }

  function insertMention(candidate: MentionCandidate) {
    if (mentionStart === null) return;

    const input = messageInputRef.current;
    const cursor = input?.selectionStart ?? message.length;
    const before = message.slice(0, mentionStart);
    const after = message.slice(cursor);
    const nextMessage = `${before}@${candidate.username} ${after}`;
    const nextCursor = before.length + candidate.username.length + 2;

    setMessage(nextMessage);
    setMentionOpen(false);
    setMentionStart(null);
    setMentionQuery("");

    window.requestAnimationFrame(() => {
      messageInputRef.current?.focus();
      messageInputRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  }

  function insertComposerEmoji(emoji: string) {
    const input = messageInputRef.current;
    const start = input?.selectionStart ?? message.length;
    const end = input?.selectionEnd ?? start;
    const nextMessage = `${message.slice(0, start)}${emoji}${message.slice(end)}`;
    const nextCursor = start + emoji.length;

    setMessage(nextMessage);
    closeComposerPicker();

    window.requestAnimationFrame(() => {
      messageInputRef.current?.focus();
      messageInputRef.current?.setSelectionRange(nextCursor, nextCursor);
      updateMentionSearch(nextMessage, nextCursor);
    });
  }

  function insertComposerSticker(sticker: StudyGroupSticker) {
    const input = messageInputRef.current;
    const start = input?.selectionStart ?? message.length;
    const end = input?.selectionEnd ?? start;
    const before = message.slice(0, start);
    const after = message.slice(end);
    const leadingSpace = before.length && !/\s$/.test(before) ? " " : "";
    const trailingSpace = after.length && !/^\s/.test(after) ? " " : "";
    const insertion = `${leadingSpace}${getInlineStickerToken(sticker)}${trailingSpace}`;
    const nextMessage = `${before}${insertion}${after}`;
    const nextCursor = before.length + insertion.length;

    setMessage(nextMessage);
    closeComposerPicker();

    window.requestAnimationFrame(() => {
      messageInputRef.current?.focus();
      messageInputRef.current?.setSelectionRange(nextCursor, nextCursor);
      updateMentionSearch(nextMessage, nextCursor);
    });
  }

  function handleMessageKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionOpen) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setMentionActiveIndex((current) =>
          mentionCandidates.length
            ? (current + 1) % mentionCandidates.length
            : current
        );
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setMentionActiveIndex((current) =>
          mentionCandidates.length
            ? (current - 1 + mentionCandidates.length) %
              mentionCandidates.length
            : current
        );
        return;
      }

      if ((event.key === "Enter" || event.key === "Tab") && mentionCandidates.length) {
        event.preventDefault();
        insertMention(mentionCandidates[mentionActiveIndex] || mentionCandidates[0]);
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setMentionOpen(false);
        return;
      }
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  async function joinGroup() {
    if (!group || !userId) return;

    try {
      const status = await api.groups.joinGroup(
        group.id,
        userId,
        group.visibility,
        locale
      );
      toast.success(
        status === "pending"
          ? t("groups.toasts.requested")
          : t("groups.toasts.joined")
      );
      await queryClient.invalidateQueries({ queryKey: ["groups", slug] });
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
    } catch (error) {
      console.error("Could not join group:", error);
      toast.error(t("groups.toasts.joinFailed"));
    }
  }

  async function sendMessage() {
    if (!group || !activeChannel || !userId || !message.trim() || sending) return;

    const content = message.trim();
    const optimisticMessage: StudyGroupMessage = {
      id: `optimistic-${Date.now()}`,
      group_id: group.id,
      channel_id: activeChannel.id,
      user_id: userId,
      content,
      kind: "message",
      metadata: { optimistic: true },
      created_at: new Date().toISOString(),
      profiles: currentProfile,
      reactions: [],
    };

    setMessage("");
    setMentionOpen(false);
    setMentionStart(null);
    setMentionQuery("");
    broadcastTyping(false);
    queryClient.setQueryData<StudyGroupMessage[]>(
      ["groups", slug, "messages", activeChannel.id],
      (current = []) => [...current, optimisticMessage]
    );
    setSending(true);

    try {
      await api.groups.sendMessage({
        groupId: group.id,
        channelId: activeChannel.id,
        userId,
        content,
        locale,
      });
      await queryClient.invalidateQueries({
        queryKey: ["groups", slug, "messages", activeChannel.id],
      });
    } catch (error) {
      console.error("Could not send group message:", error);
      queryClient.setQueryData<StudyGroupMessage[]>(
        ["groups", slug, "messages", activeChannel.id],
        (current = []) =>
          current.filter((item) => item.id !== optimisticMessage.id)
      );
      setMessage((current) => current || content);
      toast.error(t("groups.toasts.messageFailed"));
    } finally {
      setSending(false);
    }
  }

  async function toggleReaction(item: StudyGroupMessage, emoji: string) {
    if (!group || !userId) return;

    try {
      await api.groups.toggleMessageReaction({
        groupId: group.id,
        messageId: item.id,
        userId,
        emoji,
      });
      await queryClient.invalidateQueries({
        queryKey: ["groups", slug, "messages", activeChannel?.id],
      });
    } catch (error) {
      console.error("Could not update group message reaction:", error);
      toast.error(t("groups.toasts.reactionFailed"));
    }
  }

  function startEditingMessage(item: StudyGroupMessage) {
    setEditingMessageId(item.id);
    setEditingMessageText(item.content);
  }

  function cancelEditingMessage() {
    setEditingMessageId(null);
    setEditingMessageText("");
  }

  async function saveEditedMessage(item: StudyGroupMessage) {
    if (!group || !userId || item.user_id !== userId || savingMessageId) return;

    const content = editingMessageText.trim();
    if (!content) return;

    setSavingMessageId(item.id);

    try {
      await api.groups.updateMessage({
        groupId: group.id,
        messageId: item.id,
        userId,
        content,
      });
      cancelEditingMessage();
      await queryClient.invalidateQueries({
        queryKey: ["groups", slug, "messages", activeChannel?.id],
      });
      toast.success(t("groups.toasts.messageUpdated"));
    } catch (error) {
      console.error("Could not update group message:", error);
      toast.error(t("groups.toasts.messageUpdateFailed"));
    } finally {
      setSavingMessageId(null);
    }
  }

  async function deleteMessage(item: StudyGroupMessage) {
    if (!group || deletingMessageId) return;

    setDeletingMessageId(item.id);

    try {
      await api.groups.deleteMessage({
        groupId: group.id,
        messageId: item.id,
      });
      await queryClient.invalidateQueries({
        queryKey: ["groups", slug, "messages", activeChannel?.id],
      });
      toast.success(t("groups.toasts.messageDeleted"));
    } catch (error) {
      console.error("Could not delete group message:", error);
      toast.error(t("groups.toasts.messageDeleteFailed"));
    } finally {
      setDeletingMessageId(null);
    }
  }

  async function createChannel() {
    if (!group || !userId || !newChannelName.trim() || !canManageChannels) return;

    try {
      const channel = await api.groups.createChannel({
        groupId: group.id,
        userId,
        name: newChannelName,
      });
      setNewChannelName("");
      setChannelDialogOpen(false);
      setActiveChannelId(channel.id);
      toast.success(t("groups.toasts.channelCreated"));
      await queryClient.invalidateQueries({ queryKey: ["groups", slug] });
    } catch (error) {
      console.error("Could not create channel:", error);
      toast.error(t("groups.toasts.channelFailed"));
    }
  }

  async function deleteChannel(channelId: string) {
    if (!group || !userId || !canManageChannels || deletingChannelId) return;

    setDeletingChannelId(channelId);

    try {
      await api.groups.deleteChannel({
        groupId: group.id,
        channelId,
        userId,
      });

      const nextChannel = channels.find((channel) => channel.id !== channelId);
      if (activeChannel?.id === channelId) {
        setActiveChannelId(nextChannel?.id || null);
      }

      toast.success(t("groups.toasts.channelDeleted"));
      await queryClient.invalidateQueries({ queryKey: ["groups", slug] });
      await queryClient.invalidateQueries({ queryKey: ["groups", slug, "messages"] });
    } catch (error) {
      console.error("Could not delete channel:", error);
      toast.error(t("groups.toasts.channelDeleteFailed"));
    } finally {
      setDeletingChannelId(null);
    }
  }

  async function updateSettings() {
    if (!group || !settingsName.trim() || savingSettings) return;

    setSavingSettings(true);

    try {
      await api.groups.updateGroup({
        groupId: group.id,
        name: settingsName,
        description: settingsDescription,
        visibility: settingsVisibility,
        avatarFile: settingsAvatarFile,
        bannerFile: settingsBannerFile,
      });
      setSettingsAvatarFile(null);
      setSettingsBannerFile(null);
      setSettingsDialogOpen(false);
      toast.success(t("groups.toasts.updated"));
      await queryClient.invalidateQueries({ queryKey: ["groups", slug] });
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
    } catch (error) {
      console.error("Could not update group settings:", error);
      toast.error(t("groups.toasts.updateFailed"));
    } finally {
      setSavingSettings(false);
    }
  }

  async function updateMemberRole(
    member: StudyGroupMember,
    role: "admin" | "member"
  ) {
    if (!group || !userId || !isGroupOwner || member.role === "owner") return;

    setUpdatingMemberId(member.user_id);

    try {
      await api.groups.updateMemberRole({
        groupId: group.id,
        actorId: userId,
        memberId: member.user_id,
        role,
      });
      await queryClient.invalidateQueries({ queryKey: ["groups", slug] });
      toast.success(
        role === "admin"
          ? t("groups.toasts.memberPromoted")
          : t("groups.toasts.memberDemoted")
      );
    } catch (error) {
      console.error("Could not update group member role:", error);
      toast.error(t("groups.toasts.memberRoleFailed"));
    } finally {
      setUpdatingMemberId(null);
    }
  }

  async function transferOwnership(member: StudyGroupMember) {
    if (!group || !userId || !isGroupOwner || member.role === "owner") return;

    setTransferringOwnerId(member.user_id);

    try {
      await api.groups.transferOwnership({
        groupId: group.id,
        currentOwnerId: userId,
        newOwnerId: member.user_id,
      });
      await queryClient.invalidateQueries({ queryKey: ["groups", slug] });
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success(t("groups.toasts.ownershipTransferred"));
    } catch (error) {
      console.error("Could not transfer group ownership:", error);
      toast.error(t("groups.toasts.ownershipTransferFailed"));
    } finally {
      setTransferringOwnerId(null);
    }
  }

  async function leaveGroup() {
    if (!group || !userId || leavingGroup) return;

    if (isGroupOwner) {
      toast.error(t("groups.toasts.ownerLeaveBlocked"));
      return;
    }

    setLeavingGroup(true);

    try {
      await api.groups.leaveGroup({
        groupId: group.id,
        userId,
        locale,
      });
      setSettingsDialogOpen(false);
      toast.success(t("groups.toasts.left"));
      await queryClient.invalidateQueries({ queryKey: ["groups", slug] });
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
      router.push("/groups");
    } catch (error) {
      console.error("Could not leave group:", error);
      toast.error(t("groups.toasts.leaveFailed"));
    } finally {
      setLeavingGroup(false);
    }
  }

  async function createSticker() {
    if (
      !group ||
      !userId ||
      !canManageStickers ||
      !stickerName.trim() ||
      !stickerFile ||
      savingSticker
    ) {
      return;
    }

    setSavingSticker(true);

    try {
      await api.groups.createSticker({
        groupId: group.id,
        userId,
        name: stickerName,
        file: stickerFile,
      });
      setStickerName("");
      setStickerFile(null);
      await queryClient.invalidateQueries({ queryKey: ["groups", slug] });
      toast.success(t("groups.toasts.stickerCreated"));
    } catch (error) {
      console.error("Could not create group sticker:", error);
      toast.error(t("groups.toasts.stickerCreateFailed"));
    } finally {
      setSavingSticker(false);
    }
  }

  async function deleteSticker(sticker: StudyGroupSticker) {
    if (!group || !canManageStickers || deletingStickerId) return;

    setDeletingStickerId(sticker.id);

    try {
      await api.groups.deleteSticker({
        groupId: group.id,
        stickerId: sticker.id,
        storagePath: sticker.storage_path,
      });
      await queryClient.invalidateQueries({ queryKey: ["groups", slug] });
      toast.success(t("groups.toasts.stickerDeleted"));
    } catch (error) {
      console.error("Could not delete group sticker:", error);
      toast.error(t("groups.toasts.stickerDeleteFailed"));
    } finally {
      setDeletingStickerId(null);
    }
  }

  async function inviteMember(candidate: MentionCandidate) {
    if (!group || !userId || invitingId) return;

    setInvitingId(candidate.id);

    try {
      const status = await api.groups.inviteMember({
        groupId: group.id,
        inviterId: userId,
        inviteeId: candidate.id,
        locale,
      });

      toast.success(
        status === "active"
          ? t("groups.toasts.alreadyMember")
          : t("groups.toasts.invited")
      );
      await queryClient.invalidateQueries({ queryKey: ["groups", slug] });
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
    } catch (error) {
      console.error("Could not invite member:", error);
      toast.error(t("groups.toasts.inviteFailed"));
    } finally {
      setInvitingId(null);
    }
  }

  async function copyInviteLink(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t("groups.toasts.inviteLinkCopied"));
    } catch (error) {
      console.error("Could not copy invite link:", error);
    }
  }

  async function createInviteLink() {
    if (!group || !userId || creatingInviteLink) return;

    setCreatingInviteLink(true);

    try {
      const invite = await api.groups.createInviteLink({
        groupId: group.id,
        userId,
      });
      const url = `${window.location.origin}/invite/${invite.token}`;

      setInviteLink(url);
      await navigator.clipboard.writeText(url);
      toast.success(t("groups.toasts.inviteLinkCreated"));
    } catch (error) {
      console.error("Could not create invite link:", error);
      toast.error(t("groups.toasts.inviteLinkFailed"));
    } finally {
      setCreatingInviteLink(false);
    }
  }

  async function startLiveSession() {
    if (!group || !activeChannel || !userId || startingLive) return;

    setStartingLive(true);

    try {
      const room = await api.groups.startLiveSessionFromChannel({
        groupName: group.name,
        groupId: group.id,
        channelId: activeChannel.id,
        userId,
      });
      toast.success(t("groups.toasts.liveStarted"));
      await queryClient.invalidateQueries({
        queryKey: ["groups", slug, "messages", activeChannel.id],
      });
      window.open(`/live/${room.id}`, "_self");
    } catch (error) {
      console.error("Could not start live session:", error);
      toast.error(t("groups.toasts.liveFailed"));
    } finally {
      setStartingLive(false);
    }
  }

  if (workspaceQuery.isLoading) {
    return (
      <div className="grid h-full min-h-0 grid-cols-1 gap-0 overflow-hidden md:grid-cols-[220px_1fr_240px]">
        <Skeleton className="h-full rounded-none" />
        <Skeleton className="h-full rounded-none" />
        <Skeleton className="hidden h-full rounded-none md:block" />
      </div>
    );
  }

  if (!group) {
    return (
      <EmptyState
        className="py-20"
        title={t("groups.notFound.title")}
        description={t("groups.notFound.description")}
        action={
          <Button asChild>
            <Link href="/groups">{t("groups.actions.back")}</Link>
          </Button>
        }
      />
    );
  }

  const isPrivateBlocked = group.visibility === "private" && !activeMembership;

  if (!activeMembership) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center overflow-hidden p-6">
        <EmptyState
          className="w-full max-w-2xl rounded-2xl border p-10"
          icon={isPrivateBlocked ? <Lock className="size-8" /> : <Users className="size-8" />}
          title={group.name}
          description={
            membership?.status === "pending"
              ? t("groups.access.pending")
              : membership?.status === "invited"
                ? t("groups.access.invited")
              : group.description || t("groups.access.description")
          }
          action={
            !membership || membership.status === "invited" ? (
              <Button onClick={joinGroup}>
                {membership?.status === "invited"
                  ? t("groups.actions.acceptInvite")
                  : group.visibility === "private"
                  ? t("groups.actions.requestAccess")
                  : t("groups.actions.join")}
              </Button>
            ) : null
          }
        />
      </div>
    );
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-1 overflow-hidden md:grid-cols-[230px_1fr] xl:grid-cols-[240px_1fr_260px]">
      <aside className="flex min-h-0 flex-col border-b bg-zinc-50/80 md:border-b-0 md:border-r">
        <div className="border-b p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-lg font-semibold">{group.name}</p>
            {canManage && (
              <button
                onClick={() => setSettingsDialogOpen(true)}
                className="rounded-md p-1 text-muted-foreground hover:bg-zinc-200 hover:text-foreground"
                aria-label={t("groups.actions.settings")}
              >
                <Settings className="size-4" />
              </button>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {group.description || t("groups.workspace.noDescription")}
          </p>
        </div>

        <div className="flex items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <span>{t("groups.workspace.channels")}</span>
          {canManageChannels && (
            <button
              onClick={() => setChannelDialogOpen(true)}
              className="rounded-md p-1 hover:bg-zinc-200"
              aria-label={t("groups.actions.newChannel")}
            >
              <Plus className="size-4" />
            </button>
          )}
        </div>

        <ScrollArea className="min-h-0 flex-1 px-2 pb-3">
          <div className="space-y-1">
            {channels.map((channel) => {
              const active = channel.id === activeChannel?.id;
              const channelMentionCount =
                groupActivity.mentionCountsByChannel.get(channel.id) || 0;
              const hasChannelActivity =
                !channelMentionCount &&
                groupActivity.activityChannelIds.has(channel.id);

              return (
                <div
                  key={channel.id}
                  className={`group/channel flex w-full items-center rounded-xl text-sm transition ${
                    active
                      ? "bg-white text-black shadow-sm"
                      : "text-zinc-600 hover:bg-white/70 hover:text-black"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveChannelId(channel.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-3 py-2 text-left"
                  >
                    <Hash className="size-4 shrink-0" />
                    <span className="truncate">{channel.name}</span>
                    {channelMentionCount > 0 ? (
                      <span
                        className="ml-auto flex size-5 shrink-0 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white"
                        aria-label={`${channelMentionCount} ${t("groups.activity.ping")}`}
                      >
                        {channelMentionCount > 9 ? "9+" : channelMentionCount}
                      </span>
                    ) : hasChannelActivity ? (
                      <span
                        className="ml-auto size-2 shrink-0 rounded-full bg-zinc-400"
                        aria-label={t("groups.activity.newActivity")}
                      />
                    ) : null}
                  </button>

                  {canManageChannels && channels.length > 1 ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          type="button"
                          className="mr-1 rounded-lg p-1.5 text-muted-foreground opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover/channel:opacity-100"
                          aria-label={t("groups.actions.deleteChannel")}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {t("groups.dialog.deleteChannelTitle")}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("groups.dialog.deleteChannelDescription").replace(
                              "{name}",
                              channel.name
                            )}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>
                            {t("common.cancel")}
                          </AlertDialogCancel>
                          <AlertDialogAction
                            variant="destructive"
                            onClick={() => void deleteChannel(channel.id)}
                            disabled={deletingChannelId === channel.id}
                          >
                            {deletingChannelId === channel.id
                              ? t("groups.actions.deleting")
                              : t("groups.actions.deleteChannel")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : null}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </aside>

      <main className="flex min-h-0 flex-col">
        <header className="flex min-h-16 items-center justify-between gap-3 border-b px-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 truncate text-sm font-semibold">
              <Hash className="size-4" />
              {activeChannel?.name || t("groups.workspace.noChannel")}
            </p>
            <p className="text-xs text-muted-foreground">
              {members.length} {t("groups.workspace.members")}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canInvite && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setInviteDialogOpen(true)}
                className="gap-2"
              >
                <UserPlus className="size-4" />
                <span className="hidden sm:inline">
                  {t("groups.actions.invite")}
                </span>
              </Button>
            )}
            {activeMembership && !isGroupOwner ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={leavingGroup}
                    className="gap-2 border-red-100 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <LogOut className="size-4" />
                    <span className="hidden sm:inline">
                      {leavingGroup
                        ? t("groups.actions.leavingServer")
                        : t("groups.actions.leaveServer")}
                    </span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t("groups.dialog.leaveServerConfirmTitle")}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("groups.dialog.leaveServerConfirmDescription")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => void leaveGroup()}
                      disabled={leavingGroup}
                      className="bg-red-600 text-white hover:bg-red-700"
                    >
                      {leavingGroup
                        ? t("groups.actions.leavingServer")
                        : t("groups.actions.leaveServer")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              onClick={startLiveSession}
              disabled={!activeChannel || startingLive}
              className="gap-2"
            >
              <Radio className="size-4" />
              <span className="hidden sm:inline">{t("groups.actions.startLive")}</span>
            </Button>
          </div>
        </header>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-4 p-4">
            {messagesQuery.isLoading ? (
              <>
                <Skeleton className="h-14 w-2/3" />
                <Skeleton className="ml-auto h-14 w-1/2" />
              </>
            ) : messagesQuery.data?.length ? (
              <MessageGroup className="gap-3">
                {messagesQuery.data.map((item) => {
                  const profile = api.groups.getMessageProfile(item);
                  const isMine = item.user_id === userId;
                  const username = profile?.username || "user";
                  const profileHref = profile?.username
                    ? `/u/${profile.username}`
                    : null;
                  const isEditing = editingMessageId === item.id;
                  const isStickerMessage = item.kind === "sticker";
                  const stickerData = isStickerMessage
                    ? getStickerMessageData(item)
                    : null;
                  const canEditMessage = isMine && item.kind === "message";
                  const canDeleteMessage =
                    item.kind !== "system" && (isMine || canManage);
                  const reactionGroups = buildReactionGroups(
                    item.reactions,
                    userId
                  );
                  const edited =
                    item.metadata && item.metadata.edited === true;
                  const time = item.created_at
                    ? new Date(item.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "";

                  if (item.kind === "system") {
                    return (
                      <Marker
                        key={item.id}
                        variant="separator"
                        className="py-1 text-xs"
                      >
                        <MarkerIcon>
                          <Sparkles className="size-3.5" />
                        </MarkerIcon>
                        <MarkerContent>
                          <span>
                            {renderMessageContent(
                              item.content,
                              mentionProfilesByUsername,
                              stickersByInlineToken
                            )}
                          </span>
                          {time ? (
                            <span className="ml-2 text-[10px] text-muted-foreground/70">
                              {time}
                            </span>
                          ) : null}
                        </MarkerContent>
                      </Marker>
                    );
                  }

                  return (
                    <Message
                      key={item.id}
                      align={isMine ? "end" : "start"}
                    >
                      <MessageAvatar>
                        {profileHref ? (
                          <Link href={profileHref} aria-label={username}>
                            <UserAvatar
                              avatarUrl={profile?.avatar_url}
                              username={username}
                              equippedRewards={profile?.equipped_rewards}
                              className="size-8 transition hover:ring-2 hover:ring-zinc-300"
                            />
                          </Link>
                        ) : (
                          <UserAvatar
                            avatarUrl={profile?.avatar_url}
                            username={username}
                            equippedRewards={profile?.equipped_rewards}
                            className="size-8"
                          />
                        )}
                      </MessageAvatar>
                      <MessageContent className="max-w-[min(34rem,82%)]">
                        <MessageHeader className={isMine ? "justify-end" : ""}>
                          {profileHref ? (
                            <Link
                              href={profileHref}
                              className="truncate hover:text-foreground hover:underline"
                            >
                              {username}
                            </Link>
                          ) : (
                            <span className="truncate">{username}</span>
                          )}
                        </MessageHeader>
                        <div
                          className={`group/reaction relative flex w-fit max-w-full ${
                            isMine ? "justify-end" : "justify-start"
                          }`}
                        >
                          {isEditing ? (
                            <div className="w-[min(30rem,78vw)] rounded-2xl border bg-white p-2 shadow-sm">
                              <Textarea
                                value={editingMessageText}
                                onChange={(event) =>
                                  setEditingMessageText(event.target.value)
                                }
                                onKeyDown={(event) => {
                                  if (event.key === "Escape") {
                                    event.preventDefault();
                                    cancelEditingMessage();
                                  }

                                  if (
                                    event.key === "Enter" &&
                                    (event.metaKey || event.ctrlKey)
                                  ) {
                                    event.preventDefault();
                                    void saveEditedMessage(item);
                                  }
                                }}
                                className="min-h-20 resize-none rounded-xl border-zinc-200 text-sm"
                                autoFocus
                              />
                              <div className="mt-2 flex justify-end gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={cancelEditingMessage}
                                  className="gap-1.5"
                                >
                                  <X className="size-3.5" />
                                  {t("common.cancel")}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => void saveEditedMessage(item)}
                                  disabled={
                                    !editingMessageText.trim() ||
                                    savingMessageId === item.id
                                  }
                                  className="gap-1.5"
                                >
                                  <Check className="size-3.5" />
                                  {savingMessageId === item.id
                                    ? t("groups.actions.saving")
                                    : t("groups.actions.saveEdit")}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Bubble
                              align={isMine ? "end" : "start"}
                              variant={isMine ? "default" : "muted"}
                              className="max-w-full"
                            >
                              <BubbleContent
                                className={`min-w-[2.25rem] rounded-2xl border-transparent ${
                                  isStickerMessage
                                    ? "bg-transparent p-0 shadow-none"
                                    : isMine
                                    ? "bg-zinc-950 text-white"
                                    : "bg-zinc-100 text-zinc-950"
                                }`}
                              >
                                {isStickerMessage && stickerData?.stickerUrl ? (
                                  <img
                                    src={stickerData.stickerUrl}
                                    alt={stickerData.stickerName}
                                    className="max-h-16 max-w-16 rounded-xl object-contain drop-shadow-sm"
                                  />
                                ) : (
                                  <div className="inline-flex flex-wrap items-center whitespace-pre-wrap break-words align-middle">
                                    {renderMessageContent(
                                      item.content,
                                      mentionProfilesByUsername,
                                      stickersByInlineToken
                                    )}
                                  </div>
                                )}
                              </BubbleContent>
                              {reactionGroups.length ? (
                                <BubbleReactions
                                  align={isMine ? "end" : "start"}
                                  side="bottom"
                                  className="bg-white text-xs shadow-sm ring-white"
                                >
                                  {reactionGroups.map((reaction) => (
                                    <Popover key={reaction.emoji}>
                                      <PopoverTrigger asChild>
                                        <button
                                          type="button"
                                          className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-1.5 py-0.5 leading-none transition hover:bg-zinc-200 ${
                                            reaction.reactedByMe
                                              ? "bg-emerald-50 text-emerald-700"
                                              : ""
                                          }`}
                                          aria-label={`${reaction.emoji} ${reaction.count}`}
                                        >
                                          {reaction.count > 1 && isMine ? (
                                            <span className="text-[11px] font-semibold tabular-nums">
                                              {reaction.count}
                                            </span>
                                          ) : null}
                                          <span>{reaction.emoji}</span>
                                          {reaction.count > 1 && !isMine ? (
                                            <span className="text-[11px] font-semibold tabular-nums">
                                              {reaction.count}
                                            </span>
                                          ) : null}
                                        </button>
                                      </PopoverTrigger>
                                      <PopoverContent
                                        align={isMine ? "end" : "start"}
                                        className="w-72 gap-3 rounded-2xl border-zinc-200 bg-white p-3 shadow-xl"
                                      >
                                        <div className="flex items-center justify-between gap-3">
                                          <div className="text-sm font-semibold text-zinc-950">
                                            {reaction.emoji}{" "}
                                            {t("groups.workspace.reactionsTitle").replace(
                                              "{count}",
                                              String(reaction.count)
                                            )}
                                          </div>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={() =>
                                              void toggleReaction(
                                                item,
                                                reaction.emoji
                                              )
                                            }
                                            className="h-7 px-2 text-xs"
                                          >
                                            {reaction.reactedByMe
                                              ? t("groups.actions.removeReaction")
                                              : t("groups.actions.react")}
                                          </Button>
                                        </div>
                                        <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                          {reaction.users.map((reactionUser) => {
                                            const userNode = (
                                              <>
                                                <UserAvatar
                                                  avatarUrl={
                                                    reactionUser.avatarUrl
                                                  }
                                                  username={
                                                    reactionUser.username
                                                  }
                                                  className="size-10"
                                                />
                                                <span className="max-w-20 truncate text-xs font-medium text-zinc-700">
                                                  {reactionUser.username}
                                                </span>
                                              </>
                                            );

                                            return reactionUser.username !==
                                              "user" ? (
                                              <Link
                                                key={`${reaction.emoji}-${reactionUser.id}`}
                                                href={`/u/${reactionUser.username}`}
                                                className="flex min-w-16 flex-col items-center gap-1 rounded-xl px-2 py-1.5 transition hover:bg-zinc-100"
                                              >
                                                {userNode}
                                              </Link>
                                            ) : (
                                              <div
                                                key={`${reaction.emoji}-${reactionUser.id}`}
                                                className="flex min-w-16 flex-col items-center gap-1 rounded-xl px-2 py-1.5"
                                              >
                                                {userNode}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                  ))}
                                </BubbleReactions>
                              ) : null}
                            </Bubble>
                          )}
                          <div
                            className={`absolute -top-8 z-20 items-center gap-1 rounded-full border bg-white/95 p-1 shadow-lg ${
                              emojiPickerMessageId === item.id
                                ? "flex"
                                : "hidden group-hover/reaction:flex"
                            } ${
                              isMine ? "right-2" : "left-2"
                            }`}
                          >
                            <Popover
                              open={emojiPickerMessageId === item.id}
                              onOpenChange={(open) => {
                                setEmojiSearch("");
                                setEmojiPickerMessageId(open ? item.id : null);
                              }}
                            >
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className="rounded-full px-1.5 py-0.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950"
                                  aria-label={t("groups.actions.moreReactions")}
                                >
                                  <SmilePlus className="size-3.5" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent
                                align={isMine ? "end" : "start"}
                                side="top"
                                sideOffset={10}
                                className="w-72 gap-2 rounded-2xl border-zinc-200 bg-white p-2 shadow-xl"
                              >
                                {emojiPickerMessageId === item.id ? (
                                  <>
                                    <div className="relative">
                                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                                      <Input
                                        value={emojiSearch}
                                        onChange={(event) =>
                                          setEmojiSearch(event.target.value)
                                        }
                                        placeholder={t(
                                          "groups.workspace.searchEmoji"
                                        )}
                                        className="h-9 rounded-xl pl-9 text-sm"
                                        autoFocus
                                      />
                                    </div>
                                    <div className="max-h-56 overflow-y-auto pr-1 [scrollbar-width:thin]">
                                      {filteredEmojiReactions.length ? (
                                        <div className="grid grid-cols-7 gap-1">
                                          {filteredEmojiReactions.map((emojiItem) => (
                                            <button
                                              key={`${emojiItem.emoji}-${emojiItem.label}`}
                                              type="button"
                                              onClick={() => {
                                                closeEmojiPicker();
                                                void toggleReaction(
                                                  item,
                                                  emojiItem.emoji
                                                );
                                              }}
                                              className="flex size-8 items-center justify-center rounded-lg text-xl transition hover:bg-zinc-100"
                                              title={emojiItem.label}
                                              aria-label={`${t(
                                                "groups.actions.react"
                                              )} ${emojiItem.emoji}`}
                                            >
                                              {emojiItem.emoji}
                                            </button>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="px-2 py-8 text-center text-xs text-muted-foreground">
                                          {t("groups.workspace.noEmojiResults")}
                                        </div>
                                      )}
                                    </div>
                                  </>
                                ) : null}
                              </PopoverContent>
                            </Popover>
                            {QUICK_REACTIONS.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => {
                                  closeEmojiPicker();
                                  void toggleReaction(item, emoji);
                                }}
                                className="rounded-full px-1.5 py-0.5 text-sm transition hover:bg-zinc-100"
                                aria-label={`${t("groups.actions.react")} ${emoji}`}
                              >
                                {emoji}
                              </button>
                            ))}
                            {canEditMessage ? (
                              <button
                                type="button"
                                onClick={() => {
                                  closeEmojiPicker();
                                  startEditingMessage(item);
                                }}
                                className="rounded-full px-1.5 py-0.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950"
                                aria-label={t("groups.actions.editMessage")}
                              >
                                <Pencil className="size-3.5" />
                              </button>
                            ) : null}
                            {canDeleteMessage ? (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <button
                                    type="button"
                                    className="rounded-full px-1.5 py-0.5 text-red-500 transition hover:bg-red-50"
                                    aria-label={t("groups.actions.deleteMessage")}
                                  >
                                    <Trash2 className="size-3.5" />
                                  </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      {t("groups.dialog.deleteMessageTitle")}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {t("groups.dialog.deleteMessageDescription")}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      {t("common.cancel")}
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      variant="destructive"
                                      onClick={() => void deleteMessage(item)}
                                      disabled={deletingMessageId === item.id}
                                    >
                                      {deletingMessageId === item.id
                                        ? t("groups.actions.deleting")
                                        : t("groups.actions.deleteMessage")}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            ) : null}
                          </div>
                        </div>
                        {time ? (
                          <MessageFooter
                            className={reactionGroups.length ? "mt-2" : ""}
                          >
                            {time}
                            {edited ? (
                              <span className="ml-1">
                                {t("groups.workspace.edited")}
                              </span>
                            ) : null}
                          </MessageFooter>
                        ) : null}
                      </MessageContent>
                    </Message>
                  );
                })}
                {visibleTypingUsers.length ? (
                  <Message align="start">
                    <MessageAvatar>
                      <UserAvatar
                        avatarUrl={visibleTypingUsers[0]?.avatarUrl}
                        username={visibleTypingUsers[0]?.username}
                        className="size-8"
                      />
                    </MessageAvatar>
                    <MessageContent className="max-w-[min(22rem,78%)]">
                      <MessageHeader>
                        {visibleTypingUsers.length === 1
                          ? visibleTypingUsers[0].username
                          : t("groups.workspace.typingMany")}
                      </MessageHeader>
                      <Bubble variant="muted">
                        <BubbleContent className="flex items-center gap-1 rounded-2xl border-transparent bg-zinc-100 px-3 py-2 text-zinc-500">
                          <span className="size-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.2s]" />
                          <span className="size-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.1s]" />
                          <span className="size-1.5 animate-bounce rounded-full bg-zinc-500" />
                        </BubbleContent>
                      </Bubble>
                      <MessageFooter>
                        {visibleTypingUsers.length === 1
                          ? t("groups.workspace.typingOne").replace(
                              "{name}",
                              visibleTypingUsers[0].username
                            )
                          : t("groups.workspace.typingMany")}
                      </MessageFooter>
                    </MessageContent>
                  </Message>
                ) : null}
              </MessageGroup>
            ) : (
              <EmptyState
                className="py-20"
                icon={<MessageSquare className="size-8" />}
                title={t("groups.workspace.emptyChannel")}
                description={t("groups.workspace.emptyChannelHint")}
              />
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        <div className="border-t p-3">
          <div className="relative flex items-end gap-2">
            {mentionOpen ? (
              <div className="absolute bottom-full left-0 z-30 mb-2 w-72 overflow-hidden rounded-2xl border bg-white shadow-xl">
                <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">
                  {t("groups.workspace.mentions")}
                </div>
                <div className="max-h-64 overflow-y-auto p-1">
                  {mentionCandidates.length ? (
                    mentionCandidates.map((candidate, index) => (
                      <button
                        key={candidate.id}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => insertMention(candidate)}
                        className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm transition ${
                          index === mentionActiveIndex
                            ? "bg-zinc-100 text-zinc-950"
                            : "hover:bg-zinc-50"
                        }`}
                      >
                        <UserAvatar
                          avatarUrl={candidate.avatar_url}
                          username={candidate.username}
                          equippedRewards={candidate.equipped_rewards}
                          className="size-8"
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {candidate.username}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            @{candidate.username}
                          </span>
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-4 text-sm text-muted-foreground">
                      {t("groups.workspace.noMentionResults")}
                    </p>
                  )}
                </div>
              </div>
            ) : null}
            <Textarea
              ref={messageInputRef}
              value={message}
              onChange={(event) =>
                handleMessageChange(
                  event.target.value,
                  event.target.selectionStart
                )
              }
              onClick={(event) =>
                updateMentionSearch(message, event.currentTarget.selectionStart)
              }
              onKeyUp={(event) =>
                updateMentionSearch(message, event.currentTarget.selectionStart)
              }
              onKeyDown={handleMessageKeyDown}
              placeholder={t("groups.workspace.messagePlaceholder")}
              className="max-h-32 min-h-10 resize-none rounded-xl"
            />
            <Popover
              open={composerPickerOpen}
              onOpenChange={(open) => {
                setComposerPickerOpen(open);
                if (!open) {
                  setComposerEmojiSearch("");
                  setStickerSearch("");
                }
              }}
            >
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="shrink-0 rounded-xl"
                        aria-label={t("groups.actions.openStickerPicker")}
                      >
                        <SmilePlus className="size-4" />
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {t("groups.actions.openStickerPicker")}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <PopoverContent
                align="end"
                side="top"
                sideOffset={10}
                className="w-80 rounded-2xl p-3"
              >
                <Tabs
                  value={composerPickerTab}
                  onValueChange={setComposerPickerTab}
                >
                  <TabsList className="grid w-full grid-cols-2 rounded-xl">
                    <TabsTrigger value="emoji" className="rounded-lg">
                      {t("groups.stickers.emojiTab")}
                    </TabsTrigger>
                    <TabsTrigger value="stickers" className="rounded-lg">
                      {t("groups.stickers.stickersTab")}
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="emoji" className="mt-3 space-y-2">
                    <Input
                      value={composerEmojiSearch}
                      onChange={(event) =>
                        setComposerEmojiSearch(event.target.value)
                      }
                      placeholder={t("groups.workspace.searchEmoji")}
                      className="h-9 rounded-xl"
                    />
                    <div className="grid max-h-64 grid-cols-6 gap-1 overflow-y-auto pr-1">
                      {filteredComposerEmojis.length ? (
                        filteredComposerEmojis.map((item) => (
                          <button
                            key={`${item.emoji}-${item.label}`}
                            type="button"
                            onClick={() => insertComposerEmoji(item.emoji)}
                            className="flex size-10 items-center justify-center rounded-xl text-xl transition hover:bg-zinc-100"
                            aria-label={item.label}
                          >
                            {item.emoji}
                          </button>
                        ))
                      ) : (
                        <p className="col-span-6 px-2 py-6 text-center text-sm text-muted-foreground">
                          {t("groups.workspace.noEmojiResults")}
                        </p>
                      )}
                    </div>
                  </TabsContent>
                  <TabsContent value="stickers" className="mt-3 space-y-2">
                    <Input
                      value={stickerSearch}
                      onChange={(event) => setStickerSearch(event.target.value)}
                      placeholder={t("groups.stickers.search")}
                      className="h-9 rounded-xl"
                    />
                    <div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto pr-1">
                      {filteredStickers.length ? (
                        filteredStickers.map((sticker) => (
                          <button
                            key={sticker.id}
                            type="button"
                            onClick={() => insertComposerSticker(sticker)}
                            className="group flex min-h-24 flex-col items-center justify-center rounded-2xl border border-zinc-200/80 bg-gradient-to-b from-white via-white to-zinc-50/80 p-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-white/80 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_14px_32px_rgba(16,185,129,0.12)] disabled:translate-y-0 disabled:opacity-50"
                          >
                            <img
                              src={sticker.image_url}
                              alt={sticker.name}
                              className="h-14 w-14 object-contain transition group-hover:scale-105"
                            />
                            <span className="mt-1 max-w-full truncate text-xs font-medium">
                              {sticker.name}
                            </span>
                          </button>
                        ))
                      ) : (
                        <p className="col-span-3 px-2 py-8 text-center text-sm text-muted-foreground">
                          {t("groups.stickers.emptyPicker")}
                        </p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </PopoverContent>
            </Popover>
            <Button
              size="icon"
              onClick={sendMessage}
              disabled={!message.trim() || sending}
            >
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      </main>

      <aside className="hidden min-h-0 flex-col border-l bg-zinc-50/80 xl:flex">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold">{t("groups.workspace.members")}</p>
          <p className="text-xs text-muted-foreground">
            {members.length} {t("groups.workspace.onlineLearning")}
          </p>
        </div>
        <ScrollArea className="min-h-0 flex-1 p-3">
          <div className="space-y-2">
            {members.map((member) => {
              const profile = api.groups.getMemberProfile(member);

              return (
                <StudyGroupMemberPreview
                  key={member.user_id}
                  member={member}
                  profile={profile}
                  t={t}
                />
              );
            })}
          </div>
        </ScrollArea>
      </aside>

      <Dialog open={channelDialogOpen} onOpenChange={setChannelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("groups.dialog.channelTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              value={newChannelName}
              onChange={(event) => setNewChannelName(event.target.value)}
              placeholder={t("groups.dialog.channelName")}
            />
            <div className="rounded-xl border bg-zinc-50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">
                {t("groups.dialog.channelSlugPreview")}
              </span>
              <span className="ml-2 font-mono text-zinc-950">
                #{channelSlugPreview}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={createChannel} disabled={!newChannelName.trim()}>
              {t("groups.actions.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("groups.dialog.inviteTitle")}</DialogTitle>
          </DialogHeader>
          <div className="rounded-xl border bg-zinc-50/70 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <LinkIcon className="size-4" />
                  {t("groups.dialog.inviteLinkTitle")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("groups.dialog.inviteLinkDescription")}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={createInviteLink}
                disabled={creatingInviteLink}
                className="shrink-0"
              >
                {creatingInviteLink
                  ? t("groups.actions.creatingInviteLink")
                  : t("groups.actions.createInviteLink")}
              </Button>
            </div>
            {inviteLink ? (
              <div className="mt-3 flex gap-2">
                <Input value={inviteLink} readOnly className="text-xs" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => copyInviteLink(inviteLink)}
                  aria-label={t("groups.actions.copyInviteLink")}
                >
                  <Copy className="size-4" />
                </Button>
              </div>
            ) : null}
          </div>
          <Input
            value={inviteQuery}
            onChange={(event) => setInviteQuery(event.target.value)}
            placeholder={t("groups.dialog.inviteSearch")}
          />
          <ScrollArea className="h-72 rounded-xl border">
            <div className="space-y-1 p-2">
              {inviteCandidatesQuery.isLoading ? (
                <>
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </>
              ) : inviteCandidates.length ? (
                inviteCandidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 hover:bg-zinc-50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <UserAvatar
                        avatarUrl={candidate.avatar_url}
                        username={candidate.username}
                        equippedRewards={candidate.equipped_rewards}
                        className="size-8"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {candidate.username}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {candidate.isFollowing
                            ? t("groups.dialog.following")
                            : t("groups.dialog.scripticxUser")}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => inviteMember(candidate)}
                      disabled={invitingId === candidate.id}
                    >
                      {invitingId === candidate.id
                        ? t("groups.actions.inviting")
                        : t("groups.actions.invite")}
                    </Button>
                  </div>
                ))
              ) : (
                <EmptyState
                  className="py-10"
                  icon={<Users className="size-7" />}
                  title={t("groups.empty.inviteTitle")}
                  description={t("groups.empty.inviteDescription")}
                />
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog
        open={settingsDialogOpen}
        onOpenChange={(open) => {
          if (open) setSettingsTab("general");
          setSettingsDialogOpen(open);
        }}
      >
        {settingsDialogOpen ? (
          <DialogContent className="max-h-[90vh] w-[min(1120px,calc(100vw-2rem))] !max-w-[min(1120px,calc(100vw-2rem))] overflow-hidden p-0 sm:!max-w-[min(1120px,calc(100vw-2rem))]">
            <DeferredRender
              fallback={
                <div className="space-y-5 px-5 py-5 sm:px-7">
                  <DialogHeader>
                    <DialogTitle className="text-2xl">
                      {t("groups.dialog.settingsTitle")}
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground">
                      {t("groups.dialog.settingsSubtitle")}
                    </p>
                  </DialogHeader>
                  <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                    <Skeleton className="h-24 rounded-none sm:h-32" />
                    <div className="space-y-3 p-5">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-64 max-w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </div>
                </div>
              }
              render={() => (
                <>
          <div className="border-b bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_32%),linear-gradient(180deg,#ffffff,#fafafa)] px-5 py-5 sm:px-7">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {t("groups.dialog.settingsTitle")}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {t("groups.dialog.settingsSubtitle")}
              </p>
            </DialogHeader>
            <div className="mt-5 overflow-hidden rounded-2xl border bg-white/90 shadow-sm">
              <div
                className="h-24 border-b bg-[linear-gradient(135deg,#f8fafc_0%,#ecfdf5_48%,#eef2ff_100%)] bg-cover bg-center sm:h-32"
                style={
                  settingsBannerPreview
                    ? { backgroundImage: `url("${settingsBannerPreview}")` }
                    : undefined
                }
              />
              <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex min-w-0 items-end gap-4">
                  <Avatar className="-mt-8 size-[72px] border-4 border-background shadow-md sm:-mt-10 sm:size-[88px]">
                    <AvatarImage
                      src={settingsAvatarPreview || undefined}
                      alt={settingsName || group?.name || "Server"}
                    />
                    <AvatarFallback className="bg-zinc-950 text-2xl font-semibold text-white">
                      {groupInitial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 pt-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">
                      {t("groups.dialog.serverPreview")}
                    </p>
                    <h3 className="mt-1 truncate text-xl font-bold text-zinc-950">
                      {settingsName || group?.name || t("groups.dialog.name")}
                    </h3>
                    <p className="mt-1 line-clamp-2 max-w-2xl text-sm text-muted-foreground">
                      {settingsDescription ||
                        group?.description ||
                        t("groups.dialog.description")}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pb-1 sm:justify-end">
                  <span className="inline-flex items-center gap-1.5 rounded-full border bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700">
                    <Users className="size-3.5" />
                    {t("groups.dialog.membersCount").replace(
                      "{count}",
                      String(members.length)
                    )}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700">
                    <Hash className="size-3.5" />
                    {t("groups.dialog.channelsCount").replace(
                      "{count}",
                      String(channels.length)
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Tabs
            value={settingsTab}
            onValueChange={setSettingsTab}
            className="min-h-0"
          >
            <div className="px-5 py-4 sm:px-7">
              <TabsList className="mx-auto grid h-11 w-full max-w-2xl grid-cols-3 overflow-hidden rounded-2xl bg-zinc-100 p-1">
                <TabsTrigger
                  value="general"
                  className="flex h-full min-w-0 items-center justify-center rounded-xl border-0 px-3 py-0 text-center text-sm leading-none shadow-none outline-none ring-0 focus-visible:border-transparent focus-visible:ring-0 focus-visible:ring-offset-0 data-active:bg-white data-active:shadow-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  <span className="block max-w-full truncate">
                    {t("groups.dialog.settingsGeneralTab")}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="stickers"
                  className="flex h-full min-w-0 items-center justify-center rounded-xl border-0 px-3 py-0 text-center text-sm leading-none shadow-none outline-none ring-0 focus-visible:border-transparent focus-visible:ring-0 focus-visible:ring-offset-0 data-active:bg-white data-active:shadow-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  <span className="block max-w-full truncate">
                    {t("groups.dialog.settingsStickersTab")}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="permissions"
                  className="flex h-full min-w-0 items-center justify-center rounded-xl border-0 px-3 py-0 text-center text-sm leading-none shadow-none outline-none ring-0 focus-visible:border-transparent focus-visible:ring-0 focus-visible:ring-offset-0 data-active:bg-white data-active:shadow-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  <span className="block max-w-full truncate">
                    {t("groups.dialog.settingsPermissionsTab")}
                  </span>
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="max-h-[56vh]">
              <div className="p-5 sm:p-7">
                {settingsTab === "general" ? (
                <TabsContent value="general" className="mt-0 space-y-4">
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="space-y-3">
                      <Input
                        value={settingsName}
                        onChange={(event) => setSettingsName(event.target.value)}
                        placeholder={t("groups.dialog.name")}
                      />
                      <Textarea
                        value={settingsDescription}
                        onChange={(event) =>
                          setSettingsDescription(event.target.value)
                        }
                        placeholder={t("groups.dialog.description")}
                        className="min-h-28 resize-none"
                      />
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="rounded-2xl border bg-white p-4 text-sm shadow-sm transition hover:border-emerald-200">
                          <div className="flex items-start gap-3">
                            <ImagePlus className="mt-0.5 size-4 text-emerald-600" />
                            <div>
                              <p className="font-semibold">
                                {t("groups.dialog.avatarImage")}
                              </p>
                              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                {t("groups.dialog.avatarImageDescription")}
                              </p>
                            </div>
                          </div>
                          <Input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif"
                            className="mt-3"
                            onChange={(event) =>
                              setSettingsAvatarFile(
                                event.target.files?.[0] || null
                              )
                            }
                          />
                        </label>
                        <label className="rounded-2xl border bg-white p-4 text-sm shadow-sm transition hover:border-emerald-200">
                          <div className="flex items-start gap-3">
                            <ImagePlus className="mt-0.5 size-4 text-emerald-600" />
                            <div>
                              <p className="font-semibold">
                                {t("groups.dialog.bannerImage")}
                              </p>
                              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                {t("groups.dialog.bannerImageDescription")}
                              </p>
                            </div>
                          </div>
                          <Input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif"
                            className="mt-3"
                            onChange={(event) =>
                              setSettingsBannerFile(
                                event.target.files?.[0] || null
                              )
                            }
                          />
                        </label>
                      </div>
                    </div>
                    <div className="rounded-2xl border bg-zinc-50 p-4">
                      <p className="text-sm font-semibold">
                        {t("groups.dialog.visibility")}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("groups.dialog.serverOverview")}
                      </p>
                      <Select
                        value={settingsVisibility}
                        onValueChange={(value) =>
                          setSettingsVisibility(value as "public" | "private")
                        }
                      >
                        <SelectTrigger className="mt-4 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">
                            {t("groups.public")}
                          </SelectItem>
                          <SelectItem value="private">
                            {t("groups.private")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>
                ) : null}

                {settingsTab === "stickers" ? (
                <TabsContent value="stickers" className="mt-0">
                  {canManageStickers ? (
                    <div className="rounded-2xl border bg-zinc-50/70 p-4">
                      <div className="flex items-start gap-2">
                        <ImagePlus className="mt-0.5 size-4 text-zinc-500" />
                        <div>
                          <p className="text-sm font-semibold">
                            {t("groups.stickers.manageTitle")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t("groups.stickers.manageDescription")}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1.2fr_auto]">
                        <Input
                          value={stickerName}
                          onChange={(event) =>
                            setStickerName(event.target.value)
                          }
                          placeholder={t("groups.stickers.namePlaceholder")}
                          maxLength={32}
                        />
                        <Input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          onChange={(event) =>
                            setStickerFile(event.target.files?.[0] || null)
                          }
                        />
                        <Button
                          type="button"
                          onClick={() => void createSticker()}
                          disabled={
                            !stickerName.trim() || !stickerFile || savingSticker
                          }
                          className="gap-2"
                        >
                          <ImagePlus className="size-4" />
                          {savingSticker
                            ? t("groups.actions.saving")
                            : t("groups.stickers.add")}
                        </Button>
                      </div>
                      <ScrollArea className="mt-3 max-h-56">
                        <div className="grid grid-cols-2 gap-2 pr-2 sm:grid-cols-3">
                          {stickers.length ? (
                            stickers.map((sticker) => (
                              <div
                                key={sticker.id}
                                className="group relative rounded-2xl border border-zinc-200/80 bg-gradient-to-b from-white via-white to-zinc-50/80 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-white/80 transition hover:border-emerald-200 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_14px_32px_rgba(16,185,129,0.12)]"
                              >
                                <div className="flex min-h-20 items-center justify-center rounded-xl bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.08),transparent_55%),linear-gradient(180deg,#ffffff,#fafafa)]">
                                  <img
                                    src={sticker.image_url}
                                    alt={sticker.name}
                                    className="h-16 w-16 object-contain"
                                  />
                                </div>
                                <p className="mt-2 truncate text-xs font-medium">
                                  {sticker.name}
                                </p>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <button
                                      type="button"
                                      className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-red-500 opacity-0 shadow-sm transition hover:bg-red-50 group-hover:opacity-100"
                                      aria-label={t("groups.stickers.delete")}
                                    >
                                      <Trash2 className="size-3.5" />
                                    </button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        {t("groups.stickers.deleteTitle")}
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        {t(
                                          "groups.stickers.deleteDescription"
                                        ).replace("{name}", sticker.name)}
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        {t("common.cancel")}
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        variant="destructive"
                                        onClick={() => void deleteSticker(sticker)}
                                        disabled={
                                          deletingStickerId === sticker.id
                                        }
                                      >
                                        {deletingStickerId === sticker.id
                                          ? t("groups.actions.deleting")
                                          : t("groups.stickers.delete")}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            ))
                          ) : (
                            <p className="col-span-full rounded-xl border border-dashed bg-white px-3 py-6 text-center text-sm text-muted-foreground">
                              {t("groups.stickers.emptySettings")}
                            </p>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  ) : (
                    <EmptyState
                      className="py-10"
                      icon={<Lock className="size-7" />}
                      title={t("groups.dialog.customStickers")}
                      description={t("groups.dialog.permissionsDescription")}
                    />
                  )}
                </TabsContent>
                ) : null}

                {settingsTab === "permissions" ? (
                <TabsContent value="permissions" className="mt-0 space-y-4">
                  <div className="rounded-2xl border bg-zinc-50 p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold">
                      {t("groups.dialog.permissionsTitle")}
                    </p>
                        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                      {t("groups.dialog.permissionsDescription")}
                    </p>
                      </div>
                      <span className="inline-flex w-fit items-center gap-1.5 rounded-full border bg-white px-3 py-1 text-xs font-medium text-zinc-700">
                        <Lock className="size-3.5" />
                        {isGroupOwner
                          ? t("groups.dialog.ownerControls")
                          : t("groups.dialog.ownerOnlyPermissions")}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-red-100 bg-red-50/60 p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-red-950">
                          {isGroupOwner
                            ? t("groups.dialog.ownerLeaveTitle")
                            : t("groups.dialog.leaveServerTitle")}
                        </p>
                        <p className="mt-1 max-w-2xl text-sm text-red-900/70">
                          {isGroupOwner
                            ? t("groups.dialog.ownerLeaveDescription")
                            : t("groups.dialog.leaveServerDescription")}
                        </p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={isGroupOwner || leavingGroup}
                            className="w-fit"
                          >
                            <LogOut className="size-4" />
                            {leavingGroup
                              ? t("groups.actions.leavingServer")
                              : t("groups.actions.leaveServer")}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {t("groups.dialog.leaveServerConfirmTitle")}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("groups.dialog.leaveServerConfirmDescription")}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>
                              {t("common.cancel")}
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => void leaveGroup()}
                              disabled={leavingGroup}
                              className="bg-red-600 text-white hover:bg-red-700"
                            >
                              {leavingGroup
                                ? t("groups.actions.leavingServer")
                                : t("groups.actions.leaveServer")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {activeMembers.map((member) => {
                      const profile = api.groups.getMemberProfile(member);
                      const username = getProfileDisplayName(
                        profile,
                        t("user.user")
                      );
                      const isOwnerMember = member.role === "owner";
                      const isAdminMember = member.role === "admin";
                      const isUpdating = updatingMemberId === member.user_id;
                      const isTransferring =
                        transferringOwnerId === member.user_id;

                      return (
                        <div
                          key={member.user_id}
                          className="flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <UserAvatar
                              avatarUrl={profile?.avatar_url}
                              username={username}
                              equippedRewards={profile?.equipped_rewards}
                              className="size-11"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-zinc-950">
                                {username}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {getGroupRoleLabel(member.role, t)}
                              </p>
                            </div>
                          </div>

                          {isOwnerMember ? (
                            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-zinc-950 px-3 py-1 text-xs font-semibold text-white">
                              <Award className="size-3.5" />
                              {t("groups.roles.owner")}
                            </span>
                          ) : isGroupOwner ? (
                            <div className="flex flex-wrap gap-2 sm:justify-end">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isUpdating || isTransferring}
                                onClick={() =>
                                  void updateMemberRole(
                                    member,
                                    isAdminMember ? "member" : "admin"
                                  )
                                }
                              >
                                {isUpdating
                                  ? t("groups.actions.saving")
                                  : isAdminMember
                                    ? t("groups.actions.makeMember")
                                    : t("groups.actions.makeAdmin")}
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={isUpdating || isTransferring}
                                  >
                                    {t("groups.actions.transferOwnership")}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      {t(
                                        "groups.dialog.transferOwnershipTitle"
                                      )}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {t(
                                        "groups.dialog.transferOwnershipDescription"
                                      ).replace("{name}", username)}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      {t("common.cancel")}
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() =>
                                        void transferOwnership(member)
                                      }
                                      disabled={isTransferring}
                                    >
                                      {isTransferring
                                        ? t("groups.actions.transferring")
                                        : t("groups.actions.transferOwnership")}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          ) : (
                            <span className="inline-flex w-fit rounded-full border bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600">
                              {getGroupRoleLabel(member.role, t)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
                ) : null}
              </div>
            </ScrollArea>
          </Tabs>

          <DialogFooter className="border-t bg-zinc-50 px-5 pb-6 pt-4 sm:px-7 sm:pb-7">
            <Button
              onClick={updateSettings}
              disabled={!settingsName.trim() || savingSettings}
            >
              {savingSettings
                ? t("groups.actions.saving")
                : t("groups.actions.save")}
            </Button>
          </DialogFooter>
                </>
              )}
            />
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
