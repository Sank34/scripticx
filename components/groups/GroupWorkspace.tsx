"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useLayoutEffect,
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
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  FileText,
  Hash,
  Images,
  ImagePlus,
  LinkIcon,
  Lock,
  LogOut,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Pin,
  Plus,
  Radio,
  Search,
  Send,
  SmilePlus,
  Settings,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  api,
  STUDY_GROUP_ATTACHMENT_ACCEPT,
  type MentionCandidate,
  type ProfileSummary,
  type StudyGroupMember,
  type StudyGroupMessage,
  type StudyGroupMessageAttachment,
  type StudyGroupSticker,
  type StudyGroupWorkspace as StudyGroupWorkspaceData,
} from "@/lib/api";
import { resolveAvatarUrl } from "@/lib/avatar";
import {
  getInlineStickerToken,
  emojiShortcode,
  GROUP_EMOJI_SHORTCODES,
  isStickerOnlyMessage,
  tokenizeGroupMessage,
} from "@/lib/group-messages";
import { supabase } from "@/lib/supabase";
import { ChatMediaPreview } from "@/components/groups/ChatMediaPreview";
import { GroupGifPicker } from "@/components/groups/GroupGifPicker";
import { useLanguage } from "@/components/LanguageProvider";
import { EmptyState } from "@/components/common/EmptyState";
import { InvitePeoplePicker } from "@/components/collaboration/InvitePeoplePicker";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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

  return (
    <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-64 -translate-x-1/2 overflow-hidden rounded-xl border bg-popover text-left text-popover-foreground shadow-lg group-hover/mention:block">
      <span
        className="block h-14 bg-muted bg-cover bg-center"
        style={
          profile.banner_url
            ? {
                backgroundImage: `url("${profile.banner_url}")`,
              }
            : undefined
        }
      />
      <span className="-mt-5 flex items-end gap-3 px-3 pb-3">
        <span
          className="flex size-12 shrink-0 items-center justify-center rounded-full border-4 border-popover bg-muted bg-cover bg-center text-sm font-semibold text-muted-foreground shadow-sm"
          style={{
            backgroundImage: `url("${resolveAvatarUrl(profile.avatar_url)}")`,
          }}
        />
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
  stickersByToken: Map<string, StudyGroupSticker>,
  stickerClassName = "mx-0.5 inline-block size-8 object-contain align-middle"
) {
  const nodes = tokenizeGroupMessage(content).map((token, index) => {
    const key = `${token.value}-${index}`;

    if (token.type === "text") return token.value;

    if (token.type === "live-room") {
      const href = `/editor?live=${encodeURIComponent(token.roomId)}&view=live`;
      return (
        <Link
          key={key}
          href={href}
          className="font-medium text-emerald-600 underline-offset-4 hover:underline"
        >
          {token.value}
        </Link>
      );
    }

    if (token.type === "sticker") {
      const sticker = stickersByToken.get(token.token);
      if (!sticker) {
        const name = token.token.slice(1, -1);
        return Object.hasOwn(GROUP_EMOJI_SHORTCODES, name) ? GROUP_EMOJI_SHORTCODES[name] : token.value;
      }

      return (
        <img
          key={key}
          src={sticker.image_url}
          alt={sticker.name}
          className={stickerClassName}
        />
      );
    }

    const profile = profilesByUsername.get(token.username.toLowerCase());

    return (
      <span
        key={key}
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
          <span className="font-semibold text-emerald-600">{token.value}</span>
        )}
        {profile ? <MentionPreview profile={profile} /> : null}
      </span>
    );
  });

  return <>{nodes}</>;
}

const ATTACHMENT_ONLY_MESSAGE_CONTENT = "\u2063";

function getStickerMessageData(item: StudyGroupMessage) {
  const metadata = item.metadata || {};
  const stickerUrl =
    typeof metadata.stickerUrl === "string" ? metadata.stickerUrl : null;
  const stickerName =
    typeof metadata.stickerName === "string" ? metadata.stickerName : item.content;

  return { stickerUrl, stickerName };
}

