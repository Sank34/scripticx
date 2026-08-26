"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  Info,
  Plus,
  Settings,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/EmptyState";
import { useLanguage } from "@/components/LanguageProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@/components/ui/menubar";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const sections = [
  ["principles", "Principles"],
  ["foundations", "Foundations"],
  ["components", "Components"],
  ["states", "Product states"],
  ["patterns", "Patterns"],
] as const;

const colors = [
  { label: "Background", token: "--background" },
  { label: "Card", token: "--card" },
  { label: "Muted", token: "--muted" },
  { label: "Primary", token: "--primary" },
  { label: "Success", token: "--sx-success" },
  { label: "Warning", token: "--sx-warning" },
  { label: "Destructive", token: "--destructive" },
  { label: "Info", token: "--sx-info" },
] as const;

const spacing = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16] as const;

function ShowcaseSection({
  children,
  description,
  id,
  title,
}: {
  children: ReactNode;
  description: string;
  id: string;
  title: string;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-5">
      <div className="max-w-2xl space-y-1.5">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function SampleCard({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function TokenCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
      {children}
    </code>
  );
}

function StatusBanner({
  description,
  icon,
  tone,
  title,
}: {
  description: string;
  icon: ReactNode;
  tone: "success" | "warning" | "info";
  title: string;
}) {
  const styles = {
    success: {
      background: "var(--sx-success-soft)",
      color: "var(--sx-success)",
    },
    warning: {
      background: "var(--sx-warning-soft)",
      color: "var(--sx-warning)",
    },
    info: {
      background: "var(--sx-info-soft)",
      color: "var(--sx-info)",
    },
  } satisfies Record<string, CSSProperties>;

  return (
    <div className="flex gap-3 rounded-xl border border-border p-3" style={styles[tone]}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function Principle({ children, index, title }: { children: ReactNode; index: string; title: string }) {
  return (
    <div className="flex gap-4 border-t border-border py-4 first:border-t-0 first:pt-0 last:pb-0">
      <span className="font-mono text-xs text-muted-foreground">{index}</span>
      <div>
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}

function CodeSample({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-border bg-muted/55 p-4 text-xs leading-6">
      <code className="font-mono">{children}</code>
    </pre>
  );
}

export function DesignSystemShowcase() {
  const [notifications, setNotifications] = useState(true);
  const { t } = useLanguage();

  async function copyDocsPath() {
    await navigator.clipboard.writeText("docs/design-guide.md");
    toast.success("Documentation path copied");
  }

  return (
    <TooltipProvider delayDuration={180}>
      <main className="sx-page pb-20">
        <div className="space-y-10">
          <header className="space-y-6 border-b border-border pb-8">
            <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
              <Link href="/admin">
                <ArrowLeft />
                Back to admin
              </Link>
            </Button>

            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-3 flex items-center gap-2">
                  <Badge variant="outline">Foundation 1.0</Badge>
                  <span className="text-xs text-muted-foreground">Internal reference</span>
                </div>
                <h1 className="flex flex-wrap items-center gap-x-3 gap-y-2 text-3xl font-semibold leading-tight sm:text-4xl">
                  <Image
                    src="/scripticx-logo-lung.png"
                    alt="ScripticX"
                    width={203}
                    height={41}
                    priority
                    className="h-[0.95em] w-auto dark:invert"
                  />
                  <span>{t("admin.designSystem.page.title")}</span>
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                  {t("admin.designSystem.page.description")}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => void copyDocsPath()}>
                  <Copy />
                  Copy docs path
                </Button>
                <Button asChild>
                  <a href="#components">Browse components</a>
                </Button>
              </div>
            </div>

            <nav aria-label="Design system sections" className="flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {sections.map(([id, label]) => (
                <Button key={id} variant="ghost" size="sm" asChild className="shrink-0 text-muted-foreground">
                  <a href={`#${id}`}>{label}</a>
                </Button>
              ))}
            </nav>
          </header>

          <ShowcaseSection
            id="principles"
            title="Principles"
            description="The rules that should survive trends, frameworks, and individual feature teams."
          >
            <Card>
              <CardContent className="py-1">
                <Principle index="01" title="Clarity before decoration">
                  Hierarchy comes from content, typography, spacing, and neutral surfaces. Every visual effect must explain state, structure, or interaction.
                </Principle>
                <Principle index="02" title="One coherent product">
                  Personal, student, teacher, and admin workspaces share the same interaction language even when their information architecture differs.
                </Principle>
                <Principle index="03" title="States are part of the design">
                  Loading, empty, error, offline, saving, and permission states are specified alongside the success state, not after it.
                </Principle>
                <Principle index="04" title="Restraint creates identity">
                  ScripticX avoids random gradients, accent colors, emoji chrome, wide-tracked subtitles, and unnecessary rounded containers.
                </Principle>
              </CardContent>
            </Card>
          </ShowcaseSection>

          <ShowcaseSection
            id="foundations"
            title="Foundations"
            description="Semantic tokens create a shared visual language across light mode, dark mode, responsive layouts, and email."
          >
            <div className="grid gap-4 xl:grid-cols-2">
              <SampleCard title="Semantic color" description="Use meaning-based tokens, not page-specific hex values.">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {colors.map((color) => (
                    <div key={color.token} className="min-w-0">
                      <div
                        className="h-16 rounded-lg border border-border"
                        style={{ background: `var(${color.token})` }}
                      />
                      <p className="mt-2 truncate text-xs font-medium">{color.label}</p>
                      <p className="truncate font-mono text-[11px] text-muted-foreground">{color.token}</p>
                    </div>
                  ))}
                </div>
              </SampleCard>

              <SampleCard title="Typography" description="Geist for product UI, Geist Mono for code and technical values.">
                <div className="space-y-5">
                  <div>
                    <p className="text-3xl font-semibold leading-tight">Page title</p>
                    <p className="mt-1 text-xs text-muted-foreground">32px · semibold · sentence case</p>
                  </div>
                  <div>
                    <p className="text-xl font-semibold">Section heading</p>
                    <p className="mt-1 text-sm text-muted-foreground">A short explanation creates hierarchy without letter spacing.</p>
                  </div>
                  <p className="max-w-xl text-sm leading-6">
                    Body copy stays readable and direct. Supporting information uses semantic muted color instead of a smaller, decorative display style.
                  </p>
                  <p className="font-mono text-sm">const language = &quot;MiniScript+&quot;;</p>
                </div>
              </SampleCard>

              <SampleCard title="Spacing scale" description="A 4px base rhythm keeps relationships predictable.">
                <div className="space-y-2.5">
                  {spacing.map((step) => (
                    <div key={step} className="grid grid-cols-[2rem_1fr_4.5rem] items-center gap-3">
                      <span className="font-mono text-xs text-muted-foreground">{step}</span>
                      <span
                        className="h-2 rounded-full bg-foreground"
                        style={{ width: `min(100%, var(--sx-space-${step}))` }}
                      />
                      <span className="text-right font-mono text-[11px] text-muted-foreground">
                        --sx-space-{step}
                      </span>
                    </div>
                  ))}
                </div>
              </SampleCard>

              <SampleCard title="Radius and elevation" description="Shape follows the role of the object.">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    ["Control", "var(--sx-radius-control)", "var(--sx-shadow-subtle)"],
                    ["Card", "var(--sx-radius-card)", "var(--sx-shadow-subtle)"],
                    ["Panel", "var(--sx-radius-panel)", "var(--sx-shadow-raised)"],
                    ["Shell", "var(--sx-radius-shell)", "var(--sx-shadow-overlay)"],
                  ].map(([label, radius, shadow]) => (
                    <div key={label}>
                      <div
                        className="aspect-square border border-border bg-card"
                        style={{ borderRadius: radius, boxShadow: shadow }}
                      />
                      <p className="mt-2 text-xs font-medium">{label}</p>
                    </div>
                  ))}
                </div>
              </SampleCard>
            </div>
          </ShowcaseSection>

          <ShowcaseSection
            id="components"
            title="Components"
            description="Use the shared shadcn primitives so keyboard behavior, focus, dimensions, motion, and themes stay consistent."
          >
            <div className="grid gap-4 xl:grid-cols-2">
              <SampleCard title="Actions" description="One primary action per local decision group.">
                <div className="flex flex-wrap items-center gap-2">
                  <Button><Plus />Create note</Button>
                  <Button variant="secondary">Save draft</Button>
                  <Button variant="outline">Preview</Button>
                  <Button variant="ghost">Cancel</Button>
                  <Button variant="destructive"><Trash2 />Delete</Button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" aria-label="Open settings">
                        <Settings />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6}>Open settings</TooltipContent>
                  </Tooltip>
                </div>
                <Separator className="my-5" />
                <div className="flex flex-wrap gap-2">
                  <Badge>Active</Badge>
                  <Badge variant="secondary">Draft</Badge>
                  <Badge variant="outline">Optional</Badge>
                  <Badge variant="destructive">Failed</Badge>
                </div>
              </SampleCard>

              <SampleCard title="Form controls" description="Visible labels, useful hints, and local validation.">
                <div className="space-y-4">
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium">Class name</span>
                    <Input placeholder="Algorithms — grade 10" />
                    <span className="text-xs text-muted-foreground">Students will see this name in their workspace.</span>
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium">Description</span>
                    <Textarea placeholder="What will students learn?" />
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-1.5">
                      <span className="block text-sm font-medium">Default language</span>
                      <Select defaultValue="cpp">
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cpp">C++</SelectItem>
                          <SelectItem value="python">Python</SelectItem>
                          <SelectItem value="javascript">JavaScript</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                    <div className="space-y-2">
                      <span className="block text-sm font-medium">Editor opacity</span>
                      <Slider defaultValue={[72]} max={100} step={1} className="mt-4" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm font-medium">Email notifications</p>
                      <p className="text-xs text-muted-foreground">Receive deadline and class updates.</p>
                    </div>
                    <Switch checked={notifications} onCheckedChange={setNotifications} aria-label="Email notifications" />
                  </div>
                </div>
              </SampleCard>

              <SampleCard title="Navigation and menus" description="Tabs change view; menus expose contextual actions.">
                <Tabs defaultValue="overview">
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                  </TabsList>
                  <TabsContent value="overview" className="pt-4 text-muted-foreground">
                    Overview keeps the current product area and switches only the local view.
                  </TabsContent>
                  <TabsContent value="activity" className="pt-4 text-muted-foreground">
                    Activity uses the same stable tab position.
                  </TabsContent>
                  <TabsContent value="settings" className="pt-4 text-muted-foreground">
                    Complex settings should still open a dedicated page.
                  </TabsContent>
                </Tabs>
                <Separator className="my-5" />
                <Menubar>
                  <MenubarMenu>
                    <MenubarTrigger>File</MenubarTrigger>
                    <MenubarContent>
                      <MenubarItem>New note <MenubarShortcut>⌘N</MenubarShortcut></MenubarItem>
                      <MenubarItem>Export</MenubarItem>
                      <MenubarSeparator />
                      <MenubarItem>Close</MenubarItem>
                    </MenubarContent>
                  </MenubarMenu>
                  <MenubarMenu>
                    <MenubarTrigger>Edit</MenubarTrigger>
                    <MenubarContent>
                      <MenubarItem>Undo <MenubarShortcut>⌘Z</MenubarShortcut></MenubarItem>
                      <MenubarItem>Redo <MenubarShortcut>⇧⌘Z</MenubarShortcut></MenubarItem>
                    </MenubarContent>
                  </MenubarMenu>
                </Menubar>
              </SampleCard>

              <SampleCard title="Overlays" description="Choose the smallest overlay that fully supports the task.">
                <div className="flex flex-wrap gap-2">
                  <Popover>
                    <PopoverTrigger asChild><Button variant="outline">Open popover</Button></PopoverTrigger>
                    <PopoverContent align="start">
                      <PopoverHeader>
                        <PopoverTitle>Workspace role</PopoverTitle>
                        <PopoverDescription>This changes the tools visible in the sidebar.</PopoverDescription>
                      </PopoverHeader>
                      <Select defaultValue="student">
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="teacher">Teacher</SelectItem>
                          <SelectItem value="personal">Personal</SelectItem>
                        </SelectContent>
                      </Select>
                    </PopoverContent>
                  </Popover>

                  <Dialog>
                    <DialogTrigger asChild><Button variant="outline">Open dialog</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete this note?</DialogTitle>
                        <DialogDescription>The note will be removed from this workspace. This action cannot be undone.</DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                        <Button variant="destructive">Delete note</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                <p className="mt-4 text-xs leading-5 text-muted-foreground">
                  Tooltips clarify short labels. Popovers hold contextual controls. Dialogs interrupt only for focused decisions.
                </p>
              </SampleCard>
            </div>
          </ShowcaseSection>

          <ShowcaseSection
            id="states"
            title="Product states"
            description="A feature is not finished until loading, empty, error, saving, and recovery behavior are designed."
          >
            <div className="grid gap-4 xl:grid-cols-3">
              <SampleCard title="Loading" description="Boneyard reserves the final geometry.">
                <div className="space-y-4" aria-label="Loading example">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                  <Skeleton className="h-24 w-full rounded-xl" />
                  <div className="grid grid-cols-3 gap-2">
                    <Skeleton className="h-8" />
                    <Skeleton className="h-8" />
                    <Skeleton className="h-8" />
                  </div>
                </div>
              </SampleCard>

              <SampleCard title="Empty" description="Explain the state and offer the next action.">
                <EmptyState
                  className="py-5"
                  title="No assignments yet"
                  description="Create an assignment when your class is ready to practise."
                  action={<Button size="sm"><Plus />Create assignment</Button>}
                />
              </SampleCard>

              <SampleCard title="Feedback" description="Color supports meaning; copy and icons carry it.">
                <div className="space-y-2">
                  <StatusBanner tone="success" title="Changes saved" description="The note is synced to your workspace." icon={<Check className="size-4" />} />
                  <StatusBanner tone="warning" title="Saved locally" description="We will retry when the connection returns." icon={<AlertTriangle className="size-4" />} />
                  <StatusBanner tone="info" title="Review required" description="Two students submitted after the deadline." icon={<Info className="size-4" />} />
                </div>
              </SampleCard>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Progress and save state</CardTitle>
                <CardDescription>Stable labels prevent autosave from feeling noisy or broken.</CardDescription>
                <CardAction><Badge variant="outline">Saved</Badge></CardAction>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground"><span>Course progress</span><span>68%</span></div>
                <Progress value={68} />
              </CardContent>
            </Card>
          </ShowcaseSection>

          <ShowcaseSection
            id="patterns"
            title="Patterns"
            description="Practical examples of what to repeat and what to remove when building or reviewing a screen."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <Card style={{ borderColor: "color-mix(in oklab, var(--sx-success) 30%, var(--border))" }}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Check className="size-4" style={{ color: "var(--sx-success)" }} />
                    <CardTitle>Do</CardTitle>
                  </div>
                  <CardDescription>Use hierarchy that remains clear without decoration.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>Sentence-case heading and one concrete supporting sentence.</p>
                  <p>Neutral surface, semantic border, one functional accent.</p>
                  <p>Shared primitive with keyboard and dark-mode behavior.</p>
                  <p>Skeleton, empty, error, and save states designed up front.</p>
                </CardContent>
              </Card>

              <Card className="border-destructive/30">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="size-4 text-destructive" />
                    <CardTitle>Do not</CardTitle>
                  </div>
                  <CardDescription>Do not use visual noise as a substitute for product hierarchy.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>Decorative gradients, glowing shadows, or several random accents.</p>
                  <p>Uppercase wide-tracked subtitles or emoji in interface chrome.</p>
                  <p>Icons that merely repeat every adjacent text label.</p>
                  <p>Nested rounded cards, browser alerts, or spinner-only pages.</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Implementation contract</CardTitle>
                <CardDescription>Start with semantic tokens and shared components. Improve the source rather than forking it.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-2">
                <CodeSample>{`<main className="sx-page">\n  <Card>\n    <CardHeader>…</CardHeader>\n    <CardContent>…</CardContent>\n  </Card>\n</main>`}</CodeSample>
                <div className="space-y-3 text-sm leading-6 text-muted-foreground">
                  <p>Normative guide: <TokenCode>docs/design-guide.md</TokenCode></p>
                  <p>Tokens: <TokenCode>app/globals.css</TokenCode></p>
                  <p>Primitives: <TokenCode>components/ui</TokenCode></p>
                  <p>Automated review: <TokenCode>npm run design:check</TokenCode></p>
                </div>
              </CardContent>
              <CardFooter className="justify-between gap-3">
                <p className="text-xs text-muted-foreground">New design-system files are enforced; legacy findings are reported for gradual migration.</p>
                <Button variant="outline" size="sm" onClick={() => toast.success("Design check command: npm run design:check")}>Show command</Button>
              </CardFooter>
            </Card>
          </ShowcaseSection>
        </div>
      </main>
    </TooltipProvider>
  );
}
