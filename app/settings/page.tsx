"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import RouteGuard from "@/components/RouteGuard";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ImagePlus,
  Link2,
  LoaderCircle,
  LockKeyhole,
  Save,
  UserRound,
} from "lucide-react";

import { UserAvatar } from "@/components/user/UserAvatar";
import { EmailPreferencesCard } from "@/components/settings/EmailPreferencesCard";
import type { EquippedRewards } from "@/lib/rewards";
import {
  MAX_PROFILE_PRONOUNS_LENGTH,
  normalizeProfilePronouns,
} from "@/lib/profile-pronouns";
import {
  DEFAULT_PUBLIC_PROFILE_VISIBILITY,
  PUBLIC_PROFILE_WIDGET_KEYS,
  normalizePublicProfileVisibility,
  type PublicProfileVisibility,
  type PublicProfileWidgetKey,
} from "@/lib/profile-visibility";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/common/PageHeader";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import Cropper from "react-easy-crop";
import { useLanguage } from "@/components/LanguageProvider";
import { translations } from "@/lib/i18n";

function normalizeUrl(url: string) {
  if (!url) return "";
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return "https://" + url;
  }
  return url;
}

function PublicProfileVisibilityRow({
  widgetKey,
  checked,
  title,
  description,
  onCheckedChange,
}: {
  widgetKey: PublicProfileWidgetKey;
  checked: boolean;
  title: string;
  description: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  const id = `public-profile-${widgetKey}`;

  return (
    <div className="flex items-center gap-4 py-4">
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <span className="block text-sm font-medium">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
          {description}
        </span>
      </label>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={title}
      />
    </div>
  );
}

function SettingsContent() {
  const { user, profile } = useAuth();
  const hydratedUserId = useRef<string | null>(null);

  const { locale } = useLanguage();

  const t = (key: string) => {
    const keys = key.split(".");
    let value: any = translations[locale];
    for (const k of keys) value = value?.[k];

    if (value) return value;

    let fallback: any = translations["en"];
    for (const k of keys) fallback = fallback?.[k];

    return fallback || key;
  };

  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [equippedRewards, setEquippedRewards] = useState<EquippedRewards>({});

  const [bio, setBio] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [github, setGithub] = useState("");
  const [twitter, setTwitter] = useState("");
  const [website, setWebsite] = useState("");
  const [publicProfileVisibility, setPublicProfileVisibility] =
    useState<PublicProfileVisibility>(DEFAULT_PUBLIC_PROFILE_VISIBILITY);

  const [fileName, setFileName] = useState("");
  const [bannerFileName, setBannerFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [cropOpen, setCropOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<"avatar" | "banner">("avatar");

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  useEffect(() => {
    if (!user || !profile || hydratedUserId.current === user.id) return;
    const data = profile as typeof profile & {
      bio?: string | null;
      pronouns?: string | null;
      github?: string | null;
      twitter?: string | null;
      website?: string | null;
      public_profile_visibility?: unknown;
    };

      if (data.username) setUsername(data.username);
      if (data.bio) setBio(data.bio);
      setPronouns(data.pronouns || "");
      if (data.github) setGithub(data.github);
      if (data.twitter) setTwitter(data.twitter);
      if (data.website) setWebsite(data.website);
      setPublicProfileVisibility(
        normalizePublicProfileVisibility(data.public_profile_visibility)
      );

      const validAvatar =
        data.avatar_url && data.avatar_url.startsWith("http");
      const validBanner =
        data.banner_url && data.banner_url.startsWith("http");

      setAvatar(validAvatar ? data.avatar_url ?? null : null);
      setBanner(validBanner ? data.banner_url ?? null : null);
      setEquippedRewards((data.equipped_rewards || {}) as EquippedRewards);
      hydratedUserId.current = user.id;
  }, [profile, user]);

  const onCropComplete = useCallback((_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  async function getCroppedImg(imageSrc: string, crop: any, rotation = 0) {
    const image = new Image();
    image.src = imageSrc;

    await new Promise((resolve) => (image.onload = resolve));

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;

    const radians = (rotation * Math.PI) / 180;
    const cos = Math.abs(Math.cos(radians));
    const sin = Math.abs(Math.sin(radians));
    const newWidth = image.width * cos + image.height * sin;
    const newHeight = image.width * sin + image.height * cos;

    canvas.width = newWidth;
    canvas.height = newHeight;

    ctx.translate(newWidth / 2, newHeight / 2);
    ctx.rotate(radians);
    ctx.drawImage(image, -image.width / 2, -image.height / 2);

    const data = ctx.getImageData(
      crop.x,
      crop.y,
      crop.width,
      crop.height
    );

    canvas.width = crop.width;
    canvas.height = crop.height;

    ctx.putImageData(data, 0, 0);

    return new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), "image/png");
    });
  }

  function handleSelectImage(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      toast.error(t("settings.banner.invalid"));
      return;
    }

    setFileName(file.name);
    const url = URL.createObjectURL(file);
    setCropTarget("avatar");
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setSelectedImage(url);
    setCropOpen(true);
  }

  function handleSelectBanner(e: any) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      toast.error(t("settings.banner.invalid"));
      return;
    }

    setBannerFileName(file.name);
    const url = URL.createObjectURL(file);
    setCropTarget("banner");
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setSelectedImage(url);
    setCropOpen(true);
  }

  async function uploadCroppedBanner(blob: Blob) {
    if (!user) return;

    setUploadingBanner(true);

    const file = new File([blob], "banner.png", { type: "image/png" });
    const fileNameFinal = `${user.id}/banners/${Date.now()}.png`;

    const { error } = await supabase.storage
      .from("avatars")
      .upload(fileNameFinal, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: "image/png",
      });

    if (error) {
      toast.error(error.message);
      setUploadingBanner(false);
      return;
    }

    const { data } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileNameFinal);

    const publicUrl = data.publicUrl;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ banner_url: publicUrl })
      .eq("id", user.id);

    if (updateError) {
      toast.error(updateError.message);
      setUploadingBanner(false);
      return;
    }

    setBanner(publicUrl);
    window.dispatchEvent(new Event("profile-updated"));
    toast.success(t("settings.banner.updated"));
    setUploadingBanner(false);
    setCropOpen(false);
  }

  async function handleSaveCropped() {
    if (!selectedImage || !croppedAreaPixels || !user) return;

    const blob = await getCroppedImg(
      selectedImage,
      croppedAreaPixels,
      rotation
    );

    if (cropTarget === "banner") {
      await uploadCroppedBanner(blob);
      return;
    }

    setUploading(true);

    const file = new File([blob], "avatar.png", { type: "image/png" });
    const fileNameFinal = `${user.id}/${Date.now()}.png`;

    const { error } = await supabase.storage
      .from("avatars")
      .upload(fileNameFinal, file, { upsert: true });

    if (error) {
      toast.error(error.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileNameFinal);

    const publicUrl = data.publicUrl;

    await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);

    setAvatar(publicUrl);
    window.dispatchEvent(new Event("profile-updated"));

    setCropOpen(false);
    setUploading(false);

    toast.success(t("settings.avatar.updated"));
  }

  async function removeAvatar() {
    if (!user) return;

    setUploading(true);

    const { data: files } = await supabase.storage
      .from("avatars")
      .list(user.id);

    if (files?.length) {
      const paths = files.map((f) => `${user.id}/${f.name}`);
      await supabase.storage.from("avatars").remove(paths);
    }

    await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", user.id);

    setAvatar(null);
    setFileName("");

    window.dispatchEvent(new Event("profile-updated"));

    setUploading(false);
    toast.success(t("settings.avatar.removed"));
  }

  async function removeBanner() {
    if (!user) return;

    setUploadingBanner(true);

    const { error } = await supabase
      .from("profiles")
      .update({ banner_url: null })
      .eq("id", user.id);

    if (error) {
      toast.error(error.message);
      setUploadingBanner(false);
      return;
    }

    setBanner(null);
    setBannerFileName("");
    window.dispatchEvent(new Event("profile-updated"));
    setUploadingBanner(false);
    toast.success(t("settings.banner.removed"));
  }

  async function updateProfile() {
    if (!user || savingProfile) return;

    setSavingProfile(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        username,
        bio,
        pronouns: normalizeProfilePronouns(pronouns),
        github: normalizeUrl(github),
        twitter: normalizeUrl(twitter),
        website: normalizeUrl(website),
        public_profile_visibility: publicProfileVisibility,
      })
      .eq("id", user.id);

    if (error) {
      toast.error(error.message);
      setSavingProfile(false);
      return;
    }

    window.dispatchEvent(new Event("profile-updated"));
    toast.success(t("settings.toast.profileUpdated"));
    setSavingProfile(false);
  }

  async function updatePassword() {
    if (!password || savingPassword) return;

    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error(error.message);
      setSavingPassword(false);
      return;
    }

    toast.success(t("settings.toast.passwordUpdated"));
    setPassword("");
    setSavingPassword(false);
  }

  if (!user) return null;

  const initial = (username || user.email || "U")[0]?.toUpperCase();

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        className="mb-8 border-b border-border/70 pb-5"
        title={t("settings.title")}
        subtitle={
          locale === "ro"
            ? "Personalizează profilul, notificările și securitatea contului tău."
            : "Personalize your profile, notifications, and account security."
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <main className="min-w-0 space-y-6">
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>{t("settings.profile")}</CardTitle>
          <CardDescription>
            {locale === "ro"
              ? "Alege imaginea și coperta care te reprezintă."
              : "Choose the avatar and cover that represent you."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="overflow-hidden rounded-2xl border bg-muted/40">
            <div
              className="relative h-36 bg-zinc-950 bg-cover bg-center"
              style={
                banner
                  ? {
                      backgroundImage: `url("${banner}")`,
                    }
                  : undefined
              }
            >
              {!banner && (
                <div className="absolute inset-0 bg-black/10" />
              )}
              <div className={banner ? "sr-only" : "absolute bottom-4 left-4 text-white"}>
                <p className="text-sm font-semibold">
                  {t("settings.banner.title")}
                </p>
                <p className="max-w-md text-xs text-white/75">
                  {t("settings.banner.description")}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <p className="text-xs text-muted-foreground">
                {bannerFileName || t("settings.banner.noFile")}
              </p>
              <div className="flex items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm transition hover:bg-muted/80">
                  <ImagePlus className="size-4" />
                  {uploadingBanner
                    ? t("settings.banner.uploading")
                    : t("settings.banner.upload")}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleSelectBanner}
                    className="hidden"
                    disabled={uploadingBanner}
                  />
                </label>

                {banner && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={removeBanner}
                    disabled={uploadingBanner}
                  >
                    {t("settings.banner.remove")}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <UserAvatar
              avatarUrl={avatar}
              username={username || initial}
              equippedRewards={equippedRewards}
              className="w-16 h-16"
            />

            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <label className="px-3 py-2 bg-muted rounded-md cursor-pointer text-sm has-[:disabled]:pointer-events-none has-[:disabled]:opacity-60">
                  {uploading ? "..." : t("settings.upload")}
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleSelectImage} className="hidden" disabled={uploading} />
                </label>

                {avatar && (
                  <Button size="sm" variant="destructive" onClick={removeAvatar} disabled={uploading}>
                    {t("settings.remove")}
                  </Button>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                {fileName || t("settings.noFile")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card id="profile-settings" className="scroll-mt-24">
        <CardHeader>
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UserRound className="size-4" />
          </div>
          <CardTitle>{t("settings.account")}</CardTitle>
          <CardDescription>
            {locale === "ro"
              ? "Informațiile principale afișate în contul și profilul tău."
              : "The main information shown on your account and profile."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-7">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="profile-email" className="text-sm font-medium">
                {t("settings.email")}
              </label>
              <Input id="profile-email" value={user.email || ""} disabled />
            </div>

            <div className="space-y-2">
              <label htmlFor="profile-username" className="text-sm font-medium">
                {t("settings.username")}
              </label>
              <Input
                id="profile-username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder={t("settings.username")}
                autoComplete="username"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="profile-bio" className="text-sm font-medium">
                {t("settings.bio")}
              </label>
              <Textarea
                id="profile-bio"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                placeholder={t("settings.bio")}
                className="min-h-24 resize-y"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
            <label htmlFor="profile-pronouns" className="text-sm font-medium">
              {t("settings.pronouns")}
            </label>
            <Input
              id="profile-pronouns"
              value={pronouns}
              onChange={(event) => setPronouns(event.target.value)}
              placeholder={t("settings.pronounsPlaceholder")}
              maxLength={MAX_PROFILE_PRONOUNS_LENGTH}
              autoComplete="off"
              className="scroll-mt-24"
              aria-describedby="profile-pronouns-hint"
            />
            <div
              id="profile-pronouns-hint"
              className="flex items-start justify-between gap-4 text-xs text-muted-foreground"
            >
              <span>{t("settings.pronounsHint")}</span>
              <span className="shrink-0 tabular-nums">
                {Array.from(pronouns).length}/{MAX_PROFILE_PRONOUNS_LENGTH}
              </span>
            </div>
            </div>
          </div>

          <section aria-labelledby="social-links-title" className="space-y-4">
            <div className="flex items-center gap-2">
              <Link2 className="size-4 text-muted-foreground" />
              <h2 id="social-links-title" className="text-sm font-semibold">
                {t("settings.social")}
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="profile-github" className="text-sm font-medium">
                  {t("settings.github")}
                </label>
                <Input
                  id="profile-github"
                  type="url"
                  value={github}
                  onChange={(event) => setGithub(event.target.value)}
                  placeholder="github.com/username"
                  autoComplete="url"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="profile-twitter" className="text-sm font-medium">
                  {t("settings.twitter")}
                </label>
                <Input
                  id="profile-twitter"
                  type="url"
                  value={twitter}
                  onChange={(event) => setTwitter(event.target.value)}
                  placeholder="x.com/username"
                  autoComplete="url"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label htmlFor="profile-website" className="text-sm font-medium">
                  {t("settings.website")}
                </label>
                <Input
                  id="profile-website"
                  type="url"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                  placeholder="https://example.com"
                  autoComplete="url"
                />
              </div>
            </div>
          </section>

          <hr className="border-border/70" />

          <section
            id="public-profile-settings"
            aria-labelledby="public-profile-title"
            className="scroll-mt-24"
          >
            <div className="mb-1">
              <h2 id="public-profile-title" className="font-semibold">
                {t("settings.publicProfile.title")}
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {t("settings.publicProfile.description")}
              </p>
            </div>
            <div className="divide-y">
              {PUBLIC_PROFILE_WIDGET_KEYS.map((key) => (
                <PublicProfileVisibilityRow
                  key={key}
                  widgetKey={key}
                  checked={publicProfileVisibility[key]}
                  title={t(`settings.publicProfile.items.${key}.title`)}
                  description={t(`settings.publicProfile.items.${key}.description`)}
                  onCheckedChange={(checked) =>
                    setPublicProfileVisibility((current) => ({
                      ...current,
                      [key]: checked,
                    }))
                  }
                />
              ))}
            </div>
          </section>

          <div className="flex justify-end border-t pt-5">
            <Button onClick={updateProfile} disabled={savingProfile}>
              {savingProfile ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {savingProfile
                ? locale === "ro"
                  ? "Se salvează..."
                  : "Saving..."
                : t("settings.saveProfile")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div id="email-preferences" className="scroll-mt-24">
        <EmailPreferencesCard />
      </div>
        </main>

        <aside className="lg:sticky lg:top-24">
      <Card id="account-security" className="scroll-mt-24">
        <CardHeader>
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <LockKeyhole className="size-4" />
          </div>
          <CardTitle>{t("settings.security")}</CardTitle>
          <CardDescription>
            {locale === "ro"
              ? "Folosește o parolă unică, pe care nu o utilizezi în altă parte."
              : "Use a unique password that you do not use anywhere else."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="new-password" className="text-sm font-medium">
              {locale === "ro" ? "Parolă nouă" : "New password"}
            </label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={locale === "ro" ? "Parolă nouă" : "New password"}
              autoComplete="new-password"
              minLength={8}
            />
          </div>
          <Button
            onClick={updatePassword}
            disabled={!password || savingPassword}
            className="w-full"
          >
            {savingPassword && <LoaderCircle className="size-4 animate-spin" />}
            {savingPassword
              ? locale === "ro"
                ? "Se actualizează..."
                : "Updating..."
              : t("settings.updatePassword")}
          </Button>
        </CardContent>
      </Card>
        </aside>
      </div>

      <Dialog open={cropOpen} onOpenChange={setCropOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {cropTarget === "banner"
                ? t("settings.banner.edit")
                : t("settings.avatar.edit")}
            </DialogTitle>
          </DialogHeader>

          <div className="relative h-[300px] w-full bg-black">
            {selectedImage && (
              <Cropper
                image={selectedImage}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={cropTarget === "banner" ? 4 : 1}
                cropShape={cropTarget === "banner" ? "rect" : "round"}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={onCropComplete}
              />
            )}
          </div>

          <DialogFooter>
            <Button onClick={handleSaveCropped}>
              {cropTarget === "banner"
                ? t("settings.banner.save")
                : t("settings.avatar.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default function SettingsPage() {
  return (
    <RouteGuard requireAuth>
      <SettingsContent />
    </RouteGuard>
  );
}
