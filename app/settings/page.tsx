"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import RouteGuard from "@/components/RouteGuard";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";

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

import { Slider } from "@/components/ui/slider";
import Cropper from "react-easy-crop";

function normalizeUrl(url: string) {
  if (!url) return "";
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return "https://" + url;
  }
  return url;
}

function SettingsContent() {
  const { user } = useAuth();

  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);

  const [bio, setBio] = useState("");
  const [github, setGithub] = useState("");
  const [twitter, setTwitter] = useState("");
  const [website, setWebsite] = useState("");

  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);

  const [cropOpen, setCropOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  useEffect(() => {
    if (!user) return;

    async function loadProfile() {
      const { data } = await supabase
        .from("profiles")
        .select("username, avatar_url, bio, github, twitter, website")
        .eq("id", user.id)
        .maybeSingle();

      if (data?.username) setUsername(data.username);
      if (data?.bio) setBio(data.bio);
      if (data?.github) setGithub(data.github);
      if (data?.twitter) setTwitter(data.twitter);
      if (data?.website) setWebsite(data.website);

      const validAvatar =
        data?.avatar_url && data.avatar_url.startsWith("http");

      setAvatar(validAvatar ? data.avatar_url : null);
    }

    loadProfile();
  }, [user]);

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

    setFileName(file.name);
    const url = URL.createObjectURL(file);
    setSelectedImage(url);
    setCropOpen(true);
  }

  async function handleSaveCropped() {
    if (!selectedImage || !croppedAreaPixels || !user) return;

    setUploading(true);

    const blob = await getCroppedImg(
      selectedImage,
      croppedAreaPixels,
      rotation
    );

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

    toast.success("Avatar updated");
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
    toast.success("Avatar removed");
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
    toast.success("Profile updated");
  }

  async function updatePassword() {
    const { error } = await supabase.auth.updateUser({ password });

    if (error) return toast.error(error.message);

    toast.success("Password updated");
    setPassword("");
  }

  if (!user) return null;

  const initial = (username || user.email || "U")[0]?.toUpperCase();

  return (
    <div className="p-6 max-w-3xl space-y-6">

      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-6">

          <Avatar className="w-16 h-16">
            {avatar && <AvatarImage src={avatar} />}
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>

          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <label className="px-3 py-2 bg-muted rounded-md cursor-pointer text-sm">
                Upload
                <input type="file" accept="image/*" onChange={handleSelectImage} className="hidden" />
              </label>

              {avatar && (
                <Button size="sm" variant="destructive" onClick={removeAvatar}>
                  Remove
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              {fileName || "No file selected"}
            </p>
          </div>

        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input value={user.email} disabled />
          <Input value={username} onChange={(e) => setUsername(e.target.value)} />
          <Input value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Bio" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Social Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input value={github} onChange={(e) => setGithub(e.target.value)} />
          <Input value={twitter} onChange={(e) => setTwitter(e.target.value)} />
          <Input value={website} onChange={(e) => setWebsite(e.target.value)} />
          <Button onClick={updateProfile}>Save Changes</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button onClick={updatePassword}>Update Password</Button>
        </CardContent>
      </Card>

      <Dialog open={cropOpen} onOpenChange={setCropOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Avatar</DialogTitle>
          </DialogHeader>

          <div className="relative h-[300px] w-full bg-black">
            {selectedImage && (
              <Cropper
                image={selectedImage}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={1}
                cropShape="round"
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={onCropComplete}
              />
            )}
          </div>

          <DialogFooter>
            <Button onClick={handleSaveCropped}>
              Save
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