"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { AuthGuard } from "@/components/AuthGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { Slider } from "@/components/ui/slider";

import Cropper from "react-easy-crop";

function SettingsContent({ user }: any) {
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loadingUsername, setLoadingUsername] = useState(true);

  const [cropOpen, setCropOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  useEffect(() => {
    async function loadProfile() {
      const { data } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (data?.username) setUsername(data.username);

      const validAvatar =
        data?.avatar_url &&
        data.avatar_url.startsWith("http");

      setAvatar(validAvatar ? data.avatar_url : null);
      setLoadingUsername(false);
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

        // 🔥 calc bounding box după rotație
        const cos = Math.abs(Math.cos(radians));
        const sin = Math.abs(Math.sin(radians));
        const newWidth = image.width * cos + image.height * sin;
        const newHeight = image.width * sin + image.height * cos;

        canvas.width = newWidth;
        canvas.height = newHeight;

        // 🔥 centru + rotație
        ctx.translate(newWidth / 2, newHeight / 2);
        ctx.rotate(radians);
        ctx.drawImage(image, -image.width / 2, -image.height / 2);

        // 🔥 crop final
        const data = ctx.getImageData(
            crop.x,
            crop.y,
            crop.width,
            crop.height
        );

        // 🔥 resize la dimensiune finală
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
    if (!selectedImage || !croppedAreaPixels) return;

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

  async function updateUsername() {
    const { error } = await supabase
      .from("profiles")
      .update({ username })
      .eq("id", user.id);

    if (error) return toast.error(error.message);

    window.dispatchEvent(new Event("profile-updated"));
    toast.success("Username updated");
  }

  async function updatePassword() {
    const { error } = await supabase.auth.updateUser({ password });

    if (error) return toast.error(error.message);

    toast.success("Password updated");
    setPassword("");
  }

  const initial = (username || user.email || "U")[0]?.toUpperCase();

  return (
    <div className="p-6 max-w-md mx-auto space-y-6">

      <h1 className="text-2xl font-bold">Settings</h1>

      {/* AVATAR */}
      <Avatar className="w-16 h-16">
        {avatar && <AvatarImage src={avatar} />}
        <AvatarFallback>{initial}</AvatarFallback>
      </Avatar>

      <div className="flex items-center gap-3">
        <label className="px-3 py-2 bg-muted rounded-md cursor-pointer">
          Choose file
          <input
            type="file"
            accept="image/*"
            onChange={handleSelectImage}
            className="hidden"
          />
        </label>

        <span className="text-sm text-muted-foreground">
          {fileName || "No file chosen"}
        </span>
      </div>

      {avatar && (
        <Button variant="destructive" onClick={removeAvatar}>
          Remove avatar
        </Button>
      )}

      {/* EMAIL */}
      <Input value={user.email} disabled />

      {/* USERNAME */}
      <Input value={username} onChange={(e) => setUsername(e.target.value)} />
      <Button onClick={updateUsername}>Save Username</Button>

      {/* PASSWORD */}
      <Input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button onClick={updatePassword}>Update Password</Button>

      {/* MODAL */}
      <Dialog open={cropOpen} onOpenChange={setCropOpen}>
        <DialogContent className="max-w-lg">

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

          {/* SLIDERS */}
          <div className="space-y-4">

            <div>
              <div className="flex justify-between text-sm">
                <span>Zoom</span>
                <span className="text-muted-foreground">
                  {Math.round(zoom * 100)}%
                </span>
              </div>

              <Slider
                min={1}
                max={3}
                step={0.1}
                value={[zoom]}
                onValueChange={(v) => setZoom(v[0])}
              />
            </div>

            <div>
              <div className="flex justify-between text-sm">
                <span>Rotation</span>
                <span className="text-muted-foreground">
                  {rotation}°
                </span>
              </div>

              <Slider
                min={0}
                max={360}
                step={1}
                value={[rotation]}
                onValueChange={(v) => setRotation(v[0])}
              />
            </div>

          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCropOpen(false)}>
              Cancel
            </Button>

            <Button onClick={handleSaveCropped} disabled={uploading}>
              {uploading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>

    </div>
  );
}

export default function SettingsPage() {
  return (
    <AuthGuard>
      {(user: any) => <SettingsContent user={user} />}
    </AuthGuard>
  );
}