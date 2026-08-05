"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import {
  CircleDashed,
  ImageIcon,
  Palette,
  Repeat2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { RewardProductPreview } from "@/components/rewards/RewardProductPreview";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  type RewardBackgroundMode,
  type RewardCategory,
  type RewardProduct,
  type RewardRarity,
  type RewardStyleConfig,
} from "@/lib/rewards";
import { uploadRewardAsset } from "@/lib/rewardsData";
import { cn } from "@/lib/utils";

const CATEGORIES: RewardCategory[] = [
  "avatar-frame",
  "avatar-decoration",
  "profile-background",
  "profile-title",
];

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function visualForCategory(category: RewardCategory): RewardProduct["visual"] {
  if (category === "profile-background") return "custom-background";
  if (category === "profile-title") return "title";
  return "custom-overlay";
}

function emptyProduct(): RewardProduct {
  return {
    id: "",
    category: "avatar-decoration",
    name: { en: "", ro: "" },
    description: { en: "", ro: "" },
    price: 300,
    rarity: "common",
    visual: "custom-overlay",
    active: true,
    sort_order: 100,
    styleConfig: {
      assetScale: 145,
      assetOffsetX: 0,
      assetOffsetY: 0,
      backgroundColor: "#f3f7f1",
      backgroundMode: "pattern",
      imageOpacity: 1,
      patternOpacity: 0.08,
      patternSize: 96,
    },
  };
}

function AssetGuide({
  category,
  locale,
}: {
  category: "avatar-decoration" | "avatar-frame";
  locale: "en" | "ro";
}) {
  const isFrame = category === "avatar-frame";
  const copy = locale === "ro"
    ? {
        canvas: "Canvas 512 × 512 px",
        safe: isFrame ? "Gol central: min. 340 px" : "Zonă avatar: 320 px",
        hint: isFrame
          ? "Păstrează complet transparent cercul central. Rama trebuie desenată în exteriorul lui."
          : "Fața și centrul avatarului trebuie să rămână lizibile. Desenează decorul în jurul cercului sau doar parțial peste margine.",
        format: "PNG/WebP transparent sau SVG cu viewBox 0 0 512 512. Maximum 5 MB; recomandat sub 1 MB.",
      }
    : {
        canvas: "512 × 512 px canvas",
        safe: isFrame ? "Center opening: min. 340 px" : "Avatar safe zone: 320 px",
        hint: isFrame
          ? "Keep the center circle fully transparent. Draw the frame outside it."
          : "Keep the face and avatar center readable. Place decoration around the circle or only slightly over its edge.",
        format: "Transparent PNG/WebP or SVG with viewBox 0 0 512 512. Maximum 5 MB; under 1 MB recommended.",
      };

  return (
    <div className="grid gap-4 rounded-xl border bg-zinc-50 p-4 sm:grid-cols-[150px_1fr] sm:items-center">
      <div className="relative mx-auto aspect-square w-[140px] rounded-xl border-2 border-dashed border-zinc-300 bg-[linear-gradient(45deg,#eee_25%,transparent_25%),linear-gradient(-45deg,#eee_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#eee_75%),linear-gradient(-45deg,transparent_75%,#eee_75%)] bg-[length:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0px]">
        <div
          className={cn(
            "absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-dashed bg-white/90 text-center text-[10px] leading-tight text-zinc-500",
            isFrame ? "size-[66%]" : "size-[62.5%]"
          )}
        >
          {isFrame ? "340 px" : "320 px"}
        </div>
        <span className="absolute bottom-1.5 right-2 text-[9px] font-medium text-zinc-500">512 px</span>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CircleDashed className="size-4" />
          {copy.canvas} · {copy.safe}
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{copy.hint}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{copy.format}</p>
      </div>
    </div>
  );
}

