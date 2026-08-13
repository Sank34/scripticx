"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Code2,
  GraduationCap,
  ImagePlus,
  LoaderCircle,
  Presentation,
  Route,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";

import { useLanguage } from "@/components/LanguageProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api, type ProfileSummary } from "@/lib/api";
import {
  normalizeOnboardingUsername,
  onboardingMetadataKeys,
  productTourStorageKey,
  type OnboardingDraft,
  type OnboardingExperienceLevel,
  type OnboardingGoal,
  type OnboardingPersona,
} from "@/lib/onboarding";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  getDefaultWorkspaceKind,
  WORKSPACE_SETUP_VERSION,
  workspaceMetadataKeys,
} from "@/lib/workspaces";

type OnboardingExperienceProps = {
  onComplete: (persona: OnboardingPersona) => void;
  profile: ProfileSummary | null;
  user: User;
};

const totalSteps = 6;

const copy = {
  en: {
    back: "Back",
    bio: "A short bio",
    bioPlaceholder: "What are you curious to build or understand?",
    complete: "Start exploring",
    continue: "Continue",
    emailVerified: "Signed in as",
    experienceDescription: "We will tune examples and recommendations to your current pace.",
    experienceTitle: "Where are you starting from?",
    goalDescription: "Choose the outcome that matters most right now.",
    goalTitle: "What should ScripticX help you achieve?",
    interestsDescription: "Pick as many as you like. You can change these later.",
    interestsTitle: "Choose your learning interests",
    language: "Language",
    personaDescription: "Choose the space that best fits how you want to use ScripticX. You can switch workspaces later.",
    personaTitle: "What brings you to ScripticX?",
    profileDescription: "This is how classmates and collaborators will recognize you.",
    profileTitle: "Make the space yours",
    readyDescription: "Your editor, roadmap and practice workspace are ready.",
    readyTitle: "You are ready to build",
    skipAvatar: "You can add a different photo later from Settings.",
    uploadAvatar: "Upload avatar",
    username: "Username",
    welcomeDescription: "A focused place to learn programming, understand execution and turn ideas into working code.",
    welcomeTitle: "Welcome to ScripticX",
  },
  ro: {
    back: "Înapoi",
    bio: "O scurtă descriere",
    bioPlaceholder: "Ce ești curios să construiești sau să înțelegi?",
    complete: "Începe explorarea",
    continue: "Continuă",
    emailVerified: "Autentificat ca",
    experienceDescription: "Vom adapta exemplele și recomandările la ritmul tău actual.",
    experienceTitle: "De unde începi?",
    goalDescription: "Alege rezultatul care contează cel mai mult acum.",
    goalTitle: "Ce vrei să obții cu ScripticX?",
    interestsDescription: "Poți alege oricâte. Le poți schimba mai târziu.",
    interestsTitle: "Alege ce vrei să aprofundezi",
    language: "Limbă",
    personaDescription: "Alege spațiul potrivit modului în care vrei să folosești ScripticX. Vei putea schimba workspace-ul oricând.",
    personaTitle: "Cum vrei să folosești ScripticX?",
    profileDescription: "Așa te vor recunoaște colegii și colaboratorii.",
    profileTitle: "Personalizează-ți spațiul",
    readyDescription: "Editorul, roadmap-ul și spațiul de practică sunt pregătite.",
    readyTitle: "Ești gata să construiești",
    skipAvatar: "Poți schimba fotografia mai târziu din Setări.",
    uploadAvatar: "Încarcă avatar",
    username: "Username",
    welcomeDescription: "Un loc concentrat pentru a învăța programare, a înțelege execuția și a transforma ideile în cod funcțional.",
    welcomeTitle: "Bine ai venit pe ScripticX",
  },
} as const;

const personaOptions: Array<{
  id: OnboardingPersona;
  icon: typeof Code2;
  label: { en: string; ro: string };
  description: { en: string; ro: string };
  badge?: { en: string; ro: string };
}> = [
  {
    id: "student",
    icon: GraduationCap,
    label: { en: "I am a student", ro: "Sunt elev" },
    description: {
      en: "Notes, whiteboards and graph tools alongside your programming practice.",
      ro: "Notițe, whiteboard și grafuri alături de exercițiile de programare.",
    },
  },
  {
    id: "teacher",
    icon: Presentation,
    label: { en: "I am a teacher", ro: "Sunt profesor" },
    description: {
      en: "Prepare a teaching workspace now; class collaboration is coming next.",
      ro: "Pregătește spațiul de profesor; colaborarea cu clasele urmează.",
    },
    badge: { en: "Preview", ro: "Preview" },
  },
  {
    id: "learner",
    icon: Code2,
    label: { en: "I just want to learn", ro: "Vreau doar să învăț" },
    description: {
      en: "Keep the focused ScripticX programming workspace.",
      ro: "Păstrează workspace-ul ScripticX concentrat pe programare.",
    },
  },
];

