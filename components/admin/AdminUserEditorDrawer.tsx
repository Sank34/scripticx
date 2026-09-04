"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  ImageUp,
  Loader2,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";

import { UserAvatar } from "@/components/user/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { EquippedRewards } from "@/lib/rewards";

export type AdminManagedUser = {
  avatar_url: string | null;
  banned: boolean;
  banner_url?: string | null;
  bio: string | null;
  equipped_rewards?: EquippedRewards | null;
  id: string;
  pronouns: string | null;
  reward_points: number | null;
  role: string;
  total_score: number | null;
  username: string | null;
};

type AdminUserEditorDrawerProps = {
  actorId?: string | null;
  locale: string;
  onDelete: (user: AdminManagedUser) => void;
  onOpenChange: (open: boolean) => void;
  onSave: (userId: string, formData: FormData) => Promise<void>;
  open: boolean;
  saving: boolean;
  user: AdminManagedUser | null;
};

export function AdminUserEditorDrawer({
  actorId,
  locale,
  onDelete,
  onOpenChange,
  onSave,
  open,
  saving,
  user,
}: AdminUserEditorDrawerProps) {
  const ro = locale === "ro";
  const copy = ro
    ? {
        access: "Acces",
        avatar: "Imagine de profil",
        avatarHint: "PNG, JPEG sau WebP, maximum 5 MB.",
        avatarUrl: "URL imagine",
        banned: "Cont suspendat",
        bannedHint: "Blochează autentificarea și accesul la funcțiile protejate.",
        bio: "Descriere",
        cancel: "Anulează",
        delete: "Șterge utilizatorul",
        description: "Actualizează profilul, punctele și accesul utilizatorului.",
        profile: "Profil",
        pronouns: "Pronume",
        removeAvatar: "Elimină",
        rewardPoints: "Puncte disponibile",
        role: "Rol global",
        save: "Salvează modificările",
        totalScore: "Punctaj total",
        upload: "Încarcă imagine",
        username: "Username",
        viewProfile: "Vezi profilul public",
      }
    : {
        access: "Access",
        avatar: "Profile picture",
        avatarHint: "PNG, JPEG, or WebP, up to 5 MB.",
        avatarUrl: "Image URL",
        banned: "Account suspended",
        bannedHint: "Blocks sign-in and access to protected product features.",
        bio: "Bio",
        cancel: "Cancel",
        delete: "Delete user",
        description: "Update the user's profile, points, and platform access.",
        profile: "Profile",
        pronouns: "Pronouns",
        removeAvatar: "Remove",
        rewardPoints: "Available points",
        role: "Global role",
        save: "Save changes",
        totalScore: "Total score",
        upload: "Upload image",
        username: "Username",
        viewProfile: "View public profile",
      };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bio, setBio] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [role, setRole] = useState("user");
  const [banned, setBanned] = useState(false);
  const [totalScore, setTotalScore] = useState("0");
  const [rewardPoints, setRewardPoints] = useState("0");

  useEffect(() => {
    if (!user || !open) return;
    setUsername(user.username || "");
    setAvatarUrl(user.avatar_url || "");
    setAvatarPreview(user.avatar_url || null);
    setAvatarFile(null);
    setBio(user.bio || "");
    setPronouns(user.pronouns || "");
    setRole(user.role || "user");
    setBanned(Boolean(user.banned));
    setTotalScore(String(user.total_score || 0));
    setRewardPoints(String(user.reward_points || 0));
  }, [open, user]);

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  if (!user) return null;
  const userId = user.id;
  const isSelf = userId === actorId;

  function selectAvatar(file: File | undefined) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      toast.error(ro ? "Selectează o imagine PNG, JPEG sau WebP de maximum 5 MB." : "Select a PNG, JPEG, or WebP image up to 5 MB.");
      return;
    }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    setAvatarFile(file);
    setAvatarPreview(objectUrl);
  }

  function removeAvatar() {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    setAvatarFile(null);
    setAvatarUrl("");
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function submit() {
    const formData = new FormData();
    formData.set("username", username);
    formData.set("avatar_url", avatarUrl);
    formData.set("bio", bio);
    formData.set("pronouns", pronouns);
    formData.set("role", role);
    formData.set("banned", String(banned));
    formData.set("total_score", totalScore);
    formData.set("reward_points", rewardPoints);
    if (avatarFile) formData.set("avatar", avatarFile);
    await onSave(userId, formData);
  }

  return (
    <Drawer direction="right" open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="w-[94vw] sm:max-w-[560px]">
        <DrawerHeader className="border-b p-5">
          <div className="flex items-center gap-3">
            <UserAvatar
              avatarUrl={avatarPreview}
              username={username || user.username}
              equippedRewards={user.equipped_rewards}
              className="size-11"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <DrawerTitle className="truncate text-lg">{username || user.username || "User"}</DrawerTitle>
                {isSelf && <Badge variant="secondary">{ro ? "Tu" : "You"}</Badge>}
              </div>
              <DrawerDescription>{copy.description}</DrawerDescription>
            </div>
          </div>
        </DrawerHeader>

        <ScrollArea className="min-h-0 flex-1">
          <Tabs defaultValue="profile" className="p-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile"><UserRound />{copy.profile}</TabsTrigger>
              <TabsTrigger value="access"><ShieldCheck />{copy.access}</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6 pt-5">
              <section className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold">{copy.avatar}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{copy.avatarHint}</p>
                </div>
                <div className="flex items-center gap-4 rounded-[var(--sx-radius-card)] border p-4">
                  <UserAvatar
                    avatarUrl={avatarPreview}
                    username={username || user.username}
                    equippedRewards={user.equipped_rewards}
                    className="size-16"
                  />
                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={(event) => selectAvatar(event.target.files?.[0])}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      <ImageUp />{copy.upload}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={removeAvatar} disabled={!avatarPreview}>
                      {copy.removeAvatar}
                    </Button>
                  </div>
                </div>
                <label className="space-y-2 text-sm font-medium">
                  {copy.avatarUrl}
                  <Input
                    inputMode="url"
                    value={avatarUrl}
                    onChange={(event) => {
                      setAvatarUrl(event.target.value);
                      if (!avatarFile) setAvatarPreview(event.target.value || null);
                    }}
                    placeholder="https://…"
                  />
                </label>
              </section>

              <Separator />

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium sm:col-span-2">
                  {copy.username}
                  <Input value={username} onChange={(event) => setUsername(event.target.value)} maxLength={24} autoComplete="off" />
                </label>
                <label className="space-y-2 text-sm font-medium sm:col-span-2">
                  {copy.bio}
                  <Textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={500} className="min-h-28 resize-y" />
                  <span className="block text-right text-xs font-normal text-muted-foreground">{bio.length}/500</span>
                </label>
                <label className="space-y-2 text-sm font-medium sm:col-span-2">
                  {copy.pronouns}
                  <Input value={pronouns} onChange={(event) => setPronouns(event.target.value)} maxLength={40} />
                </label>
              </div>
            </TabsContent>

            <TabsContent value="access" className="space-y-6 pt-5">
              <section className="space-y-4">
                <label className="space-y-2 text-sm font-medium">
                  {copy.role}
                  <Select value={role} onValueChange={setRole} disabled={isSelf}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
                <div className="flex items-start justify-between gap-4 rounded-[var(--sx-radius-card)] border p-4">
                  <div>
                    <p className="text-sm font-medium">{copy.banned}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{copy.bannedHint}</p>
                  </div>
                  <Switch checked={banned} onCheckedChange={setBanned} disabled={isSelf} aria-label={copy.banned} />
                </div>
              </section>

              <Separator />

              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <WalletCards className="size-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">{ro ? "Puncte" : "Points"}</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium">
                    {copy.totalScore}
                    <Input type="number" min={0} step={1} value={totalScore} onChange={(event) => setTotalScore(event.target.value)} />
                  </label>
                  <label className="space-y-2 text-sm font-medium">
                    {copy.rewardPoints}
                    <Input type="number" min={0} step={1} value={rewardPoints} onChange={(event) => setRewardPoints(event.target.value)} />
                  </label>
                </div>
              </section>

              <Separator />

              <section className="space-y-3">
                <div className="rounded-[var(--sx-radius-card)] bg-muted/45 p-4">
                  <p className="text-xs font-medium text-muted-foreground">User ID</p>
                  <p className="mt-1 break-all font-mono text-xs">{user.id}</p>
                </div>
                {user.username && (
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/u/${user.username}`} target="_blank"><ExternalLink />{copy.viewProfile}</Link>
                  </Button>
                )}
              </section>
            </TabsContent>
          </Tabs>
        </ScrollArea>

        <DrawerFooter className="border-t bg-background px-5 py-4">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onDelete(user)} disabled={isSelf || saving}>
              <Trash2 />{copy.delete}
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>{copy.cancel}</Button>
              <Button type="button" onClick={() => void submit()} disabled={!username.trim() || saving}>
                {saving ? <Loader2 className="animate-spin" /> : <Save />}{copy.save}
              </Button>
            </div>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
