"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Boxes,
  CheckCircle2,
  Coins,
  Edit3,
  PackageOpen,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import RouteGuard from "@/components/RouteGuard";
import { ShopItemEditorDialog } from "@/components/admin/ShopItemEditorDialog";
import { RewardProductPreview } from "@/components/rewards/RewardProductPreview";
import { useLanguage } from "@/components/LanguageProvider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import {
  RARITY_STYLES,
  type RewardCategory,
  type RewardProduct,
} from "@/lib/rewards";
import {
  deleteAdminRewardProduct,
  fetchAdminRewardProducts,
  saveAdminRewardProduct,
} from "@/lib/rewardsData";
import { cn } from "@/lib/utils";

const EMPTY_PRODUCTS: RewardProduct[] = [];

function AdminShopContent() {
  const { locale } = useLanguage();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | RewardCategory>("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<RewardProduct | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<RewardProduct | null>(null);
  const [deleting, setDeleting] = useState(false);

  const productsQuery = useQuery({
    queryKey: ["admin", "reward-products"],
    queryFn: fetchAdminRewardProducts,
  });
  const products = productsQuery.data || EMPTY_PRODUCTS;

  const copy = locale === "ro"
    ? {
        back: "Înapoi la admin",
        title: "Shop items",
        subtitle: "Creează și gestionează obiectele, asset-urile și background-urile din Rewards Shop.",
        create: "Item nou",
        active: "Active în shop",
        owners: "Obiecte deținute",
        custom: "Design-uri custom",
        search: "Caută după nume sau cheie...",
        all: "Toate categoriile",
        empty: "Nu există item-uri care corespund filtrelor.",
        loadError: "Item-urile nu au putut fi încărcate. Aplică migrarea pentru Admin Shop Items.",
        retry: "Reîncearcă",
        inactive: "Inactiv",
        students: "utilizatori",
        edit: "Editează",
        delete: "Șterge",
        deleteTitle: "Ștergi acest item?",
        deleteDescription: "Dacă item-ul a fost deja cumpărat, va fi arhivat și ascuns din shop, dar rămâne disponibil utilizatorilor care îl dețin. Istoricul tranzacțiilor rămâne intact.",
        cancel: "Anulează",
        confirmDelete: "Șterge sau arhivează",
        created: "Item creat și publicat în shop.",
        updated: "Item actualizat. Asset-urile echipate au fost sincronizate.",
        removed: "Item șters.",
        archived: "Item arhivat deoarece există achiziții asociate.",
        duplicate: "Există deja un item cu această cheie.",
        failed: "Operația nu a putut fi finalizată.",
        categories: {
          "avatar-frame": "Rame avatar",
          "avatar-decoration": "Decorații avatar",
          "profile-background": "Background-uri",
          "profile-title": "Titluri profil",
        } as Record<RewardCategory, string>,
      }
    : {
        back: "Back to admin",
        title: "Shop items",
        subtitle: "Create and manage items, assets, and backgrounds in the Rewards Shop.",
        create: "New item",
        active: "Active in shop",
        owners: "Owned items",
        custom: "Custom designs",
        search: "Search by name or key...",
        all: "All categories",
        empty: "No items match these filters.",
        loadError: "Items could not be loaded. Apply the Admin Shop Items migration.",
        retry: "Try again",
        inactive: "Inactive",
        students: "users",
        edit: "Edit",
        delete: "Delete",
        deleteTitle: "Delete this item?",
        deleteDescription: "If the item has already been purchased, it will be archived and hidden from the shop, but remains available to existing owners. Transaction history remains intact.",
        cancel: "Cancel",
        confirmDelete: "Delete or archive",
        created: "Item created and published in the shop.",
        updated: "Item updated. Equipped assets were synchronized.",
        removed: "Item deleted.",
        archived: "Item archived because purchases are associated with it.",
        duplicate: "An item with this key already exists.",
        failed: "The operation could not be completed.",
        categories: {
          "avatar-frame": "Avatar frames",
          "avatar-decoration": "Avatar decorations",
          "profile-background": "Backgrounds",
          "profile-title": "Profile titles",
        } as Record<RewardCategory, string>,
      };

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale);
    return products.filter((product) => {
      const matchesCategory = category === "all" || product.category === category;
      const haystack = `${product.id} ${product.name.en} ${product.name.ro} ${product.description.en} ${product.description.ro}`
        .toLocaleLowerCase(locale);
      return matchesCategory && (!normalized || haystack.includes(normalized));
    });
  }, [category, locale, products, query]);

  const stats = [
    { label: copy.active, value: products.filter((item) => item.active).length, Icon: CheckCircle2 },
    { label: copy.owners, value: products.reduce((sum, item) => sum + (item.owners || 0), 0), Icon: Users },
    { label: copy.custom, value: products.filter((item) => item.visual.startsWith("custom-")).length, Icon: Boxes },
  ];

  async function saveProduct(product: RewardProduct, isNew: boolean) {
    if (isNew && products.some((entry) => entry.id === product.id)) {
      toast.error(copy.duplicate);
      throw new Error("duplicate_reward_product");
    }

    try {
      await saveAdminRewardProduct(product, isNew);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "reward-products"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "counts"] }),
        queryClient.invalidateQueries({ queryKey: ["rewards-shop"] }),
      ]);
      setEditorOpen(false);
      setEditingProduct(null);
      toast.success(isNew ? copy.created : copy.updated);
    } catch (error) {
      const message = error && typeof error === "object" && "message" in error
        ? String(error.message)
        : "";
      if (message.includes("duplicate") || message.includes("23505")) {
        toast.error(copy.duplicate);
      } else {
        toast.error(copy.failed);
      }
      throw error;
    }
  }

  async function removeProduct() {
    if (!deleteProduct) return;
    setDeleting(true);
    try {
      const result = await deleteAdminRewardProduct(deleteProduct.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "reward-products"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "counts"] }),
        queryClient.invalidateQueries({ queryKey: ["rewards-shop"] }),
      ]);
      setDeleteProduct(null);
      toast.success(result.archived ? copy.archived : copy.removed);
    } catch {
      toast.error(copy.failed);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
          <Link href="/admin"><ArrowLeft className="size-4" />{copy.back}</Link>
        </Button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{copy.title}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{copy.subtitle}</p>
          </div>
          <Button onClick={() => { setEditingProduct(null); setEditorOpen(true); }}>
            <Plus className="size-4" />{copy.create}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map(({ Icon, label, value }) => (
          <Card key={label} className="py-0 shadow-none">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground"><Icon className="size-4" /></span>
              <div><p className="text-2xl font-semibold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.search} className="pl-9" />
        </div>
        <Select value={category} onValueChange={(value) => setCategory(value as "all" | RewardCategory)}>
          <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{copy.all}</SelectItem>
            {(Object.keys(copy.categories) as RewardCategory[]).map((entry) => <SelectItem key={entry} value={entry}>{copy.categories[entry]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {productsQuery.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-80 rounded-xl" />)}
        </div>
      ) : productsQuery.isError ? (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed text-center">
          <PackageOpen className="size-9 text-muted-foreground/50" />
          <p className="mt-3 max-w-md text-sm text-muted-foreground">{copy.loadError}</p>
          <Button variant="outline" className="mt-4" onClick={() => void productsQuery.refetch()}>{copy.retry}</Button>
        </div>
      ) : filteredProducts.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((product) => {
            const styles = RARITY_STYLES[product.rarity];
            return (
              <Card key={product.id} className="gap-0 overflow-hidden py-0 shadow-none">
                <div className="relative h-44 p-3 pb-0">
                  <RewardProductPreview
                    product={product}
                    locale={locale}
                    avatarUrl={profile?.avatar_url}
                    username={profile?.username || "scripticx"}
                  />
                  <Badge variant="outline" className={cn("absolute left-5 top-5 capitalize", styles.badge)}>{product.rarity}</Badge>
                  {!product.active && <Badge variant="secondary" className="absolute right-5 top-5">{copy.inactive}</Badge>}
                </div>
                <CardContent className="space-y-4 p-4">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate font-semibold">{product.name[locale]}</h2>
                        <p className="truncate font-mono text-[11px] text-muted-foreground">{product.id}</p>
                      </div>
                      <span className="flex shrink-0 items-center gap-1 text-sm font-semibold"><Coins className="size-3.5 text-amber-500" />{product.price}</span>
                    </div>
                    <p className="mt-2 line-clamp-2 min-h-10 text-sm text-muted-foreground">{product.description[locale]}</p>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{copy.categories[product.category]}</span>
                      <span>{product.owners || 0} {copy.students}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 border-t pt-3">
                    <Button variant="outline" className="flex-1" onClick={() => { setEditingProduct(product); setEditorOpen(true); }}><Edit3 className="size-4" />{copy.edit}</Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteProduct(product)}><Trash2 className="size-4" /><span className="sr-only">{copy.delete}</span></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed text-center">
          <PackageOpen className="size-9 text-muted-foreground/50" /><p className="mt-3 text-sm text-muted-foreground">{copy.empty}</p>
        </div>
      )}

      <ShopItemEditorDialog
        open={editorOpen}
        onOpenChange={(value) => {
          setEditorOpen(value);
          if (!value) setEditingProduct(null);
        }}
        product={editingProduct}
        locale={locale}
        onSave={saveProduct}
        previewAvatarUrl={profile?.avatar_url}
        previewUsername={profile?.username}
      />

      <AlertDialog open={Boolean(deleteProduct)} onOpenChange={(open) => !open && setDeleteProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{copy.deleteTitle}</AlertDialogTitle><AlertDialogDescription>{copy.deleteDescription}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>{copy.cancel}</AlertDialogCancel><AlertDialogAction onClick={() => void removeProduct()} disabled={deleting}>{deleting ? "..." : copy.confirmDelete}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function AdminShopPage() {
  return <RouteGuard requireAuth requireAdmin><AdminShopContent /></RouteGuard>;
}
