"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Coins,
  Gift,
  PackageOpen,
  Palette,
  Search,
  ShoppingBag,
  Sparkles,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import RouteGuard from "@/components/RouteGuard";
import { useLanguage } from "@/components/LanguageProvider";
import { RewardProductPreview } from "@/components/rewards/RewardProductPreview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import {
  RARITY_STYLES,
  type RewardCategory,
  type RewardProduct,
} from "@/lib/rewards";
import {
  equipReward,
  fetchRewardsShop,
  getRewardsErrorCode,
  purchaseReward,
  unequipReward,
} from "@/lib/rewardsData";
import { cn } from "@/lib/utils";

type ShopFilter = "all" | RewardCategory;

const FILTER_ICONS = {
  all: ShoppingBag,
  "avatar-frame": UserRound,
  "avatar-decoration": Sparkles,
  "profile-background": Palette,
  "profile-title": Gift,
} as const;

function InventoryDrawer({
  avatarUrl,
  busyProduct,
  data,
  locale,
  onEquip,
  onOpenChange,
  open,
  username,
}: {
  avatarUrl?: string | null;
  busyProduct: string | null;
  data: Awaited<ReturnType<typeof fetchRewardsShop>>;
  locale: "en" | "ro";
  onEquip: (product: RewardProduct, equipped: boolean) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  username?: string | null;
}) {
  const copy = locale === "ro"
    ? {
        title: "Inventarul meu",
        subtitle: "Echipează câte un obiect din fiecare categorie.",
        empty: "Nu ai încă obiecte. Cumpără prima recompensă din shop.",
        equipped: "Echipat",
        equip: "Echipează",
        unequip: "Dezechipează",
      }
    : {
        title: "My inventory",
        subtitle: "Equip one item from each category.",
        empty: "Your inventory is empty. Buy your first reward from the shop.",
        equipped: "Equipped",
        equip: "Equip",
        unequip: "Unequip",
      };

  return (
    <Drawer direction="right" open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="w-[92vw] sm:max-w-md">
        <DrawerHeader className="border-b p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-muted">
              <PackageOpen className="size-5" />
            </span>
            <div>
              <DrawerTitle className="text-lg">{copy.title}</DrawerTitle>
              <DrawerDescription>{copy.subtitle}</DrawerDescription>
            </div>
          </div>
        </DrawerHeader>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {data.inventory.length ? (
            data.inventory.map((item) => (
              <div key={item.product.id} className="flex gap-3 rounded-xl border p-3">
                <div className="h-20 w-24 shrink-0">
                  <RewardProductPreview
                    product={item.product}
                    username={username}
                    avatarUrl={avatarUrl}
                    equipped={data.equipped}
                    locale={locale}
                    compact
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="truncate font-medium">{item.product.name[locale]}</p>
                      <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                        {item.product.rarity}
                      </p>
                    </div>
                    {item.equipped && (
                      <Badge variant="secondary" className="shrink-0">
                        <Check className="size-3" />{copy.equipped}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant={item.equipped ? "ghost" : "outline"}
                    size="sm"
                    className="mt-auto self-end"
                    disabled={busyProduct === item.product.id}
                    onClick={() => onEquip(item.product, item.equipped)}
                  >
                    {busyProduct === item.product.id
                      ? "..."
                      : item.equipped
                        ? copy.unequip
                        : copy.equip}
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="flex h-72 flex-col items-center justify-center px-8 text-center">
              <PackageOpen className="size-10 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">{copy.empty}</p>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function ShopContent() {
  const { locale } = useLanguage();
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<ShopFilter>("all");
  const [query, setQuery] = useState("");
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<RewardProduct | null>(null);
  const [busyProduct, setBusyProduct] = useState<string | null>(null);

  const shopQuery = useQuery({
    queryKey: ["rewards-shop", user?.id],
    queryFn: () => fetchRewardsShop(user!.id),
    enabled: Boolean(user?.id),
  });
  const data = shopQuery.data;

  const copy = locale === "ro"
    ? {
        eyebrow: "Rewards Shop",
        title: "Recompense pentru progresul tău",
        subtitle: "Punctele de recompensă se câștigă din probleme și daily challenges. Scorul de clasament rămâne separat.",
        balance: "Sold",
        inventory: "Inventar",
        search: "Caută recompense...",
        filters: {
          all: "Toate",
          "avatar-frame": "Rame avatar",
          "avatar-decoration": "Decorații",
          "profile-background": "Fundaluri profil",
          "profile-title": "Titluri",
        } as Record<ShopFilter, string>,
        buy: "Cumpără",
        owned: "În inventar",
        equipped: "Echipat",
        empty: "Nu am găsit recompense pentru acest filtru.",
        loadError: "Shop-ul nu a putut fi încărcat. Verifică migrarea Supabase pentru rewards.",
        retry: "Reîncearcă",
        next: "până la",
        allUnlocked: "Ai suficiente puncte pentru orice obiect rămas.",
        confirmTitle: "Adaugi recompensa în inventar?",
        confirmDescription: "Punctele vor fi retrase din soldul de rewards. Scorul tău de clasament nu se modifică.",
        cancel: "Anulează",
        confirm: "Cumpără cu {points} puncte",
        purchased: "Recompensa a fost adăugată în inventar.",
        equippedToast: "Obiect echipat. Modificarea este vizibilă pe platformă.",
        unequippedToast: "Obiect dezechipat.",
        errors: {
          insufficient_reward_points: "Nu ai suficiente puncte de recompensă.",
          reward_already_owned: "Ai deja această recompensă.",
          reward_not_owned: "Recompensa nu se află în inventarul tău.",
          reward_not_equipped: "Recompensa nu mai este echipată.",
          reward_not_found: "Recompensa nu mai este disponibilă.",
          unknown: "Operația nu a putut fi finalizată.",
        } as Record<string, string>,
      }
    : {
        eyebrow: "Rewards Shop",
        title: "Rewards for your progress",
        subtitle: "Reward points come from problems and daily challenges. Your leaderboard score stays separate.",
        balance: "Balance",
        inventory: "Inventory",
        search: "Search rewards...",
        filters: {
          all: "All",
          "avatar-frame": "Avatar frames",
          "avatar-decoration": "Decorations",
          "profile-background": "Profile backgrounds",
          "profile-title": "Titles",
        } as Record<ShopFilter, string>,
        buy: "Buy",
        owned: "In inventory",
        equipped: "Equipped",
        empty: "No rewards match this filter.",
        loadError: "The shop could not be loaded. Check the Supabase rewards migration.",
        retry: "Try again",
        next: "until",
        allUnlocked: "You have enough points for any remaining item.",
        confirmTitle: "Add this reward to your inventory?",
        confirmDescription: "Points are deducted from your rewards balance. Your leaderboard score will not change.",
        cancel: "Cancel",
        confirm: "Buy for {points} points",
        purchased: "Reward added to your inventory.",
        equippedToast: "Item equipped. The change is now visible across the platform.",
        unequippedToast: "Item unequipped.",
        errors: {
          insufficient_reward_points: "You do not have enough reward points.",
          reward_already_owned: "You already own this reward.",
          reward_not_owned: "This reward is not in your inventory.",
          reward_not_equipped: "This reward is no longer equipped.",
          reward_not_found: "This reward is no longer available.",
          unknown: "The operation could not be completed.",
        } as Record<string, string>,
      };

  const visibleProducts = useMemo(() => {
    if (!data) return [];
    const normalized = query.trim().toLocaleLowerCase(locale);
    return data.products.filter((product) => {
      const matchesFilter = filter === "all" || product.category === filter;
      const haystack = `${product.name[locale]} ${product.description[locale]}`.toLocaleLowerCase(locale);
      return matchesFilter && (!normalized || haystack.includes(normalized));
    });
  }, [data, filter, locale, query]);

  const ownedIds = new Set(data?.inventory.map((item) => item.product.id) || []);
  const nextReward = data?.products
    .filter((product) => !ownedIds.has(product.id) && product.price > data.balance)
    .sort((a, b) => a.price - b.price)[0];

  async function refreshRewards() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["rewards-shop", user?.id] }),
      queryClient.invalidateQueries({ queryKey: ["profile"] }),
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] }),
      queryClient.invalidateQueries({ queryKey: ["feed"] }),
    ]);
    window.dispatchEvent(new Event("rewards-updated"));
  }

  async function buySelected() {
    if (!selectedProduct || busyProduct) return;
    setBusyProduct(selectedProduct.id);
    try {
      await purchaseReward(selectedProduct.id);
      await refreshRewards();
      setSelectedProduct(null);
      toast.success(copy.purchased);
    } catch (error) {
      const code = getRewardsErrorCode(error);
      toast.error(copy.errors[code] || copy.errors.unknown);
    } finally {
      setBusyProduct(null);
    }
  }

  async function toggleEquip(product: RewardProduct, isEquipped: boolean) {
    if (busyProduct) return;
    setBusyProduct(product.id);
    try {
      if (isEquipped) await unequipReward(product.id);
      else await equipReward(product.id);
      await refreshRewards();
      toast.success(isEquipped ? copy.unequippedToast : copy.equippedToast);
    } catch (error) {
      const code = getRewardsErrorCode(error);
      toast.error(copy.errors[code] || copy.errors.unknown);
    } finally {
      setBusyProduct(null);
    }
  }

  if (shopQuery.isPending || !user) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-52 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-80 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (shopQuery.isError || !data) {
    return (
      <div className="flex min-h-[55vh] flex-col items-center justify-center rounded-2xl border border-dashed text-center">
        <ShoppingBag className="size-10 text-muted-foreground/50" />
        <p className="mt-3 max-w-md text-sm text-muted-foreground">{copy.loadError}</p>
        <Button variant="outline" className="mt-4" onClick={() => void shopQuery.refetch()}>{copy.retry}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-muted/40 p-6 sm:p-8">
        <div className="grid gap-7 lg:grid-cols-[1fr_310px] lg:items-end">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ShoppingBag className="size-4" />
              {copy.eyebrow}
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{copy.title}</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{copy.subtitle}</p>

            <Button variant="outline" className="mt-5 bg-background" onClick={() => setInventoryOpen(true)}>
              <PackageOpen className="size-4" />
              {copy.inventory}
              <Badge variant="secondary" className="ml-1">{data.inventory.length}</Badge>
            </Button>
          </div>

          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{copy.balance}</p>
            <p className="mt-1 flex items-center gap-2 text-3xl font-semibold">
              <Coins className="size-6 text-amber-500" />
              {data.balance.toLocaleString(locale === "ro" ? "ro-RO" : "en-US")}
            </p>
            <Progress
              value={nextReward ? Math.min(100, (data.balance / nextReward.price) * 100) : 100}
              className="mt-4"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {nextReward
                ? `${Math.max(0, nextReward.price - data.balance).toLocaleString()} ${copy.next} ${nextReward.name[locale]}`
                : copy.allUnlocked}
            </p>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(Object.keys(copy.filters) as ShopFilter[]).map((value) => {
            const Icon = FILTER_ICONS[value];
            return (
              <Button
                key={value}
                variant={filter === value ? "default" : "outline"}
                onClick={() => setFilter(value)}
                className="shrink-0"
              >
                <Icon className="size-4" />
                {copy.filters[value]}
              </Button>
            );
          })}
        </div>

        <div className="relative w-full xl:w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.search}
            className="h-9 bg-background pl-9"
          />
        </div>
      </div>

      {visibleProducts.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleProducts.map((product) => {
            const ownedItem = data.inventory.find((item) => item.product.id === product.id);
            const styles = RARITY_STYLES[product.rarity];
            return (
              <Card key={product.id} className="gap-0 overflow-hidden py-0 shadow-none transition hover:shadow-sm">
                <div className="relative h-44 p-3 pb-0">
                  <RewardProductPreview
                    product={product}
                    username={profile?.username}
                    avatarUrl={profile?.avatar_url}
                    equipped={data.equipped}
                    locale={locale}
                  />
                  <Badge variant="outline" className={cn("absolute left-5 top-5 capitalize", styles.badge)}>
                    {product.rarity}
                  </Badge>
                </div>
                <CardContent className="flex flex-1 flex-col gap-4 p-4">
                  <div className="min-h-20">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="font-semibold">{product.name[locale]}</h2>
                      {ownedItem?.equipped && (
                        <Badge variant="secondary"><Check className="size-3" />{copy.equipped}</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{product.description[locale]}</p>
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-3 border-t pt-3">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Coins className="size-4 text-amber-500" />
                      {product.price.toLocaleString()}
                    </span>
                    <Button
                      variant={ownedItem ? "outline" : "default"}
                      onClick={() => {
                        if (ownedItem) setInventoryOpen(true);
                        else setSelectedProduct(product);
                      }}
                    >
                      {ownedItem ? copy.owned : copy.buy}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/40 text-center">
          <Gift className="size-9 text-muted-foreground/50" />
          <p className="mt-3 font-medium">{copy.empty}</p>
        </div>
      )}

      <InventoryDrawer
        open={inventoryOpen}
        onOpenChange={setInventoryOpen}
        data={data}
        locale={locale}
        avatarUrl={profile?.avatar_url}
        username={profile?.username}
        busyProduct={busyProduct}
        onEquip={(product, equipped) => void toggleEquip(product, equipped)}
      />

      <Dialog open={Boolean(selectedProduct)} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.confirmTitle}</DialogTitle>
            <DialogDescription>{copy.confirmDescription}</DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="flex items-center gap-3 rounded-xl border bg-muted/40 p-3">
              <div className="size-16 shrink-0">
                <RewardProductPreview
                  product={selectedProduct}
                  username={profile?.username}
                  avatarUrl={profile?.avatar_url}
                  equipped={data.equipped}
                  locale={locale}
                  compact
                />
              </div>
              <div className="min-w-0">
                <p className="font-semibold">{selectedProduct.name[locale]}</p>
                <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                  <Coins className="size-3.5 text-amber-500" />{selectedProduct.price.toLocaleString()}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedProduct(null)}>{copy.cancel}</Button>
            <Button
              onClick={() => void buySelected()}
              disabled={!selectedProduct || selectedProduct.price > data.balance || Boolean(busyProduct)}
            >
              {busyProduct
                ? "..."
                : copy.confirm.replace("{points}", selectedProduct?.price.toLocaleString() || "0")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ShopPage() {
  return (
    <RouteGuard requireAuth>
      <ShopContent />
    </RouteGuard>
  );
}