const experienceOptions: Array<{
  id: OnboardingExperienceLevel;
  label: { en: string; ro: string };
  description: { en: string; ro: string };
}> = [
  {
    id: "first-steps",
    label: { en: "First steps", ro: "Primii pași" },
    description: { en: "I am completely new to code.", ro: "Sunt complet nou în programare." },
  },
  {
    id: "beginner",
    label: { en: "Beginner", ro: "Începător" },
    description: { en: "I know the basics and want structure.", ro: "Știu bazele și vreau structură." },
  },
  {
    id: "intermediate",
    label: { en: "Intermediate", ro: "Intermediar" },
    description: { en: "I build small programs independently.", ro: "Construiesc singur programe mici." },
  },
  {
    id: "advanced",
    label: { en: "Advanced", ro: "Avansat" },
    description: { en: "I want deeper algorithms and analysis.", ro: "Vreau algoritmi și analiză avansată." },
  },
];

const goalOptions: Array<{
  icon: typeof Target;
  id: OnboardingGoal;
  label: { en: string; ro: string };
}> = [
  { id: "learn-programming", icon: BookOpen, label: { en: "Learn programming", ro: "Să învăț programare" } },
  { id: "practice-algorithms", icon: Route, label: { en: "Practice algorithms", ro: "Să exersez algoritmi" } },
  { id: "prepare-interviews", icon: Trophy, label: { en: "Prepare for interviews", ro: "Să mă pregătesc pentru interviuri" } },
  { id: "teach-with-scripticx", icon: Sparkles, label: { en: "Teach with ScripticX", ro: "Să predau cu ScripticX" } },
];

const interestOptions = [
  { id: "fundamentals", label: { en: "Programming fundamentals", ro: "Fundamente" } },
  { id: "algorithms", label: { en: "Algorithms", ro: "Algoritmi" } },
  { id: "debugging", label: { en: "Debugging", ro: "Debugging" } },
  { id: "visual-execution", label: { en: "Visual execution", ro: "Execuție vizuală" } },
  { id: "complexity", label: { en: "Complexity analysis", ro: "Analiza complexității" } },
  { id: "collaboration", label: { en: "Collaboration", ro: "Colaborare" } },
] as const;