export function ShopItemEditorDialog({
  locale,
  onOpenChange,
  onSave,
  open,
  previewAvatarUrl,
  previewUsername,
  product,
}: {
  locale: "en" | "ro";
  onOpenChange: (open: boolean) => void;
  onSave: (product: RewardProduct, isNew: boolean) => Promise<void>;
  open: boolean;
  previewAvatarUrl?: string | null;
  previewUsername?: string | null;
  product: RewardProduct | null;
}) {
  const isNew = !product;
  const [draft, setDraft] = useState<RewardProduct>(emptyProduct);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"asset" | "pattern" | null>(null);
  const [idTouched, setIdTouched] = useState(false);

  const copy = locale === "ro"
    ? {
        create: "Creează item",
        edit: "Editează item",
        subtitle: "Configurează produsul, asset-ul și felul în care va apărea pe platformă.",
        identity: "Identitate și preț",
        design: "Design și asset",
        preview: "Preview live",
        nameRo: "Nume în română",
        nameEn: "Nume în engleză",
        descriptionRo: "Descriere în română",
        descriptionEn: "Descriere în engleză",
        key: "Cheie unică",
        keyHint: "Nu mai poate fi schimbată după creare.",
        category: "Categorie",
        rarity: "Raritate",
        price: "Preț în puncte",
        order: "Ordine în shop",
        active: "Vizibil în shop",
        upload: "Încarcă asset",
        replace: "Înlocuiește asset-ul",
        uploaded: "Asset încărcat.",
        uploadFailed: "Asset-ul nu a putut fi încărcat.",
        uploadRules: "Sunt acceptate PNG, WebP, JPG și SVG fără scripturi sau resurse externe.",
        scale: "Mărime asset",
        horizontal: "Poziție orizontală",
        vertical: "Poziție verticală",
        backgroundMode: "Tip background",
        pattern: "Pattern repetat",
        image: "Imagine completă",
        color: "Culoare de fundal",
        patternIcon: "Icon repetat",
        patternSize: "Mărime icon",
        patternOpacity: "Opacitate pattern",
        imageOpacity: "Opacitate imagine",
        patternGuide: "Folosește un icon pătrat de 256 × 256 px, transparent, simplu și centrat. PNG/WebP sau SVG, maximum 5 MB.",
        imageGuide: "Folosește 1920 × 1200 px sau mai mare. Păstrează elementele importante spre margini; cardurile profilului acoperă centrul.",
        titleGuide: "Numele item-ului va fi afișat ca titlu sub username. Nu este necesar un asset.",
        required: "Completează cheia, numele în ambele limbi și un preț valid.",
        invalidKey: "Cheia poate conține litere mici, cifre și cratimă.",
        missingOverlay: "Încarcă un PNG/WebP/SVG pentru această decorație.",
        missingBackground: "Încarcă imaginea sau iconul care va forma pattern-ul.",
        saveFailed: "Item-ul nu a putut fi salvat.",
        cancel: "Anulează",
        save: "Salvează item-ul",
        categories: {
          "avatar-frame": "Ramă avatar",
          "avatar-decoration": "Decorație avatar",
          "profile-background": "Background profil",
          "profile-title": "Titlu profil",
        } as Record<RewardCategory, string>,
      }
    : {
        create: "Create item",
        edit: "Edit item",
        subtitle: "Configure the product, its asset, and how it appears across the platform.",
        identity: "Identity and price",
        design: "Design and asset",
        preview: "Live preview",
        nameRo: "Romanian name",
        nameEn: "English name",
        descriptionRo: "Romanian description",
        descriptionEn: "English description",
        key: "Unique key",
        keyHint: "It cannot be changed after creation.",
        category: "Category",
        rarity: "Rarity",
        price: "Price in points",
        order: "Shop order",
        active: "Visible in shop",
        upload: "Upload asset",
        replace: "Replace asset",
        uploaded: "Asset uploaded.",
        uploadFailed: "The asset could not be uploaded.",
        uploadRules: "PNG, WebP, JPG and SVG without scripts or external resources are accepted.",
        scale: "Asset size",
        horizontal: "Horizontal position",
        vertical: "Vertical position",
        backgroundMode: "Background type",
        pattern: "Repeating pattern",
        image: "Full image",
        color: "Background color",
        patternIcon: "Repeating icon",
        patternSize: "Icon size",
        patternOpacity: "Pattern opacity",
        imageOpacity: "Image opacity",
        patternGuide: "Use a square 256 × 256 px transparent, simple and centered icon. PNG/WebP or SVG, maximum 5 MB.",
        imageGuide: "Use 1920 × 1200 px or larger. Keep important artwork near the edges because profile cards cover the center.",
        titleGuide: "The item name is displayed as the profile title below the username. No asset is required.",
        required: "Complete the key, both names, and a valid price.",
        invalidKey: "The key may contain lowercase letters, numbers, and hyphens.",
        missingOverlay: "Upload a PNG/WebP/SVG for this cosmetic.",
        missingBackground: "Upload the full image or the icon used by the pattern.",
        saveFailed: "The item could not be saved.",
        cancel: "Cancel",
        save: "Save item",
        categories: {
          "avatar-frame": "Avatar frame",
          "avatar-decoration": "Avatar decoration",
          "profile-background": "Profile background",
          "profile-title": "Profile title",
        } as Record<RewardCategory, string>,
      };

  useEffect(() => {
    if (!open) return;
    setDraft(product
      ? {
          ...product,
          name: { ...product.name },
          description: { ...product.description },
          styleConfig: { ...emptyProduct().styleConfig, ...product.styleConfig },
        }
      : emptyProduct());
    setError("");
    setSaving(false);
    setUploading(null);
    setIdTouched(Boolean(product));
  }, [open, product]);

  function update<K extends keyof RewardProduct>(key: K, value: RewardProduct[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setError("");
  }

  function updateStyle<K extends keyof RewardStyleConfig>(
    key: K,
    value: RewardStyleConfig[K]
  ) {
    setDraft((current) => ({
      ...current,
      styleConfig: { ...current.styleConfig, [key]: value },
    }));
    setError("");
  }

  function updateName(language: "en" | "ro", value: string) {
    setDraft((current) => ({
      ...current,
      id: !idTouched && language === "en" ? slugify(value) : current.id,
      name: { ...current.name, [language]: value },
    }));
  }

  function updateDescription(language: "en" | "ro", value: string) {
    setDraft((current) => ({
      ...current,
      description: { ...current.description, [language]: value },
    }));
  }

  function changeCategory(category: RewardCategory) {
    setDraft((current) => ({
      ...current,
      category,
      visual: visualForCategory(category),
      assetUrl: category === "profile-title" ? undefined : current.assetUrl,
    }));
  }

  async function upload(
    event: ChangeEvent<HTMLInputElement>,
    target: "asset" | "pattern"
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(target);
    try {
      const purpose = target === "pattern"
        ? "pattern"
        : draft.category === "profile-background"
          ? "background"
          : "overlay";
      const url = await uploadRewardAsset(file, purpose);

      if (target === "pattern") {
        updateStyle("patternUrl", url);
        updateStyle("backgroundMode", "pattern");
      } else {
        update("assetUrl", url);
      }
      update("visual", visualForCategory(draft.category));
      toast.success(copy.uploaded);
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "";
      toast.error(
        message.includes("unsafe_reward_svg")
          ? `${copy.uploadFailed} SVG-ul conține scripturi sau resurse externe.`
          : copy.uploadFailed
      );
    } finally {
      setUploading(null);
      event.target.value = "";
    }
  }

  async function submit() {
    const id = draft.id.trim();
    const price = Number(draft.price);
    if (!id || !draft.name.en.trim() || !draft.name.ro.trim() || price <= 0) {
      setError(copy.required);
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
      setError(copy.invalidKey);
      return;
    }
    if (
      ["avatar-frame", "avatar-decoration"].includes(draft.category) &&
      draft.visual === "custom-overlay" &&
      !draft.assetUrl
    ) {
      setError(copy.missingOverlay);
      return;
    }
    if (draft.category === "profile-background" && draft.visual === "custom-background") {
      const mode = draft.styleConfig?.backgroundMode || "pattern";
      if ((mode === "image" && !draft.assetUrl) ||
        (mode === "pattern" && !draft.styleConfig?.patternUrl)) {
        setError(copy.missingBackground);
        return;
      }
    }

    setSaving(true);
    try {
      await onSave({
        ...draft,
        id,
        name: { en: draft.name.en.trim(), ro: draft.name.ro.trim() },
        description: {
          en: draft.description.en.trim(),
          ro: draft.description.ro.trim(),
        },
        price,
      }, isNew);
    } catch {
      setError(copy.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  const backgroundMode = draft.styleConfig?.backgroundMode || "pattern";
  const isOverlay = draft.category === "avatar-frame" ||
    draft.category === "avatar-decoration";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{isNew ? copy.create : copy.edit}</DialogTitle>
          <DialogDescription>{copy.subtitle}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-6">
            <section className="space-y-4">
              <div>
                <h3 className="font-semibold">{copy.identity}</h3>
                <p className="text-xs text-muted-foreground">{copy.uploadRules}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-sm font-medium">{copy.nameRo}</span>
                  <Input value={draft.name.ro} onChange={(event) => updateName("ro", event.target.value)} />
                </label>
                <label className="space-y-1.5">
                  <span className="text-sm font-medium">{copy.nameEn}</span>
                  <Input value={draft.name.en} onChange={(event) => updateName("en", event.target.value)} />
                </label>
              </div>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium">{copy.key}</span>
                <Input
                  value={draft.id}
                  disabled={!isNew}
                  className="font-mono"
                  onChange={(event) => {
                    setIdTouched(true);
                    update("id", slugify(event.target.value));
                  }}
                />
                <span className="text-xs text-muted-foreground">{copy.keyHint}</span>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-sm font-medium">{copy.descriptionRo}</span>
                  <Textarea className="min-h-20" value={draft.description.ro} onChange={(event) => updateDescription("ro", event.target.value)} />
                </label>
                <label className="space-y-1.5">
                  <span className="text-sm font-medium">{copy.descriptionEn}</span>
                  <Textarea className="min-h-20" value={draft.description.en} onChange={(event) => updateDescription("en", event.target.value)} />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="space-y-1.5">
                  <span className="text-sm font-medium">{copy.category}</span>
                  <Select value={draft.category} onValueChange={(value) => changeCategory(value as RewardCategory)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((category) => <SelectItem key={category} value={category}>{copy.categories[category]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-sm font-medium">{copy.rarity}</span>
                  <Select value={draft.rarity} onValueChange={(value) => update("rarity", value as RewardRarity)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["common", "rare", "epic", "legendary"] as RewardRarity[]).map((rarity) => <SelectItem key={rarity} value={rarity}><span className="capitalize">{rarity}</span></SelectItem>)}
                    </SelectContent>
                  </Select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-sm font-medium">{copy.price}</span>
                  <Input type="number" min={1} value={draft.price} onChange={(event) => update("price", Number(event.target.value))} />
                </label>
                <label className="space-y-1.5">
                  <span className="text-sm font-medium">{copy.order}</span>
                  <Input type="number" value={draft.sort_order || 0} onChange={(event) => update("sort_order", Number(event.target.value))} />
                </label>
              </div>

              <button
                type="button"
                aria-pressed={draft.active}
                onClick={() => update("active", !draft.active)}
                className="flex w-full items-center justify-between rounded-xl border p-3 text-left hover:bg-zinc-50"
              >
                <span className="text-sm font-medium">{copy.active}</span>
                <span className={cn("relative h-6 w-11 rounded-full transition", draft.active ? "bg-emerald-500" : "bg-zinc-300")}>
                  <span className={cn("absolute top-1 size-4 rounded-full bg-white shadow-sm transition", draft.active ? "left-6" : "left-1")} />
                </span>
              </button>
            </section>

            <section className="space-y-4 border-t pt-5">
              <h3 className="font-semibold">{copy.design}</h3>

              {isOverlay && (
                <>
                  <AssetGuide category={draft.category as "avatar-frame" | "avatar-decoration"} locale={locale} />
                  <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border bg-white text-sm font-medium hover:bg-zinc-50">
                    <Upload className="size-4" />
                    {uploading === "asset" ? "..." : draft.assetUrl ? copy.replace : copy.upload}
                    <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void upload(event, "asset")} disabled={Boolean(uploading)} />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <RangeField label={copy.scale} value={draft.styleConfig?.assetScale ?? 145} min={70} max={220} suffix="%" onChange={(value) => updateStyle("assetScale", value)} />
                    <RangeField label={copy.horizontal} value={draft.styleConfig?.assetOffsetX ?? 0} min={-40} max={40} suffix="%" onChange={(value) => updateStyle("assetOffsetX", value)} />
                    <RangeField label={copy.vertical} value={draft.styleConfig?.assetOffsetY ?? 0} min={-40} max={40} suffix="%" onChange={(value) => updateStyle("assetOffsetY", value)} />
                  </div>
                </>
              )}

              {draft.category === "profile-background" && (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1.5">
                      <span className="text-sm font-medium">{copy.backgroundMode}</span>
                      <Select
                        value={backgroundMode}
                        onValueChange={(value) => {
                          updateStyle("backgroundMode", value as RewardBackgroundMode);
                          update("visual", "custom-background");
                        }}
                      >
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pattern"><Repeat2 className="size-4" />{copy.pattern}</SelectItem>
                          <SelectItem value="image"><ImageIcon className="size-4" />{copy.image}</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-sm font-medium">{copy.color}</span>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={draft.styleConfig?.backgroundColor || "#f3f7f1"}
                          onChange={(event) => {
                            updateStyle("backgroundColor", event.target.value);
                            update("visual", "custom-background");
                          }}
                          className="h-9 w-12 cursor-pointer rounded-md border bg-white p-1"
                        />
                        <Input value={draft.styleConfig?.backgroundColor || "#f3f7f1"} onChange={(event) => updateStyle("backgroundColor", event.target.value)} className="font-mono" />
                      </div>
                    </label>
                  </div>

                  {backgroundMode === "pattern" ? (
                    <div className="space-y-4 rounded-xl border bg-zinc-50 p-4">
                      <div className="flex items-start gap-3">
                        <Repeat2 className="mt-0.5 size-4 shrink-0" />
                        <div><p className="text-sm font-medium">{copy.patternIcon}</p><p className="text-xs leading-relaxed text-muted-foreground">{copy.patternGuide}</p></div>
                      </div>
                      <label className="flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border bg-white text-sm font-medium hover:bg-zinc-50">
                        <Upload className="size-4" />{uploading === "pattern" ? "..." : draft.styleConfig?.patternUrl ? copy.replace : copy.upload}
                        <input className="sr-only" type="file" accept="image/png,image/webp" onChange={(event) => void upload(event, "pattern")} disabled={Boolean(uploading)} />
                      </label>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <RangeField label={copy.patternSize} value={draft.styleConfig?.patternSize ?? 96} min={32} max={240} suffix="px" onChange={(value) => updateStyle("patternSize", value)} />
                        <RangeField label={copy.patternOpacity} value={Math.round((draft.styleConfig?.patternOpacity ?? 0.08) * 100)} min={2} max={30} suffix="%" onChange={(value) => updateStyle("patternOpacity", value / 100)} />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 rounded-xl border bg-zinc-50 p-4">
                      <div className="flex items-start gap-3">
                        <ImageIcon className="mt-0.5 size-4 shrink-0" />
                        <div><p className="text-sm font-medium">{copy.image}</p><p className="text-xs leading-relaxed text-muted-foreground">{copy.imageGuide}</p></div>
                      </div>
                      <label className="flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border bg-white text-sm font-medium hover:bg-zinc-50">
                        <Upload className="size-4" />{uploading === "asset" ? "..." : draft.assetUrl ? copy.replace : copy.upload}
                        <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void upload(event, "asset")} disabled={Boolean(uploading)} />
                      </label>
                      <RangeField label={copy.imageOpacity} value={Math.round((draft.styleConfig?.imageOpacity ?? 1) * 100)} min={10} max={100} suffix="%" onChange={(value) => updateStyle("imageOpacity", value / 100)} />
                    </div>
                  )}
                </div>
              )}

              {draft.category === "profile-title" && (
                <div className="flex items-start gap-3 rounded-xl border bg-zinc-50 p-4">
                  <Palette className="mt-0.5 size-4" />
                  <p className="text-sm text-muted-foreground">{copy.titleGuide}</p>
                </div>
              )}
            </section>
          </div>

          <aside className="lg:sticky lg:top-0 lg:self-start">
            <p className="mb-2 text-sm font-medium">{copy.preview}</p>
            <div className="h-64 rounded-xl border bg-white p-3 shadow-sm">
              <RewardProductPreview
                product={draft}
                locale={locale}
                avatarUrl={previewAvatarUrl}
                username={previewUsername || "scripticx"}
              />
            </div>
            <div className="mt-3 rounded-xl border bg-zinc-50 p-3 text-xs leading-relaxed text-muted-foreground">
              {draft.category === "profile-background"
                ? backgroundMode === "pattern" ? copy.patternGuide : copy.imageGuide
                : isOverlay ? copy.uploadRules : copy.titleGuide}
            </div>
          </aside>
        </div>

        {error && <p className="text-sm font-medium text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{copy.cancel}</Button>
          <Button onClick={() => void submit()} disabled={saving || Boolean(uploading)}>{saving ? "..." : copy.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RangeField({
  label,
  max,
  min,
  onChange,
  suffix,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  suffix: string;
  value: number;
}) {
  return (
    <label className="block space-y-2">
      <span className="flex items-center justify-between text-xs font-medium">
        {label}<span className="font-mono text-muted-foreground">{value}{suffix}</span>
      </span>
      <Slider value={[value]} min={min} max={max} step={1} onValueChange={(values) => onChange(values[0] ?? value)} />
    </label>
  );
}
