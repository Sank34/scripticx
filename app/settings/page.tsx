"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import RouteGuard from "@/components/RouteGuard";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ImagePlus } from "lucide-react";

import { UserAvatar } from "@/components/user/UserAvatar";
import type { EquippedRewards } from "@/lib/rewards";

import {
  Card,
  CardContent,
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
  const [github, setGithub] = useState("");
  const [twitter, setTwitter] = useState("");
  const [website, setWebsite] = useState("");

  const [fileName, setFileName] = useState("");
  const [bannerFileName, setBannerFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

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
      github?: string | null;
      twitter?: string | null;
      website?: string | null;
    };

      if (data.username) setUsername(data.username);
      if (data.bio) setBio(data.bio);
      if (data.github) setGithub(data.github);
      if (data.twitter) setTwitter(data.twitter);
      if (data.website) setWebsite(data.website);

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
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        username,
        bio,
        github: normalizeUrl(github),
        twitter: normalizeUrl(twitter),
        website: normalizeUrl(website),
      })
      .eq("id", user.id);

    if (error) return toast.error(error.message);

    window.dispatchEvent(new Event("profile-updated"));
    toast.success(t("settings.toast.profileUpdated"));
  }

  async function updatePassword() {
    const { error } = await supabase.auth.updateUser({ password });

    if (error) return toast.error(error.message);

    toast.success(t("settings.toast.passwordUpdated"));
    setPassword("");
  }

  if (!user) return null;

  const initial = (username || user.email || "U")[0]?.toUpperCase();

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">

      <h1 className="text-2xl font-bold">{t("settings.title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.profile")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="overflow-hidden rounded-2xl border bg-muted/40">
            <div
              className="relative h-36 bg-gradient-to-br from-zinc-950 via-zinc-800 to-emerald-400 bg-cover bg-center"
              style={
                banner
                  ? {
                      backgroundImage: `url("${banner}")`,
                    }
                  : undefined
              }
            >
              {!banner && (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(255,255,255,0.28),transparent_28%)]" />
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

          <div className="flex items-center gap-6">
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

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.account")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input value={user.email} disabled />
          <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t("settings.username")} />
          <Input value={bio} onChange={(e) => setBio(e.target.value)} placeholder={t("settings.bio")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.social")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input value={github} onChange={(e) => setGithub(e.target.value)} placeholder={t("settings.github")} />
          <Input value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder={t("settings.twitter")}/>
          <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder={t("settings.website")} autoComplete="off"/>
          
        </CardContent>
      </Card>
      <Button onClick={updateProfile}>{t("settings.saveProfile")}</Button>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.security")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* TODO: Set the translation for the placeholder */}
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" />
        </CardContent>
      </Card>
      <Button onClick={updatePassword}>{t("settings.updatePassword")}</Button>

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