export function OnboardingExperience({
  onComplete,
  profile,
  user,
}: OnboardingExperienceProps) {
  const { locale, setLocale } = useLanguage();
  const c = copy[locale === "ro" ? "ro" : "en"];
  const language = locale === "ro" ? "ro" : "en";
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<OnboardingDraft>(() => ({
    avatarFile: null,
    avatarPreview:
      typeof profile?.avatar_url === "string" ? profile.avatar_url : null,
    bio: typeof profile?.bio === "string" ? profile.bio : "",
    experience: "beginner",
    goal: "learn-programming",
    interests: ["fundamentals", "visual-execution"],
    persona: "learner",
    username: profile?.username || user.email?.split("@")[0] || "",
  }));

  useEffect(() => {
    return () => {
      if (draft.avatarFile && draft.avatarPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(draft.avatarPreview);
      }
    };
  }, [draft.avatarFile, draft.avatarPreview]);

  const initials = (draft.username || user.email || "S").slice(0, 2).toUpperCase();
  const normalizedUsername = normalizeOnboardingUsername(draft.username);
  const canContinue = step !== 2 || normalizedUsername.length >= 3;
  const selectedGoal = useMemo(
    () => goalOptions.find((option) => option.id === draft.goal),
    [draft.goal]
  );
  const selectedPersona = useMemo(
    () => personaOptions.find((option) => option.id === draft.persona),
    [draft.persona]
  );

  function chooseAvatar(file: File | undefined) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      toast.error(language === "ro" ? "Alege o imagine validă." : "Choose a valid image.");
      return;
    }

    setDraft((current) => {
      if (current.avatarPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(current.avatarPreview);
      }
      return {
        ...current,
        avatarFile: file,
        avatarPreview: URL.createObjectURL(file),
      };
    });
  }

  function toggleInterest(id: string) {
    setDraft((current) => ({
      ...current,
      interests: current.interests.includes(id)
        ? current.interests.filter((interest) => interest !== id)
        : [...current.interests, id],
    }));
  }

  async function finishOnboarding() {
    if (!canContinue || saving) return;
    setSaving(true);

    try {
      let avatarUrl = draft.avatarPreview?.startsWith("http")
        ? draft.avatarPreview
        : null;

      if (draft.avatarFile) {
        const extension = draft.avatarFile.name.split(".").pop() || "png";
        const filePath = `${user.id}/onboarding-${Date.now()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, draft.avatarFile, {
            cacheControl: "3600",
            contentType: draft.avatarFile.type,
            upsert: true,
          });
        if (uploadError) throw uploadError;

        avatarUrl = supabase.storage.from("avatars").getPublicUrl(filePath).data.publicUrl;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          avatar_url: avatarUrl,
          bio: draft.bio.trim(),
          username: normalizedUsername,
        })
        .eq("id", user.id);
      if (profileError) throw profileError;

      const { error: metadataError } = await api.auth.updateUserMetadata({
        [onboardingMetadataKeys.completedAt]: new Date().toISOString(),
        [onboardingMetadataKeys.experience]: draft.experience,
        [onboardingMetadataKeys.goal]: draft.goal,
        [onboardingMetadataKeys.interests]: draft.interests,
        [onboardingMetadataKeys.persona]: draft.persona,
        [onboardingMetadataKeys.required]: false,
        [workspaceMetadataKeys.activeWorkspaceKind]: getDefaultWorkspaceKind(
          draft.persona
        ),
        [workspaceMetadataKeys.setupVersion]: WORKSPACE_SETUP_VERSION,
      });
      if (metadataError) throw metadataError;

      localStorage.setItem(productTourStorageKey, "pending");
      window.dispatchEvent(new Event("profile-updated"));
      onComplete(draft.persona);
    } catch (error) {
      toast.error(
        language === "ro" ? "Nu am putut salva profilul." : "Could not save your profile.",
        { description: error instanceof Error ? error.message : undefined }
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[120] overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-sky-500 to-violet-500" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(14,165,233,0.12),transparent_42%),linear-gradient(to_bottom,rgba(255,255,255,0),rgba(248,250,252,0.65))] dark:bg-[radial-gradient(circle_at_50%_-20%,rgba(14,165,233,0.14),transparent_42%),linear-gradient(to_bottom,rgba(9,9,11,0),rgba(24,24,27,0.68))]" />

      <div className="relative mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col px-5 py-4 sm:px-8 sm:py-5">
        <header className="flex shrink-0 items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logoSCX.svg" alt="ScripticX" className="h-9 w-9 dark:invert" />
            <span className="text-lg font-semibold">ScripticX</span>
          </div>
          <div className="flex items-center rounded-lg border bg-card p-1 shadow-sm">
            {(["en", "ro"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setLocale(item)}
                className={cn(
                  "h-8 min-w-10 rounded-md px-2 text-xs font-semibold uppercase transition",
                  locale === item
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent"
                )}
                aria-label={`${c.language}: ${item.toUpperCase()}`}
              >
                {item}
              </button>
            ))}
          </div>
        </header>

        <div className="mx-auto mt-4 flex w-full max-w-xl shrink-0 gap-2" aria-label={`Step ${step + 1} of ${totalSteps}`}>
          {Array.from({ length: totalSteps }).map((_, index) => (
            <div
              key={index}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors duration-500",
                index <= step ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>

        <main className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 items-center py-4 sm:py-6">
          <div
            key={step}
            className="w-full animate-in fade-in slide-in-from-bottom-6 duration-500"
          >
            {step === 0 && (
              <div className="mx-auto max-w-xl text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-lg border border-sky-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-sky-500/15 shadow-[0_18px_60px_rgba(14,165,233,0.18)] sm:h-20 sm:w-20">
                  <Code2 className="h-9 w-9 text-sky-600" />
                </div>
                <h1 className="text-4xl font-semibold tracking-normal sm:text-5xl">
                  {c.welcomeTitle}
                </h1>
                <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
                  {c.welcomeDescription}
                </p>
              </div>
            )}

            {step === 1 && (
              <div>
                <div className="text-center">
                  <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">
                    {c.personaTitle}
                  </h1>
                  <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
                    {c.personaDescription}
                  </p>
                </div>

                <div className="mx-auto mt-6 grid max-w-4xl gap-3 md:grid-cols-3 sm:mt-8">
                  {personaOptions.map((option) => {
                    const Icon = option.icon;
                    const selected = draft.persona === option.id;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            persona: option.id,
                            goal:
                              option.id === "teacher"
                                ? "teach-with-scripticx"
                                : current.goal === "teach-with-scripticx"
                                  ? "learn-programming"
                                  : current.goal,
                          }))
                        }
                        className={cn(
                          "group relative flex min-h-44 flex-col rounded-2xl border bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:border-sky-500/50 hover:shadow-lg",
                          selected &&
                            "border-sky-500 bg-sky-500/10 shadow-[0_16px_45px_rgba(14,165,233,0.14)] ring-1 ring-sky-500/20"
                        )}
                        aria-pressed={selected}
                      >
                        <span
                          className={cn(
                            "flex h-11 w-11 items-center justify-center rounded-xl border bg-background text-muted-foreground transition-colors",
                            selected && "border-sky-500/40 bg-sky-500 text-white"
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="mt-5 flex items-center gap-2 font-semibold">
                          {option.label[language]}
                          {option.badge ? (
                            <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-300">
                              {option.badge[language]}
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-2 text-sm leading-6 text-muted-foreground">
                          {option.description[language]}
                        </span>
                        <span
                          className={cn(
                            "absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full border",
                            selected
                              ? "border-sky-600 bg-sky-600 text-white"
                              : "border-border"
                          )}
                        >
                          {selected ? <Check className="h-3 w-3" /> : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="text-center">
                  <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">{c.profileTitle}</h1>
                  <p className="mt-3 text-muted-foreground">{c.profileDescription}</p>
                </div>
                <div className="mx-auto mt-5 max-w-lg space-y-3 sm:mt-7 sm:space-y-4">
                  <div className="flex flex-col items-center gap-3">
                    <Avatar className="h-20 w-20 border-4 border-background shadow-[0_12px_40px_rgba(37,99,235,0.2)] ring-1 ring-border sm:h-24 sm:w-24">
                      {draft.avatarPreview ? <AvatarImage src={draft.avatarPreview} /> : null}
                      <AvatarFallback className="bg-gradient-to-br from-emerald-100 to-sky-100 text-xl font-semibold text-sky-800">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-sky-700 hover:text-sky-900">
                      <ImagePlus className="h-4 w-4" />
                      {c.uploadAvatar}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        onChange={(event) => chooseAvatar(event.target.files?.[0])}
                      />
                    </label>
                    <p className="text-xs text-muted-foreground">{c.skipAvatar}</p>
                  </div>
                  <label className="block space-y-2 text-sm font-medium">
                    {c.username}
                    <Input
                      value={draft.username}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, username: event.target.value }))
                      }
                      className="h-12"
                      maxLength={24}
                      autoFocus
                    />
                  </label>
                  <label className="block space-y-2 text-sm font-medium">
                    {c.bio}
                    <Textarea
                      value={draft.bio}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, bio: event.target.value.slice(0, 180) }))
                      }
                      placeholder={c.bioPlaceholder}
                      className="min-h-20 resize-none sm:min-h-24"
                    />
                    <span className="block text-right text-xs text-muted-foreground/70">{draft.bio.length}/180</span>
                  </label>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="grid gap-6 lg:grid-cols-2 lg:gap-10">
                <section>
                  <div className="text-center">
                    <h1 className="text-2xl font-semibold tracking-normal sm:text-3xl">{c.experienceTitle}</h1>
                    <p className="mt-2 text-sm text-muted-foreground sm:text-base">{c.experienceDescription}</p>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-5 sm:gap-3">
                    {experienceOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() =>
                          setDraft((current) => ({ ...current, experience: option.id }))
                        }
                        className={cn(
                          "flex min-h-24 items-start gap-2.5 rounded-lg border p-3 text-left transition hover:border-sky-500/50 hover:bg-sky-500/10 sm:gap-3 sm:p-4",
                          draft.experience === option.id &&
                            "border-sky-500 bg-sky-500/10 shadow-[0_8px_30px_rgba(14,165,233,0.12)]"
                        )}
                      >
                        <span className={cn(
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                          draft.experience === option.id
                            ? "border-sky-600 bg-sky-600 text-white"
                            : "border-border"
                        )}>
                          {draft.experience === option.id ? <Check className="h-3 w-3" /> : null}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold sm:text-base">{option.label[language]}</span>
                          <span className="mt-1 line-clamp-2 block text-xs leading-4 text-muted-foreground sm:text-sm sm:leading-5">{option.description[language]}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <div className="text-center">
                    <h2 className="text-2xl font-semibold tracking-normal sm:text-3xl">{c.goalTitle}</h2>
                    <p className="mt-2 text-sm text-muted-foreground sm:text-base">{c.goalDescription}</p>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-5 sm:gap-3">
                    {goalOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setDraft((current) => ({ ...current, goal: option.id }))}
                          className={cn(
                            "flex min-h-14 items-center gap-2.5 rounded-lg border px-3 text-left text-xs font-medium transition hover:border-violet-300 sm:gap-3 sm:px-4 sm:text-sm lg:min-h-24",
                            draft.goal === option.id
                              ? "border-violet-500 bg-violet-500/10 text-violet-900 dark:text-violet-200"
                              : "bg-card"
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span>{option.label[language]}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}

            {step === 4 && (
              <div>
                <div className="text-center">
                  <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">{c.interestsTitle}</h1>
                  <p className="mt-3 text-muted-foreground">{c.interestsDescription}</p>
                </div>
                <div className="mx-auto mt-5 grid max-w-xl grid-cols-2 gap-2.5 sm:mt-7 sm:gap-3">
                  {interestOptions.map((option) => {
                    const selected = draft.interests.includes(option.id);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => toggleInterest(option.id)}
                        className={cn(
                          "flex min-h-12 items-center justify-between gap-2 rounded-lg border bg-card px-3 text-left text-xs font-medium transition sm:h-14 sm:px-4 sm:text-sm",
                          selected
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-900 shadow-[0_8px_24px_rgba(16,185,129,0.1)] dark:text-emerald-200"
                            : "hover:border-foreground/35"
                        )}
                      >
                        {option.label[language]}
                        <span className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-md border",
                          selected ? "border-emerald-600 bg-emerald-600 text-white" : "border-border"
                        )}>
                          {selected ? <Check className="h-3 w-3" /> : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 5 && (
              <div>
                <div className="text-center">
                  <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 via-sky-500 to-violet-500 text-white shadow-[0_16px_45px_rgba(14,165,233,0.22)]">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">{c.readyTitle}</h1>
                  <p className="mt-3 text-muted-foreground">{c.readyDescription}</p>
                </div>

                <div className="mx-auto mt-6 max-w-xl rounded-lg border border-sky-500/30 bg-gradient-to-r from-emerald-500/10 via-card to-sky-500/10 p-5 shadow-[0_16px_50px_rgba(14,165,233,0.1)] sm:mt-8">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      {draft.avatarPreview ? <AvatarImage src={draft.avatarPreview} /> : null}
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">@{normalizedUsername}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {selectedPersona?.label[language]} · {selectedGoal?.label[language]}
                      </p>
                    </div>
                    <Sparkles className="h-5 w-5 text-violet-500" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        <footer className="mx-auto w-full max-w-xl shrink-0 pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center gap-3">
            {step > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setStep((current) => Math.max(0, current - 1))}
                disabled={saving}
                className="h-12"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">{c.back}</span>
              </Button>
            ) : null}
            <Button
              type="button"
              size="lg"
              disabled={!canContinue || saving}
              onClick={() => {
                if (step === totalSteps - 1) {
                  void finishOnboarding();
                } else {
                  setStep((current) => current + 1);
                }
              }}
              className="h-12 flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {step === totalSteps - 1 ? c.complete : c.continue}
              {!saving ? <ArrowRight className="h-4 w-4" /> : null}
            </Button>
          </div>
          <p className="mt-2 truncate text-center text-xs text-muted-foreground/70 sm:mt-3">
            {c.emailVerified} {user.email}
          </p>
        </footer>
      </div>
    </div>
  );
}