function visibleGroupMessageContent(item: StudyGroupMessage) {
  const content = item.content.trim();
  if (!content || content === ATTACHMENT_ONLY_MESSAGE_CONTENT) return "";
  const duplicatesImageName = (item.attachments || []).some(
    (attachment) =>
      attachment.kind === "image" && attachment.file_name.trim() === content
  );
  return duplicatesImageName ? "" : content;
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
          className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition hover:bg-accent"
        >
          <UserAvatar
            avatarUrl={profile?.avatar_url}
            username={username}
            equippedRewards={profile?.equipped_rewards}
            className="size-8"
          />
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{username}</p>
            <p className="text-xs text-muted-foreground">{roleLabel}</p>
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="left"
        align="start"
        sideOffset={12}
        className="w-80 overflow-hidden rounded-xl border-border bg-popover p-0 text-popover-foreground shadow-lg"
      >
        <div
          className={
            profile?.banner_url
              ? "h-24 bg-cover bg-center"
              : "h-24 bg-muted"
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
            <span className="rounded-full border bg-popover px-3 py-1 text-xs font-medium text-popover-foreground shadow-sm">
              {roleLabel}
            </span>
          </div>

          <div className="mt-4 space-y-1">
            <h3 className="truncate text-2xl font-bold text-foreground">
              {username}
            </h3>
            <p className="truncate text-sm text-muted-foreground">
              @{username}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl border bg-muted/40 px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground">
                {t("groups.memberPreview.role")}
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-foreground">
                {roleLabel}
              </p>
            </div>
            <div className="rounded-xl border bg-muted/40 px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground">
                {t("groups.memberPreview.score")}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
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
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const chatContentRef = useRef<HTMLDivElement | null>(null);
  const followingLatestRef = useRef(true);
  const lastAutoScrollChannelRef = useRef<string | null>(null);
  const lastAutoScrollMessageRef = useRef<string | null>(null);
  const jumpUnreadChannelRef = useRef<string | null>(null);
  const groupRealtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastTypingSentRef = useRef(0);
  const typingStopTimeoutRef = useRef<number | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const gifInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingGif, setPendingGif] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [composerCursor, setComposerCursor] = useState(0);
  const [emojiActiveIndex, setEmojiActiveIndex] = useState(0);
  const [emojiDismissed, setEmojiDismissed] = useState(false);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
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
  const [mobileChannelsOpen, setMobileChannelsOpen] = useState(false);
  const [mobileMembersOpen, setMobileMembersOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState("general");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [deletingChannelId, setDeletingChannelId] = useState<string | null>(null);
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [editingChannelName, setEditingChannelName] = useState("");
  const [contentBrowserOpen, setContentBrowserOpen] = useState(false);
  const [contentBrowserTab, setContentBrowserTab] = useState("search");
  const [chatSearch, setChatSearch] = useState("");
  const [jumpUnreadId, setJumpUnreadId] = useState<string | null>(null);
  const [moderatingMemberId, setModeratingMemberId] = useState<string | null>(null);
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
  const unreadByChannel = useMemo(
    () => new Map((workspace?.unreads || []).map((item) => [item.channel_id, item])),
    [workspace?.unreads]
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
  const activeUnread = activeChannel
    ? unreadByChannel.get(activeChannel.id) || null
    : null;
  const channelSlugPreview = normalizeChannelSlug(newChannelName);
  const groupInitial = group?.name?.charAt(0).toUpperCase() || "S";
  const settingsAvatarPreview =
    settingsAvatarPreviewUrl || group?.avatar_url || null;
  const settingsBannerPreview =
    settingsBannerPreviewUrl || group?.banner_url || null;
  const groupActivity = useGroupActivity(userId, { eager: true });
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
      map.set(`:sticker-${sticker.id}:`.toLowerCase(), sticker);
    }

    return map;
  }, [stickers]);
  const emojiMatch = message.slice(0, composerCursor).match(/(?:^|\s):([a-z0-9_-]*)$/i);
  const emojiQuery = emojiMatch?.[1]?.toLowerCase() ?? null;
  const emojiCompletions = useMemo(() => {
    if (emojiQuery === null || emojiDismissed) return [];
    const custom = stickers.map(sticker => ({ name: emojiShortcode(sticker.name), image: sticker.image_url, emoji: "" }));
    const standard = Object.entries(GROUP_EMOJI_SHORTCODES).map(([name, emoji]) => ({ name, emoji, image: "" }));
    return [...custom, ...standard].filter(item => item.name && item.name.includes(emojiQuery)).slice(0, 8);
  }, [emojiQuery, emojiDismissed, stickers]);
  useEffect(() => { setEmojiActiveIndex(0); }, [emojiQuery]);

  function insertEmojiShortcode(name: string) {
    if (emojiQuery === null) return;
    const start = composerCursor - emojiQuery.length - 1;
    const insertion = `:${name}: `;
    setMessage(message.slice(0, start) + insertion + message.slice(composerCursor));
    setComposerCursor(start + insertion.length);
    setEmojiDismissed(true);
    requestAnimationFrame(() => { messageInputRef.current?.focus(); messageInputRef.current?.setSelectionRange(start + insertion.length, start + insertion.length); });
  }
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

  const messageSearchQuery = useQuery<StudyGroupMessage[]>({
    queryKey: ["groups", slug, "search", activeChannel?.id, chatSearch],
    queryFn: () =>
      groupId
        ? api.groups.searchMessages({
            groupId,
            channelId: activeChannel?.id,
            query: chatSearch,
          })
        : Promise.resolve([]),
    enabled: Boolean(contentBrowserOpen && contentBrowserTab === "search" && groupId && chatSearch.trim()),
  });
  const pinnedMessagesQuery = useQuery<StudyGroupMessage[]>({
    queryKey: ["groups", slug, "pins", activeChannel?.id],
    queryFn: () =>
      groupId
        ? api.groups.listPinnedMessages({ groupId, channelId: activeChannel?.id })
        : Promise.resolve([]),
    enabled: Boolean(contentBrowserOpen && contentBrowserTab === "pins" && groupId),
  });
  const mediaQuery = useQuery<StudyGroupMessageAttachment[]>({
    queryKey: ["groups", slug, "media", activeChannel?.id],
    queryFn: () =>
      groupId
        ? api.groups.listMedia({ groupId, channelId: activeChannel?.id })
        : Promise.resolve([]),
    enabled: Boolean(contentBrowserOpen && contentBrowserTab === "media" && groupId),
  });

  const latestMessageAt = messagesQuery.data?.at(-1)?.created_at || null;

  useEffect(() => {
    const channelId = activeChannel?.id || null;
    if (jumpUnreadChannelRef.current !== channelId) {
      jumpUnreadChannelRef.current = channelId;
      setJumpUnreadId(activeUnread?.first_unread_message_id || null);
    } else if (activeUnread?.first_unread_message_id) {
      setJumpUnreadId((current) => current || activeUnread.first_unread_message_id);
    }
  }, [activeChannel?.id, activeUnread?.first_unread_message_id]);

  useEffect(() => {
    if (!groupId || !userId || !activeMembership || !latestMessageAt) return;

    markStudyGroupSeen(userId, groupId);
    if (activeChannel?.id) {
      markStudyGroupChannelSeen(userId, groupId, activeChannel.id);
      void api.groups
        .markChannelRead({
          groupId,
          channelId: activeChannel.id,
          messageId: messagesQuery.data?.at(-1)?.id || null,
        })
        .then(() => queryClient.invalidateQueries({ queryKey: ["groups", slug] }))
        .catch((error) => console.warn("Could not mark group channel read:", error));
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
    messagesQuery.data,
    queryClient,
    slug,
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
      .on("broadcast", { event: "messages-changed" }, ({ payload }) => {
        const channelId =
          payload && typeof payload === "object" && "channelId" in payload
            ? String(payload.channelId || "")
            : "";

        void queryClient.invalidateQueries({
          queryKey: channelId
            ? ["groups", slug, "messages", channelId]
            : ["groups", slug, "messages"],
        });
      })
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
                    attachments: [],
                    pin: null,
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "study_group_channel_reads", filter: `group_id=eq.${groupId}` },
        () => void queryClient.invalidateQueries({ queryKey: ["groups", slug] })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "study_group_message_pins", filter: `group_id=eq.${groupId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["groups", slug, "messages"] });
          void queryClient.invalidateQueries({ queryKey: ["groups", slug, "pins"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "study_group_message_attachments", filter: `group_id=eq.${groupId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["groups", slug, "messages"] });
          void queryClient.invalidateQueries({ queryKey: ["groups", slug, "media"] });
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") groupRealtimeChannelRef.current = channel;
      });

    return () => {
      if (groupRealtimeChannelRef.current === channel) {
        groupRealtimeChannelRef.current = null;
      }
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

  const latestMessageId = messagesQuery.data?.at(-1)?.id || null;

  useEffect(() => {
    setPendingGif(null);
    setEmojiDismissed(true);
    closeComposerPicker();
  }, [activeChannel?.id]);

  useLayoutEffect(() => {
    const channelId = activeChannel?.id || null;
    const viewport = chatScrollRef.current?.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]');
    if (!channelId || !viewport || messagesQuery.isPending) return;
    const changedChannel = lastAutoScrollChannelRef.current !== channelId;
    const ownMessage = messagesQuery.data?.at(-1)?.user_id === userId;
    if (changedChannel || followingLatestRef.current || (ownMessage && lastAutoScrollMessageRef.current !== latestMessageId)) {
      viewport.scrollTop = viewport.scrollHeight;
      followingLatestRef.current = true;
    }
    lastAutoScrollChannelRef.current = channelId;
    lastAutoScrollMessageRef.current = latestMessageId;
  }, [activeChannel?.id, latestMessageId, messagesQuery.isPending, messagesQuery.data, userId]);

  useEffect(() => {
    const viewport = chatScrollRef.current?.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]');
    const content = chatContentRef.current;
    if (!viewport || !content) return;
    const trackScroll = () => { followingLatestRef.current = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 80; };
    const observer = new ResizeObserver(() => {
      if (followingLatestRef.current) viewport.scrollTop = viewport.scrollHeight;
    });
    observer.observe(content);
    observer.observe(viewport);
    viewport.addEventListener("scroll", trackScroll, { passive: true });
    return () => { observer.disconnect(); viewport.removeEventListener("scroll", trackScroll); };
  }, [activeChannel?.id, messagesQuery.isPending]);

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

  function broadcastMessageChange(channelId: string) {
    if (!groupRealtimeChannelRef.current) return;
    void groupRealtimeChannelRef.current.send({
      type: "broadcast",
      event: "messages-changed",
      payload: { channelId, sentAt: new Date().toISOString() },
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
    setComposerCursor(cursor);
    setEmojiDismissed(false);
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
    if (event.nativeEvent.isComposing) return;
    if (emojiCompletions.length) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        setEmojiActiveIndex(index => (index + (event.key === "ArrowDown" ? 1 : -1) + emojiCompletions.length) % emojiCompletions.length);
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault(); insertEmojiShortcode((emojiCompletions[emojiActiveIndex] ?? emojiCompletions[0]).name); return;
      }
      if (event.key === "Escape") { event.preventDefault(); setEmojiDismissed(true); return; }
    }
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
    if (!group || !activeChannel || !userId || (!message.trim() && !attachmentFiles.length && !pendingGif) || sending) return;

    const files = attachmentFiles;
    const gif = pendingGif;
    const caption = message.trim();
    const content = caption || (gif ? "Shared a GIF" : ATTACHMENT_ONLY_MESSAGE_CONTENT);
    const mediaMetadata = gif ? { expressionType: "gif", gifUrl: gif, stickerUrl: gif, stickerName: "GIF", caption } : {};
    const optimisticMessage: StudyGroupMessage = {
      id: `optimistic-${Date.now()}`,
      group_id: group.id,
      channel_id: activeChannel.id,
      user_id: userId,
      content,
      kind: "message",
      metadata: { ...mediaMetadata, optimistic: true },
      created_at: new Date().toISOString(),
      profiles: currentProfile,
      reactions: [],
      attachments: [],
      pin: null,
    };

    setMessage("");
    setAttachmentFiles([]);
    setPendingGif(null);
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
        kind: gif ? "sticker" : "message",
        metadata: mediaMetadata,
        locale,
        files,
      });
      broadcastMessageChange(activeChannel.id);
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
      setMessage((current) => current || caption);
      setAttachmentFiles(files);
      setPendingGif(gif);
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
      if (activeChannel?.id) broadcastMessageChange(activeChannel.id);
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
      if (activeChannel?.id) broadcastMessageChange(activeChannel.id);
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
      if (activeChannel?.id) broadcastMessageChange(activeChannel.id);
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

  async function toggleMessagePin(item: StudyGroupMessage) {
    if (!group || !canManage) return;
    try {
      await api.groups.toggleMessagePin({
        groupId: group.id,
        messageId: item.id,
        pin: !item.pin,
      });
      broadcastMessageChange(item.channel_id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["groups", slug, "messages", item.channel_id] }),
        queryClient.invalidateQueries({ queryKey: ["groups", slug, "pins"] }),
      ]);
      toast.success(item.pin ? "Message unpinned" : "Message pinned");
    } catch (error) {
      console.error("Could not update message pin:", error);
      toast.error("Could not update the pinned message");
    }
  }

  function jumpToMessage(messageId: string) {
    setContentBrowserOpen(false);
    window.requestAnimationFrame(() => {
      const viewport = chatScrollRef.current?.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]');
      const target = document.getElementById(`group-message-${messageId}`);
      if (!viewport || !target) return;
      followingLatestRef.current = false;
      viewport.scrollTo({ top: viewport.scrollTop + target.getBoundingClientRect().top - viewport.getBoundingClientRect().top - viewport.clientHeight / 2, behavior: "auto" });
    });
  }

  function openMessageResult(item: StudyGroupMessage) {
    if (item.channel_id !== activeChannel?.id) setActiveChannelId(item.channel_id);
    setContentBrowserOpen(false);
    window.setTimeout(() => jumpToMessage(item.id), item.channel_id === activeChannel?.id ? 0 : 260);
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

  async function renameChannel() {
    if (!group || !userId || !editingChannelId || !editingChannelName.trim()) return;
    try {
      await api.groups.renameChannel({
        groupId: group.id,
        channelId: editingChannelId,
        userId,
        name: editingChannelName,
      });
      setEditingChannelId(null);
      setEditingChannelName("");
      await queryClient.invalidateQueries({ queryKey: ["groups", slug] });
      toast.success("Channel renamed");
    } catch (error) {
      console.error("Could not rename channel:", error);
      toast.error("Could not rename the channel");
    }
  }

  async function moveChannel(channelId: string, direction: -1 | 1) {
    if (!group || !userId || !canManageChannels) return;
    const currentIndex = channels.findIndex((channel) => channel.id === channelId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= channels.length) return;
    const nextChannels = [...channels];
    [nextChannels[currentIndex], nextChannels[nextIndex]] = [nextChannels[nextIndex], nextChannels[currentIndex]];
    try {
      await api.groups.reorderChannels({
        groupId: group.id,
        userId,
        channelIds: nextChannels.map((channel) => channel.id),
      });
      await queryClient.invalidateQueries({ queryKey: ["groups", slug] });
    } catch (error) {
      console.error("Could not reorder channels:", error);
      toast.error("Could not reorder the channels");
    }
  }

  async function moderateMember(memberId: string, action: "remove" | "ban" | "unban") {
    if (!group || !canManage || moderatingMemberId) return;
    setModeratingMemberId(memberId);
    try {
      await api.groups.moderateMember({ groupId: group.id, memberId, action });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["groups", slug] }),
        queryClient.invalidateQueries({ queryKey: ["groups"] }),
      ]);
      toast.success(action === "ban" ? "Member banned" : action === "unban" ? "Member unbanned" : "Member removed");
    } catch (error) {
      console.error("Could not moderate member:", error);
      toast.error("Could not update this member");
    } finally {
      setModeratingMemberId(null);
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

    const shortcode = emojiShortcode(stickerName);
    if (!shortcode || GROUP_EMOJI_SHORTCODES[shortcode] || stickers.some(item => emojiShortcode(item.name) === shortcode)) {
      toast.error(locale === "ro" ? "Alege un nume de emoji unic, cu litere, cifre sau underscore." : "Choose a unique emoji name using letters, numbers or underscores.");
      return;
    }
    setSavingSticker(true);

    try {
      await api.groups.createSticker({
        groupId: group.id,
        userId,
        name: shortcode,
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
      window.open(`/editor?live=${encodeURIComponent(room.id)}&view=live`, "_self");
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
      <aside className="hidden min-h-0 flex-col border-r bg-muted/45 md:flex">
        <div className="border-b p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-lg font-semibold">{group.name}</p>
            {canManage && (
              <button
                onClick={() => setSettingsDialogOpen(true)}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
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

        <div className="flex items-center justify-between px-4 py-3 text-xs font-medium text-muted-foreground">
          <span>{t("groups.workspace.channels")}</span>
          {canManageChannels && (
            <button
              onClick={() => setChannelDialogOpen(true)}
              className="rounded-md p-1 hover:bg-accent"
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
              const unreadCount = unreadByChannel.get(channel.id)?.unread_count || 0;
              const hasChannelActivity =
                !channelMentionCount &&
                groupActivity.activityChannelIds.has(channel.id);

              return (
                <div
                  key={channel.id}
                  className={`group/channel flex w-full items-center rounded-xl text-sm transition ${
                    active
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveChannelId(channel.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-3 py-2 text-left"
                  >
                    <Hash className="size-4 shrink-0" />
                    <span className="truncate">{channel.name}</span>
                    {unreadCount > 0 ? (
                      <span
                        className="ml-auto flex min-w-5 shrink-0 items-center justify-center rounded-full bg-zinc-950 px-1.5 text-[10px] font-semibold text-white"
                        aria-label={`${unreadCount} unread messages`}
                      >
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    ) : channelMentionCount > 0 ? (
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

                  {canManageChannels ? (
                    <div className="mr-1 hidden items-center gap-0.5 group-hover/channel:flex">
                      <button type="button" disabled={channels[0]?.id === channel.id} onClick={() => void moveChannel(channel.id, -1)} className="rounded p-1 text-muted-foreground hover:bg-accent disabled:opacity-25" aria-label="Move channel up"><ChevronUp className="size-3.5" /></button>
                      <button type="button" disabled={channels.at(-1)?.id === channel.id} onClick={() => void moveChannel(channel.id, 1)} className="rounded p-1 text-muted-foreground hover:bg-accent disabled:opacity-25" aria-label="Move channel down"><ChevronDown className="size-3.5" /></button>
                      <button type="button" onClick={() => { setEditingChannelId(channel.id); setEditingChannelName(channel.name); }} className="rounded p-1 text-muted-foreground hover:bg-accent" aria-label="Rename channel"><Pencil className="size-3.5" /></button>
                    {channels.length > 1 ? <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          type="button"
                          className="mr-1 rounded-lg p-1.5 text-muted-foreground opacity-0 transition hover:bg-red-500/10 hover:text-red-600 group-hover/channel:opacity-100 dark:hover:text-red-400"
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
                    </AlertDialog> : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </aside>

      <main className="flex min-h-0 min-w-0 flex-col">
        <header className="flex min-h-16 items-center justify-between gap-3 border-b px-4">
          <div className="hidden min-w-0 md:block">
            <p className="flex items-center gap-2 truncate text-sm font-semibold">
              <Hash className="size-4" />
              {activeChannel?.name || t("groups.workspace.noChannel")}
            </p>
            <p className="text-xs text-muted-foreground">
              {members.length} {t("groups.workspace.members")}
            </p>
          </div>

          <Sheet open={mobileChannelsOpen} onOpenChange={setMobileChannelsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" className="h-auto min-h-11 min-w-0 flex-1 justify-start gap-3 px-0 text-left md:hidden" aria-label={locale === "ro" ? "Schimbă canalul" : "Switch channel"}>
                <span className="min-w-0"><span className="block truncate text-xs font-normal text-muted-foreground">{group.name}</span><span className="flex items-center gap-1.5"><Hash className="size-4 shrink-0" /><span className="truncate">{activeChannel?.name || t("groups.workspace.noChannel")}</span><ChevronDown className="size-4 shrink-0" /></span></span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" aria-describedby={undefined} className="max-h-[80dvh] gap-0 rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]">
              <SheetHeader className="pr-14"><SheetTitle>{group.name}</SheetTitle><p className="text-sm text-muted-foreground">{t("groups.workspace.channels")}</p></SheetHeader>
              <div className="min-h-0 overflow-y-auto overscroll-contain px-3">
                {channels.map(channel => {
                  const unread = unreadByChannel.get(channel.id)?.unread_count || 0;
                  const mentions = groupActivity.mentionCountsByChannel.get(channel.id) || 0;
                  const active = channel.id === activeChannel?.id;
                  return <Button key={channel.id} variant={active ? "secondary" : "ghost"} aria-current={active ? "page" : undefined} className="mb-1 min-h-12 w-full justify-start gap-3" onClick={() => { setActiveChannelId(channel.id); setMobileChannelsOpen(false); }}>
                    <Hash className="size-4 shrink-0" /><span className="min-w-0 truncate">{channel.name}</span>
                    <span className="ml-auto flex shrink-0 items-center gap-2">{unread || mentions ? <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground" aria-label={`${unread || mentions} ${locale === "ro" ? "necitite" : "unread"}`}>{Math.min(unread || mentions, 99)}{(unread || mentions) > 99 ? "+" : ""}</span> : groupActivity.activityChannelIds.has(channel.id) ? <span className="size-2 rounded-full bg-primary" aria-label={t("groups.activity.newActivity")} /> : null}{active ? <Check className="size-4" /> : null}</span>
                  </Button>;
                })}
                {canManageChannels ? <Button variant="ghost" className="mt-2 min-h-11 w-full justify-start gap-3" onClick={() => { setMobileChannelsOpen(false); setChannelDialogOpen(true); }}><Plus className="size-4" />{t("groups.actions.newChannel")}</Button> : null}
              </div>
            </SheetContent>
          </Sheet>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-11 shrink-0 md:hidden" aria-label={locale === "ro" ? "Acțiunile grupului" : "Group actions"}><MoreHorizontal className="size-5" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52 [&_[role=menuitem]]:min-h-11">
              <DropdownMenuItem onSelect={() => setContentBrowserOpen(true)}><Search />{locale === "ro" ? "Caută în conversație" : "Search conversation"}</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setMobileMembersOpen(true)}><Users />{t("groups.workspace.members")} ({members.length})</DropdownMenuItem>
              {canInvite ? <DropdownMenuItem onSelect={() => setInviteDialogOpen(true)}><UserPlus />{t("groups.actions.invite")}</DropdownMenuItem> : null}
              <DropdownMenuItem disabled={!activeChannel || startingLive} onSelect={() => void startLiveSession()}><Radio />{t("groups.actions.startLive")}</DropdownMenuItem>
              {canManage ? <DropdownMenuItem onSelect={() => setSettingsDialogOpen(true)}><Settings />{t("groups.actions.settings")}</DropdownMenuItem> : null}
              {activeMembership && !isGroupOwner ? <><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" disabled={leavingGroup} onSelect={() => setLeaveDialogOpen(true)}><LogOut />{t("groups.actions.leaveServer")}</DropdownMenuItem></> : null}
            </DropdownMenuContent>
          </DropdownMenu>
          <Sheet open={mobileMembersOpen} onOpenChange={setMobileMembersOpen}>
            <SheetContent side="bottom" aria-describedby={undefined} className="max-h-[80dvh] rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]">
              <SheetHeader><SheetTitle>{t("groups.workspace.members")} ({members.length})</SheetTitle></SheetHeader>
              <div className="min-h-0 space-y-2 overflow-y-auto overscroll-contain px-4">{members.map(member => <StudyGroupMemberPreview key={member.user_id} member={member} profile={api.groups.getMemberProfile(member)} t={t} />)}</div>
            </SheetContent>
          </Sheet>
          <div className="hidden items-center gap-2 md:flex">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setContentBrowserOpen(true)}
              aria-label={locale === "ro" ? "Caută în conversație" : "Search conversation"}
              className="gap-2"
            >
              <Search className="size-4" />
              <span className="hidden 2xl:inline">Search</span>
            </Button>
            {canInvite && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setInviteDialogOpen(true)}
                aria-label={t("groups.actions.invite")}
                className="gap-2"
              >
                <UserPlus className="size-4" />
                <span className="hidden 2xl:inline">
                  {t("groups.actions.invite")}
                </span>
              </Button>
            )}
            {activeMembership && !isGroupOwner ? (
              <AlertDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={leavingGroup}
                    aria-label={t("groups.actions.leaveServer")}
                    className="gap-2 border-red-500/25 text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <LogOut className="size-4" />
                    <span className="hidden 2xl:inline">
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
              aria-label={t("groups.actions.startLive")}
              disabled={!activeChannel || startingLive}
              className="gap-2"
            >
              <Radio className="size-4" />
              <span className="hidden 2xl:inline">{t("groups.actions.startLive")}</span>
            </Button>
          </div>
        </header>

        {jumpUnreadId ? (
          <div className="border-b bg-emerald-50/80 px-4 py-2 dark:bg-emerald-950/25">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 gap-2 text-emerald-800 dark:text-emerald-200"
              onClick={() => { jumpToMessage(jumpUnreadId); setJumpUnreadId(null); }}
            >
              <ChevronDown className="size-4" />
              Jump to first unread
            </Button>
          </div>
        ) : null}
        <ScrollArea ref={chatScrollRef} className="min-h-0 flex-1">
          <div ref={chatContentRef} className="space-y-4 p-4">
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
                  const gifUrl = item.metadata?.expressionType === "gif" && typeof item.metadata.gifUrl === "string" && /^https?:\/\//i.test(item.metadata.gifUrl) ? item.metadata.gifUrl : null;
                  const stickerData = isStickerMessage
                    ? getStickerMessageData(item)
                    : null;
                  const messageContent = visibleGroupMessageContent(item);
                  const inlineStickerOnly =
                    !isStickerMessage &&
                    !item.attachments?.length &&
                    isStickerOnlyMessage(messageContent) && stickersByInlineToken.has(messageContent.trim().toLowerCase());
                  const mediaOnly = Boolean(item.attachments?.length) && item.attachments!.every(a => a.kind === "image");
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
                        id={`group-message-${item.id}`}
                        variant="separator"
                        className="py-1 text-xs"
                      >
                        <MarkerIcon>
                          <MessageSquare className="size-3.5" />
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
                      id={`group-message-${item.id}`}
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
                            <div className="w-[min(30rem,78vw)] rounded-2xl border bg-card p-2 text-card-foreground shadow-sm">
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
                                className="min-h-20 resize-none rounded-xl border-border text-sm"
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
                              variant={isStickerMessage || gifUrl || inlineStickerOnly || mediaOnly ? "ghost" : isMine ? "default" : "muted"}
                              className="max-w-full"
                            >
                              <BubbleContent
                                className={`min-w-[2.25rem] rounded-2xl border-transparent ${
                                  isStickerMessage || gifUrl || inlineStickerOnly || mediaOnly
                                    ? "bg-transparent p-0 text-foreground shadow-none"
                                    : isMine
                                    ? "bg-zinc-950 text-white"
                                    : "bg-muted text-foreground"
                                }`}
                              >
                                {gifUrl ? <div className="space-y-2"><ChatMediaPreview url={gifUrl} name="GIF" />{typeof item.metadata?.caption === "string" && item.metadata.caption ? <p>{item.metadata.caption}</p> : null}</div> : isStickerMessage && stickerData?.stickerUrl ? (
                                  <img
                                    src={stickerData.stickerUrl}
                                    alt={stickerData.stickerName}
                                    className="size-32 object-contain sm:size-40"
                                  />
                                ) : (
                                  <div className="space-y-2">
                                    {messageContent ? (
                                      <div className="inline-flex flex-wrap items-center whitespace-pre-wrap break-words align-middle">
                                        {renderMessageContent(
                                          messageContent,
                                          mentionProfilesByUsername,
                                          stickersByInlineToken,
                                          inlineStickerOnly
                                            ? "size-32 object-contain sm:size-40"
                                            : undefined
                                        )}
                                      </div>
                                    ) : null}
                                    {item.attachments?.length ? (
                                      <div className="grid max-w-sm gap-2">
                                        {item.attachments.map((attachment) =>
                                          attachment.kind === "image" ? (
                                            <ChatMediaPreview key={attachment.id} url={attachment.url} name={attachment.file_name} />
                                          ) : (
                                            <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-current/15 bg-background/10 p-3 no-underline">
                                              <FileText className="size-5 shrink-0" />
                                              <span className="min-w-0"><span className="block truncate text-sm font-medium">{attachment.file_name}</span><span className="block text-[10px] opacity-70">{Math.max(1, Math.round(attachment.size_bytes / 1024))} KB</span></span>
                                            </a>
                                          )
                                        )}
                                      </div>
                                    ) : null}
                                  </div>
                                )}
                              </BubbleContent>
                              {reactionGroups.length ? (
                                <BubbleReactions
                                  align={isMine ? "end" : "start"}
                                  side="bottom"
                                  className="bg-popover text-xs text-popover-foreground shadow-sm ring-background"
                                >
                                  {reactionGroups.map((reaction) => (
                                    <Popover key={reaction.emoji}>
                                      <PopoverTrigger asChild>
                                        <button
                                          type="button"
                                          className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-1.5 py-0.5 leading-none transition hover:bg-accent ${
                                            reaction.reactedByMe
                                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
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
                                        className="w-72 gap-3 rounded-xl border-border bg-popover p-3 text-popover-foreground shadow-lg"
                                      >
                                        <div className="flex items-center justify-between gap-3">
                                          <div className="text-sm font-semibold text-foreground">
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
                                                <span className="max-w-20 truncate text-xs font-medium text-foreground/80">
                                                  {reactionUser.username}
                                                </span>
                                              </>
                                            );

                                            return reactionUser.username !==
                                              "user" ? (
                                              <Link
                                                key={`${reaction.emoji}-${reactionUser.id}`}
                                                href={`/u/${reactionUser.username}`}
                                                className="flex min-w-16 flex-col items-center gap-1 rounded-xl px-2 py-1.5 transition hover:bg-accent"
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
                            className={`absolute -top-8 z-20 items-center gap-1 rounded-full border bg-popover/95 p-1 text-popover-foreground shadow-lg ${
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
                                  className="rounded-full px-1.5 py-0.5 text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
                                  aria-label={t("groups.actions.moreReactions")}
                                >
                                  <SmilePlus className="size-3.5" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent
                                align={isMine ? "end" : "start"}
                                side="top"
                                sideOffset={10}
                                className="w-72 gap-2 rounded-xl border-border bg-popover p-2 text-popover-foreground shadow-lg"
                              >
                                {emojiPickerMessageId === item.id ? (
                                  <>
                                    <div className="relative">
                                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
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
                                              className="flex size-8 items-center justify-center rounded-lg text-xl transition hover:bg-accent"
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
                                className="rounded-full px-1.5 py-0.5 text-sm transition hover:bg-accent"
                                aria-label={`${t("groups.actions.react")} ${emoji}`}
                              >
                                {emoji}
                              </button>
                            ))}
                            {canManage ? (
                              <button
                                type="button"
                                onClick={() => { closeEmojiPicker(); void toggleMessagePin(item); }}
                                className={`rounded-full px-1.5 py-0.5 transition hover:bg-accent ${item.pin ? "text-emerald-600" : "text-muted-foreground"}`}
                                aria-label={item.pin ? "Unpin message" : "Pin message"}
                              >
                                <Pin className="size-3.5" />
                              </button>
                            ) : null}
                            {canEditMessage ? (
                              <button
                                type="button"
                                onClick={() => {
                                  closeEmojiPicker();
                                  startEditingMessage(item);
                                }}
                                className="rounded-full px-1.5 py-0.5 text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
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
                                    className="rounded-full px-1.5 py-0.5 text-red-500 transition hover:bg-red-500/10"
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
                            {item.pin ? <span className="ml-1 inline-flex items-center gap-1"><Pin className="size-3" /> Pinned</span> : null}
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
                        <BubbleContent className="flex items-center gap-1 rounded-2xl border-transparent bg-muted px-3 py-2 text-muted-foreground">
                          <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.2s]" />
                          <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.1s]" />
                          <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
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
          {pendingGif && <div className="mb-2 flex items-center gap-3"><div className="max-w-48"><ChatMediaPreview url={pendingGif} name="GIF" /></div><Button variant="ghost" size="sm" onClick={() => setPendingGif(null)}>{locale === "ro" ? "Elimină GIF-ul" : "Remove GIF"}</Button></div>}
          <input ref={gifInputRef} type="file" accept="image/gif" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) { setPendingGif(null); setAttachmentFiles([file]); closeComposerPicker(); } e.target.value = ""; }} />
          {attachmentFiles.length ? (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachmentFiles.map((file, index) => (
                <span key={`${file.name}-${index}`} className="inline-flex max-w-56 items-center gap-2 rounded-full border bg-muted px-3 py-1 text-xs">
                  <Paperclip className="size-3" /><span className="truncate">{file.name}</span>
                  <button type="button" onClick={() => setAttachmentFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="Remove attachment"><X className="size-3" /></button>
                </span>
              ))}
            </div>
          ) : null}
          <div className="relative flex items-end gap-2">
            {emojiCompletions.length > 0 && <div role="listbox" id="group-emoji-completions" aria-label={locale === "ro" ? "Emoji-uri" : "Emojis"} className="absolute bottom-full left-0 z-30 mb-2 max-h-64 w-72 max-w-full overflow-y-auto rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg">
              {emojiCompletions.map((item, index) => <button id={`group-emoji-option-${index}`} key={item.name} role="option" aria-selected={index === emojiActiveIndex} type="button" onMouseDown={e => e.preventDefault()} onClick={() => insertEmojiShortcode(item.name)} className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${index === emojiActiveIndex ? "bg-accent" : "hover:bg-accent/50"}`}>
                {item.image ? <img src={item.image} alt="" className="size-7 object-contain" /> : <span className="text-xl">{item.emoji}</span>}<span>:{item.name}:</span>
              </button>)}
            </div>}
            {mentionOpen ? (
              <div className="absolute bottom-full left-0 z-30 mb-2 w-72 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg">
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
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-accent/70"
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
              aria-controls={emojiCompletions.length ? "group-emoji-completions" : undefined}
              aria-activedescendant={emojiCompletions.length ? `group-emoji-option-${emojiActiveIndex}` : undefined}
              value={message}
              onChange={(event) =>
                handleMessageChange(
                  event.target.value,
                  event.target.selectionStart
                )
              }
              onClick={(event) => { setComposerCursor(event.currentTarget.selectionStart); updateMentionSearch(message, event.currentTarget.selectionStart); }}
              onKeyUp={(event) => { setComposerCursor(event.currentTarget.selectionStart); updateMentionSearch(message, event.currentTarget.selectionStart); }}
              onKeyDown={handleMessageKeyDown}
              placeholder={t("groups.workspace.messagePlaceholder")}
              className="max-h-32 min-h-10 resize-none rounded-xl"
            />
            <input
              ref={attachmentInputRef}
              type="file"
              multiple
              className="hidden"
              accept={STUDY_GROUP_ATTACHMENT_ACCEPT}
              onChange={(event) => {
                const files = Array.from(event.target.files || []).slice(0, 5);
                setAttachmentFiles(files);
                setPendingGif(null);
                event.currentTarget.value = "";
              }}
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" size="icon" variant="outline" className="shrink-0 rounded-xl" onClick={() => attachmentInputRef.current?.click()} aria-label="Attach images or files">
                    <Paperclip className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Attach images or files</TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
                  <TabsList className="grid w-full grid-cols-3 rounded-xl">
                    <TabsTrigger value="gifs">GIFs</TabsTrigger>
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
                            className="flex size-10 items-center justify-center rounded-xl text-xl transition hover:bg-accent"
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
                  <TabsContent value="gifs" className="mt-3"><GroupGifPicker onSelect={url => { setPendingGif(url); setAttachmentFiles([]); closeComposerPicker(); messageInputRef.current?.focus(); }} onUpload={() => gifInputRef.current?.click()} /></TabsContent>
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
                            className="group flex min-h-24 flex-col items-center justify-center rounded-xl border bg-card p-2 text-center text-card-foreground transition-colors hover:bg-muted/30 disabled:opacity-50"
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
              disabled={(!message.trim() && !attachmentFiles.length && !pendingGif) || sending}
            >
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      </main>

      <aside className="hidden min-h-0 flex-col border-l bg-muted/45 xl:flex">
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
            <div className="rounded-xl border bg-muted/60 px-3 py-2 text-sm">
              <span className="text-muted-foreground">
                {t("groups.dialog.channelSlugPreview")}
              </span>
              <span className="ml-2 font-mono text-foreground">
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

      <Dialog open={Boolean(editingChannelId)} onOpenChange={(open) => { if (!open) setEditingChannelId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename channel</DialogTitle></DialogHeader>
          <Input value={editingChannelName} onChange={(event) => setEditingChannelName(event.target.value)} placeholder="channel-name" />
          <DialogFooter><Button onClick={() => void renameChannel()} disabled={!editingChannelName.trim()}>Save channel</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={contentBrowserOpen} onOpenChange={setContentBrowserOpen}>
        <DialogContent className="max-h-[82vh] max-w-2xl overflow-hidden p-0">
          <DialogHeader className="border-b px-6 pb-4 pt-6">
            <DialogTitle>Channel content</DialogTitle>
          </DialogHeader>
          <Tabs value={contentBrowserTab} onValueChange={setContentBrowserTab} className="min-h-0">
            <div className="px-6 pt-4">
              <TabsList className="grid w-full grid-cols-3 rounded-xl">
                <TabsTrigger value="search"><Search className="mr-2 size-4" />Search</TabsTrigger>
                <TabsTrigger value="pins"><Pin className="mr-2 size-4" />Pinned</TabsTrigger>
                <TabsTrigger value="media"><Images className="mr-2 size-4" />Media</TabsTrigger>
              </TabsList>
            </div>
            <ScrollArea className="h-[min(60vh,34rem)] px-6 pb-6">
              <TabsContent value="search" className="mt-4 space-y-3">
                <Input value={chatSearch} onChange={(event) => setChatSearch(event.target.value)} placeholder={`Search #${activeChannel?.name || "channel"}`} autoFocus />
                {!chatSearch.trim() ? <p className="py-12 text-center text-sm text-muted-foreground">Search this channel by message text.</p> : messageSearchQuery.isLoading ? <Skeleton className="h-24 w-full" /> : messageSearchQuery.data?.length ? messageSearchQuery.data.map((item) => {
                  const profile = api.groups.getMessageProfile(item);
                  return <button key={item.id} type="button" onClick={() => openMessageResult(item)} className="flex w-full gap-3 rounded-xl border bg-card p-3 text-left transition hover:bg-muted/50"><UserAvatar avatarUrl={profile?.avatar_url} username={profile?.username || "user"} equippedRewards={profile?.equipped_rewards} className="size-9" /><span className="min-w-0"><span className="block text-xs font-semibold">{profile?.username || "user"}</span><span className="mt-1 block line-clamp-2 text-sm text-muted-foreground">{item.content}</span></span></button>;
                }) : <p className="py-12 text-center text-sm text-muted-foreground">No matching messages.</p>}
              </TabsContent>
              <TabsContent value="pins" className="mt-4 space-y-3">
                {pinnedMessagesQuery.isLoading ? <Skeleton className="h-24 w-full" /> : pinnedMessagesQuery.data?.length ? pinnedMessagesQuery.data.map((item) => {
                  const profile = api.groups.getMessageProfile(item);
                  return <button key={item.id} type="button" onClick={() => openMessageResult(item)} className="flex w-full gap-3 rounded-xl border bg-card p-3 text-left transition hover:bg-muted/50"><Pin className="mt-1 size-4 shrink-0 text-emerald-600" /><span className="min-w-0"><span className="block text-xs font-semibold">{profile?.username || "user"}</span><span className="mt-1 block line-clamp-3 text-sm text-muted-foreground">{item.content}</span></span></button>;
                }) : <p className="py-12 text-center text-sm text-muted-foreground">No pinned messages in this channel.</p>}
              </TabsContent>
              <TabsContent value="media" className="mt-4">
                {mediaQuery.isLoading ? <Skeleton className="h-40 w-full" /> : mediaQuery.data?.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{mediaQuery.data.map((item) => item.kind === "image" ? <ChatMediaPreview key={item.id} url={item.url} name={item.file_name} /> : <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border bg-muted p-3 text-center"><FileText className="size-7" /><span className="line-clamp-2 text-xs">{item.file_name}</span></a>)}</div> : <p className="py-12 text-center text-sm text-muted-foreground">No images or files have been shared here.</p>}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("groups.dialog.inviteTitle")}</DialogTitle>
          </DialogHeader>
          <div className="rounded-xl border bg-muted/50 p-3">
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
          <InvitePeoplePicker
            query={inviteQuery}
            onQueryChange={setInviteQuery}
            candidates={inviteCandidates}
            loading={inviteCandidatesQuery.isLoading}
            invitingId={invitingId}
            onInvite={inviteMember}
            placeholder={t("groups.dialog.inviteSearch")}
            inviteLabel={t("groups.actions.invite")}
            invitingLabel={t("groups.actions.inviting")}
            followingLabel={t("groups.dialog.following")}
            userLabel={t("groups.dialog.scripticxUser")}
            emptyTitle={t("groups.empty.inviteTitle")}
            emptyDescription={t("groups.empty.inviteDescription")}
          />
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
                  <div className="overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm">
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
          <div className="border-b bg-muted/30 px-5 py-5 sm:px-7">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {t("groups.dialog.settingsTitle")}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {t("groups.dialog.settingsSubtitle")}
              </p>
            </DialogHeader>
            <div className="mt-5 overflow-hidden rounded-2xl border bg-card/90 text-card-foreground shadow-sm">
              <div
                className="h-24 border-b bg-muted bg-cover bg-center sm:h-32"
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
                    <p className="text-xs font-medium text-muted-foreground">
                      {t("groups.dialog.serverPreview")}
                    </p>
                    <h3 className="mt-1 truncate text-xl font-bold text-foreground">
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
                  <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/60 px-3 py-1 text-xs font-medium text-foreground/80">
                    <Users className="size-3.5" />
                    {t("groups.dialog.membersCount").replace(
                      "{count}",
                      String(members.length)
                    )}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/60 px-3 py-1 text-xs font-medium text-foreground/80">
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
              <TabsList className="mx-auto grid h-11 w-full max-w-2xl grid-cols-3 overflow-hidden rounded-2xl bg-muted p-1">
                <TabsTrigger
                  value="general"
                  className="flex h-full min-w-0 items-center justify-center rounded-xl border-0 px-3 py-0 text-center text-sm leading-none shadow-none outline-none ring-0 focus-visible:border-transparent focus-visible:ring-0 focus-visible:ring-offset-0 data-active:bg-background data-active:shadow-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <span className="block max-w-full truncate">
                    {t("groups.dialog.settingsGeneralTab")}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="stickers"
                  className="flex h-full min-w-0 items-center justify-center rounded-xl border-0 px-3 py-0 text-center text-sm leading-none shadow-none outline-none ring-0 focus-visible:border-transparent focus-visible:ring-0 focus-visible:ring-offset-0 data-active:bg-background data-active:shadow-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <span className="block max-w-full truncate">
                    {t("groups.dialog.settingsStickersTab")}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="permissions"
                  className="flex h-full min-w-0 items-center justify-center rounded-xl border-0 px-3 py-0 text-center text-sm leading-none shadow-none outline-none ring-0 focus-visible:border-transparent focus-visible:ring-0 focus-visible:ring-offset-0 data-active:bg-background data-active:shadow-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
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
                        <label className="rounded-2xl border bg-card p-4 text-sm text-card-foreground shadow-sm transition hover:border-emerald-500/40">
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
                        <label className="rounded-2xl border bg-card p-4 text-sm text-card-foreground shadow-sm transition hover:border-emerald-500/40">
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
                    <div className="rounded-2xl border bg-muted/60 p-4">
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
                        <SelectTrigger className="mt-4 bg-background">
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
                    <div className="rounded-2xl border bg-muted/50 p-4">
                      <div className="flex items-start gap-2">
                        <ImagePlus className="mt-0.5 size-4 text-muted-foreground" />
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
                          aria-label={locale === "ro" ? "Nume emoji" : "Emoji name"}
                          placeholder={locale === "ro" ? "Nume emoji, ex. happy_cat" : "Emoji name, e.g. happy_cat"}
                          maxLength={32}
                        />
                        <p className="text-xs text-muted-foreground sm:col-span-3 sm:row-start-2">{locale === "ro" ? "Cod în chat" : "Chat shortcode"}: <code>:{emojiShortcode(stickerName) || "emoji_name"}:</code></p>
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
                                className="group relative rounded-xl border bg-card p-2 text-card-foreground shadow-none transition-colors hover:bg-muted/30"
                              >
                                <div className="flex min-h-20 items-center justify-center rounded-lg bg-muted/40">
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
                                      className="absolute right-2 top-2 rounded-full bg-card/90 p-1 text-red-500 opacity-0 shadow-sm transition hover:bg-red-500/10 group-hover:opacity-100"
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
                            <p className="col-span-full rounded-xl border border-dashed bg-card px-3 py-6 text-center text-sm text-muted-foreground">
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
                  <div className="rounded-2xl border bg-muted/60 p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold">
                      {t("groups.dialog.permissionsTitle")}
                    </p>
                        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                      {t("groups.dialog.permissionsDescription")}
                    </p>
                      </div>
                      <span className="inline-flex w-fit items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs font-medium text-foreground/80">
                        <Lock className="size-3.5" />
                        {isGroupOwner
                          ? t("groups.dialog.ownerControls")
                          : t("groups.dialog.ownerOnlyPermissions")}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-red-500/25 bg-red-50/60 p-4 sm:p-5 dark:bg-red-950/25">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-red-950 dark:text-red-200">
                          {isGroupOwner
                            ? t("groups.dialog.ownerLeaveTitle")
                            : t("groups.dialog.leaveServerTitle")}
                        </p>
                        <p className="mt-1 max-w-2xl text-sm text-red-900/70 dark:text-red-300/75">
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
                      const canModerateTarget =
                        canManage &&
                        !isOwnerMember &&
                        member.user_id !== userId &&
                        (isGroupOwner || !isAdminMember);

                      return (
                        <div
                          key={member.user_id}
                          className="flex flex-col gap-3 rounded-2xl border bg-card p-4 text-card-foreground shadow-sm sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <UserAvatar
                              avatarUrl={profile?.avatar_url}
                              username={username}
                              equippedRewards={profile?.equipped_rewards}
                              className="size-11"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground">
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
                            <span className="inline-flex w-fit rounded-full border bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                              {getGroupRoleLabel(member.role, t)}
                            </span>
                          )}
                          {canModerateTarget ? (
                            <div className="flex flex-wrap gap-2 sm:justify-end">
                              <AlertDialog>
                                <AlertDialogTrigger asChild><Button type="button" size="sm" variant="outline" disabled={moderatingMemberId === member.user_id}>Remove</Button></AlertDialogTrigger>
                                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove {username}?</AlertDialogTitle><AlertDialogDescription>They can join again later unless you ban them.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel><AlertDialogAction onClick={() => void moderateMember(member.user_id, "remove")}>Remove member</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                              </AlertDialog>
                              <AlertDialog>
                                <AlertDialogTrigger asChild><Button type="button" size="sm" variant="destructive" disabled={moderatingMemberId === member.user_id}>Ban</Button></AlertDialogTrigger>
                                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Ban {username}?</AlertDialogTitle><AlertDialogDescription>The member will be removed and cannot rejoin until a moderator lifts the ban.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => void moderateMember(member.user_id, "ban")}>Ban member</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                              </AlertDialog>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                  {workspace?.bans.length ? (
                    <div className="space-y-2 rounded-2xl border bg-muted/40 p-4">
                      <p className="text-sm font-semibold">Banned members</p>
                      {workspace.bans.map((ban) => <div key={ban.id} className="flex items-center justify-between gap-3 rounded-xl bg-card p-3"><div className="flex min-w-0 items-center gap-3"><UserAvatar avatarUrl={ban.profile?.avatar_url} username={ban.profile?.username || "user"} equippedRewards={ban.profile?.equipped_rewards} className="size-9" /><span className="truncate text-sm font-medium">{ban.profile?.username || ban.user_id}</span></div><Button type="button" size="sm" variant="outline" disabled={moderatingMemberId === ban.user_id} onClick={() => void moderateMember(ban.user_id, "unban")}>Unban</Button></div>)}
                    </div>
                  ) : null}
                  <div className="space-y-2 rounded-2xl border bg-muted/40 p-4">
                    <p className="text-sm font-semibold">Moderation log</p>
                    {workspace?.moderationLog.length ? workspace.moderationLog.slice(0, 30).map((entry) => <div key={entry.id} className="flex items-start justify-between gap-3 border-b py-2 last:border-0"><div><p className="text-sm"><span className="font-medium">{entry.actor?.username || "Moderator"}</span> · {entry.action.replaceAll("_", " ")}</p>{entry.target ? <p className="text-xs text-muted-foreground">{entry.target.username}</p> : null}</div><span className="shrink-0 text-[11px] text-muted-foreground">{entry.created_at ? new Date(entry.created_at).toLocaleDateString() : ""}</span></div>) : <p className="text-sm text-muted-foreground">No moderation actions yet.</p>}
                  </div>
                </TabsContent>
                ) : null}
              </div>
            </ScrollArea>
          </Tabs>

          <DialogFooter className="border-t bg-muted/60 px-5 pb-6 pt-4 sm:px-7 sm:pb-7">
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
