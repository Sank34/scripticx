"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { enUS, ro as roLocale } from "date-fns/locale";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CakeSlice,
  CalendarDays,
  Check,
  Code2,
  GraduationCap,
  ImagePlus,
  LoaderCircle,
  Languages,
  Presentation,
  Route,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";

import { useLanguage } from "@/components/LanguageProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api, type ProfileSummary } from "@/lib/api";
import {
  formatBirthDateForStorage,
  isAllowedBirthDate,
  parseStoredBirthDate,
} from "@/lib/birthday";
import { savePrivateBirthDate } from "@/lib/birthdayData";
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
  onComplete?: (persona: OnboardingPersona) => void;
  profile: ProfileSummary | null;
  user?: User | null;
  registration?: {
    email: string;
    username: string;
    onSubmit: (draft: OnboardingDraft) => Promise<boolean>;
  };
};

const totalSteps = 9;

type StepTransitionPhase = "entering" | "idle" | "leaving";

const copy = {
  en: {
    back: "Back",
    bio: "A short bio",
    bioPlaceholder: "What are you curious to build or understand?",
    birthdayDescription: "Choose the date from the calendar below.",
    birthdayPrivacy: "We only use this for private, aggregate statistics and a small surprise once a year. Your birthday is never shown on your public profile.",
    birthdaySelected: "Birthday selected",
    birthdayTitle: "When is your birthday?",
    complete: "Start exploring",
    createAccount: "Create account",
    continue: "Continue",
    emailVerified: "Signed in as",
    registrationEmail: "Creating account for",
    experienceDescription: "We will tune examples and recommendations to your current pace.",
    experienceTitle: "Where are you starting from?",
    goalDescription: "Choose the outcome that matters most right now.",
    goalTitle: "What should ScripticX help you achieve?",
    interestsDescription: "Pick as many as you like. You can change these later.",
    interestsTitle: "Choose your learning interests",
    language: "Language",
    languageTitle: "Choose your default language",
    languageDescription: "ScripticX will switch immediately and remember this preference for your account.",
    english: "English",
    englishDescription: "Use ScripticX in English by default.",
    romanian: "Romanian",
    romanianDescription: "Folosește ScripticX în limba română.",
    personaDescription: "Choose how you will use ScripticX. Students also keep a personal practice space; teacher accounts stay focused on class management.",
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
    birthdayDescription: "Alege data din calendarul de mai jos.",
    birthdayPrivacy: "Folosim data doar pentru statistici interne, agregate, și pentru o mică surpriză o dată pe an. Ziua ta de naștere nu apare niciodată pe profilul public.",
    birthdaySelected: "Data selectată",
    birthdayTitle: "Când este ziua ta de naștere?",
    complete: "Începe explorarea",
    createAccount: "Creează contul",
    continue: "Continuă",
    emailVerified: "Autentificat ca",
    registrationEmail: "Creezi contul pentru",
    experienceDescription: "Vom adapta exemplele și recomandările la ritmul tău actual.",
    experienceTitle: "De unde începi?",
    goalDescription: "Alege rezultatul care contează cel mai mult acum.",
    goalTitle: "Ce vrei să obții cu ScripticX?",
    interestsDescription: "Poți alege oricâte. Le poți schimba mai târziu.",
    interestsTitle: "Alege ce vrei să aprofundezi",
    language: "Limbă",
    languageTitle: "Alege limba implicită",
    languageDescription: "ScripticX va schimba imediat textele și va reține preferința pentru contul tău.",
    english: "Engleză",
    englishDescription: "Use ScripticX in English by default.",
    romanian: "Română",
    romanianDescription: "Folosește ScripticX în limba română.",
    personaDescription: "Alege cum vei folosi ScripticX. Elevii păstrează și spațiul personal pentru practică, iar conturile de profesor rămân concentrate pe clase.",
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
      en: "Manage classes, students, assignments, deadlines and learning progress.",
      ro: "Administrează clase, elevi, teme, deadline-uri și progresul de învățare.",
    },
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
  registration,
}: OnboardingExperienceProps) {
  const { locale, setLocale } = useLanguage();
  const c = copy[locale === "ro" ? "ro" : "en"];
  const language = locale === "ro" ? "ro" : "en";
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<1 | -1>(1);
  const [transitionPhase, setTransitionPhase] =
    useState<StepTransitionPhase>("idle");
  const [transitionLocked, setTransitionLocked] = useState(false);
  const transitionTimerRef = useRef<number | null>(null);
  const transitionFrameRef = useRef<number | null>(null);
  const [draft, setDraft] = useState<OnboardingDraft>(() => ({
    avatarFile: null,
    avatarPreview:
      typeof profile?.avatar_url === "string" ? profile.avatar_url : null,
    bio: typeof profile?.bio === "string" ? profile.bio : "",
    birthDate: "",
    experience: "beginner",
    goal: "learn-programming",
    interests: ["fundamentals", "visual-execution"],
    language: locale === "ro" ? "ro" : "en",
    persona: "learner",
    username:
      profile?.username ||
      registration?.username ||
      user?.email?.split("@")[0] ||
      "",
  }));

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
      }
      if (transitionFrameRef.current !== null) {
        window.cancelAnimationFrame(transitionFrameRef.current);
      }
      if (draft.avatarFile && draft.avatarPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(draft.avatarPreview);
      }
    };
  }, [draft.avatarFile, draft.avatarPreview]);

  const accountEmail = registration?.email || user?.email || "";
  const initials = (draft.username || accountEmail || "S").slice(0, 2).toUpperCase();
  const normalizedUsername = normalizeOnboardingUsername(draft.username);
  const canContinue =
    (step !== 3 || normalizedUsername.length >= 3) &&
    (step !== 4 || isAllowedBirthDate(draft.birthDate));
  const today = useMemo(() => new Date(), []);
  const selectedBirthDate = useMemo(
    () => parseStoredBirthDate(draft.birthDate),
    [draft.birthDate]
  );
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

  function chooseLanguage(nextLanguage: "en" | "ro") {
    setDraft((current) => ({ ...current, language: nextLanguage }));
    setLocale(nextLanguage);
  }

  function moveToStep(nextStep: number) {
    const targetStep = Math.min(totalSteps - 1, Math.max(0, nextStep));
    if (
      targetStep === step ||
      saving ||
      transitionLocked
    ) {
      return;
    }

    const direction = targetStep > step ? 1 : -1;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    setTransitionDirection(direction);

    if (reducedMotion) {
      setStep(targetStep);
      return;
    }

    setTransitionLocked(true);
    setTransitionPhase("leaving");
    transitionTimerRef.current = window.setTimeout(() => {
      setStep(targetStep);
      setTransitionPhase("entering");
      transitionFrameRef.current = window.requestAnimationFrame(() => {
        transitionFrameRef.current = window.requestAnimationFrame(() => {
          setTransitionPhase("idle");
          transitionFrameRef.current = null;
          transitionTimerRef.current = window.setTimeout(() => {
            setTransitionLocked(false);
            transitionTimerRef.current = null;
          }, 300);
        });
      });
    }, 180);
  }

  async function finishOnboarding() {
    if (!canContinue || saving) return;
    setSaving(true);

    try {
      if (registration) {
        await registration.onSubmit({
          ...draft,
          avatarFile: null,
          avatarPreview: null,
        });
        return;
      }

      if (!user) {
        throw new Error(
          language === "ro"
            ? "Sesiunea contului nu este disponibilă."
            : "The account session is unavailable."
        );
      }

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

      await savePrivateBirthDate(draft.birthDate);

      const { error: workspaceError } = await supabase.rpc(
        "provision_default_workspaces",
        {
          p_persona: draft.persona,
          p_workspace_name: null,
        }
      );
      if (workspaceError) throw workspaceError;

      const { error: metadataError } = await api.auth.updateUserMetadata({
        [onboardingMetadataKeys.completedAt]: new Date().toISOString(),
        [onboardingMetadataKeys.experience]: draft.experience,
        [onboardingMetadataKeys.goal]: draft.goal,
        [onboardingMetadataKeys.interests]: draft.interests,
        [onboardingMetadataKeys.language]: draft.language,
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
      onComplete?.(draft.persona);
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
    <div className="onboarding-screen-enter fixed inset-0 z-[120] overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-1 bg-primary" />
      <div className="pointer-events-none fixed inset-0 bg-muted/20" />

      <div className="relative mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col px-5 py-4 sm:px-8 sm:py-5">
        <header className="onboarding-reveal onboarding-reveal-header flex shrink-0 items-center justify-between gap-4">
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
                onClick={() => chooseLanguage(item)}
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

        <div className="onboarding-reveal onboarding-reveal-progress mx-auto mt-4 flex w-full max-w-xl shrink-0 gap-2" aria-label={`Step ${step + 1} of ${totalSteps}`}>
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

        <main
          className="onboarding-reveal onboarding-reveal-content mx-auto flex min-h-0 w-full max-w-5xl flex-1 items-center py-4 sm:py-6"
          aria-live="polite"
        >
          <div
            key={step}
            className={cn(
              "w-full will-change-transform transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
              transitionPhase === "idle" && "translate-x-0 opacity-100",
              transitionPhase === "leaving" &&
                (transitionDirection === 1
                  ? "-translate-x-3 opacity-0"
                  : "translate-x-3 opacity-0"),
              transitionPhase === "entering" &&
                (transitionDirection === 1
                  ? "translate-x-3 opacity-0"
                  : "-translate-x-3 opacity-0")
            )}
          >
            {step === 0 && (
              <div className="mx-auto max-w-3xl text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border bg-card shadow-sm">
                  <Languages className="h-7 w-7 text-foreground" />
                </div>
                <h1 className="mt-6 text-3xl font-semibold tracking-normal sm:text-5xl">
                  {c.languageTitle}
                </h1>
                <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                  {c.languageDescription}
                </p>
                <div className="mx-auto mt-8 grid max-w-2xl gap-3 sm:grid-cols-2">
                  {([
                    { id: "en", code: "EN", label: c.english, description: c.englishDescription },
                    { id: "ro", code: "RO", label: c.romanian, description: c.romanianDescription },
                  ] as const).map((option) => {
                    const selected = draft.language === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => chooseLanguage(option.id)}
                        className={cn(
                          "group relative flex min-h-36 items-center gap-4 rounded-2xl border bg-card p-5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
                          selected && "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                        )}
                        aria-pressed={selected}
                      >
                        <span className={cn(
                          "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border bg-background text-sm font-bold transition-all duration-300",
                          selected && "border-primary bg-primary text-primary-foreground"
                        )}>{option.code}</span>
                        <span className="min-w-0">
                          <span className="block text-lg font-semibold">{option.label}</span>
                          <span className="mt-1 block text-sm leading-6 text-muted-foreground">{option.description}</span>
                        </span>
                        <span className={cn(
                          "absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full border transition-all",
                          selected ? "scale-100 border-primary bg-primary text-primary-foreground" : "scale-90 border-border text-transparent"
                        )}><Check className="h-3.5 w-3.5" /></span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="mx-auto max-w-xl text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-lg border bg-card shadow-sm sm:h-20 sm:w-20">
                  <Code2 className="h-9 w-9 text-foreground" />
                </div>
                <h1 className="text-4xl font-semibold tracking-normal sm:text-5xl">
                  {c.welcomeTitle}
                </h1>
                <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
                  {c.welcomeDescription}
                </p>
              </div>
            )}

            {step === 2 && (
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
                          "group relative flex min-h-44 flex-col rounded-2xl border bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
                          selected &&
                            "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                        )}
                        aria-pressed={selected}
                      >
                        <span
                          className={cn(
                            "flex h-11 w-11 items-center justify-center rounded-xl border bg-background text-muted-foreground transition-colors",
                            selected && "border-primary bg-primary text-primary-foreground"
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="mt-5 flex items-center gap-2 font-semibold">
                          {option.label[language]}
                          {option.badge ? (
                            <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
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
                              ? "border-primary bg-primary text-primary-foreground"
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

            {step === 3 && (
              <div>
                <div className="text-center">
                  <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">{c.profileTitle}</h1>
                  <p className="mt-3 text-muted-foreground">{c.profileDescription}</p>
                </div>
                <div className="mx-auto mt-5 max-w-lg space-y-3 sm:mt-7 sm:space-y-4">
                  <div className="flex flex-col items-center gap-3">
                    <Avatar className="h-20 w-20 border-4 border-background shadow-sm ring-1 ring-border sm:h-24 sm:w-24">
                      {draft.avatarPreview ? <AvatarImage src={draft.avatarPreview} /> : null}
                      <AvatarFallback className="bg-muted text-xl font-semibold text-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    {registration ? null : (
                      <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground hover:text-foreground/70">
                        <ImagePlus className="h-4 w-4" />
                        {c.uploadAvatar}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="sr-only"
                          onChange={(event) => chooseAvatar(event.target.files?.[0])}
                        />
                      </label>
                    )}
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

            {step === 4 && (
              <div className="mx-auto w-full max-w-3xl">
                <div className="text-center">
                  <div className="mx-auto flex size-14 items-center justify-center rounded-xl border bg-card shadow-sm">
                    <CakeSlice className="size-6" />
                  </div>
                  <h1 className="mt-5 text-3xl font-semibold tracking-normal sm:text-4xl">
                    {c.birthdayTitle}
                  </h1>
                  <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
                    {c.birthdayDescription}
                  </p>
                </div>

                <div className="mx-auto mt-5 grid max-w-2xl gap-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-stretch">
                  <div className="rounded-[var(--sx-radius-card)] border bg-card p-2 shadow-sm">
                    <Calendar
                      mode="single"
                      selected={selectedBirthDate}
                      onSelect={(date) =>
                        setDraft((current) => ({
                          ...current,
                          birthDate: date ? formatBirthDateForStorage(date) : "",
                        }))
                      }
                      defaultMonth={
                        selectedBirthDate ||
                        new Date(
                          today.getFullYear() - 12,
                          today.getMonth(),
                          today.getDate()
                        )
                      }
                      startMonth={new Date(1900, 0, 1)}
                      endMonth={today}
                      disabled={{ after: today }}
                      captionLayout="dropdown"
                      locale={language === "ro" ? roLocale : enUS}
                      className="mx-auto bg-transparent p-1 [--cell-size:--spacing(8)]"
                    />
                  </div>

                  <div className="flex min-w-0 flex-col gap-3">
                    <div className="flex min-h-20 items-center gap-3 rounded-[var(--sx-radius-card)] border bg-card p-4 shadow-sm">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <CalendarDays className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground">
                          {c.birthdaySelected}
                        </p>
                        <p className="mt-0.5 truncate font-semibold">
                          {selectedBirthDate
                            ? new Intl.DateTimeFormat(
                                language === "ro" ? "ro-RO" : "en-US",
                                { day: "numeric", month: "long", year: "numeric" }
                              ).format(selectedBirthDate)
                            : "—"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-1 items-start gap-3 rounded-[var(--sx-radius-card)] border bg-muted/50 p-4 text-left">
                      <ShieldCheck className="mt-0.5 size-5 shrink-0" />
                      <p className="text-sm leading-6 text-muted-foreground">
                        {c.birthdayPrivacy}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="mx-auto max-w-2xl">
                <div className="text-center">
                  <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">
                    {c.experienceTitle}
                  </h1>
                  <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
                    {c.experienceDescription}
                  </p>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2 sm:mt-8">
                  {experienceOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          experience: option.id,
                        }))
                      }
                      className={cn(
                        "flex min-h-28 items-start gap-3 rounded-xl border bg-card p-4 text-left transition-[border-color,background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm",
                        draft.experience === option.id &&
                          "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/15"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                          draft.experience === option.id
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border"
                        )}
                      >
                        {draft.experience === option.id ? (
                          <Check className="size-3" />
                        ) : null}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold">
                          {option.label[language]}
                        </span>
                        <span className="mt-1.5 block text-sm leading-6 text-muted-foreground">
                          {option.description[language]}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="mx-auto max-w-2xl">
                <div className="text-center">
                  <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">
                    {c.goalTitle}
                  </h1>
                  <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
                    {c.goalDescription}
                  </p>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2 sm:mt-8">
                  {goalOptions.map((option) => {
                    const Icon = option.icon;
                    const selected = draft.goal === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            goal: option.id,
                          }))
                        }
                        className={cn(
                          "relative flex min-h-24 items-center gap-4 rounded-xl border bg-card p-4 text-left transition-[border-color,background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm",
                          selected &&
                            "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/15"
                        )}
                        aria-pressed={selected}
                      >
                        <span
                          className={cn(
                            "flex size-10 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground",
                            selected &&
                              "border-primary bg-primary text-primary-foreground"
                          )}
                        >
                          <Icon className="size-4" />
                        </span>
                        <span className="font-semibold">
                          {option.label[language]}
                        </span>
                        {selected ? (
                          <Check className="absolute right-4 top-4 size-4" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 7 && (
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
                            ? "border-primary bg-primary/5 text-foreground shadow-sm"
                            : "hover:border-foreground/35"
                        )}
                      >
                        {option.label[language]}
                        <span className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-md border",
                          selected ? "border-primary bg-primary text-primary-foreground" : "border-border"
                        )}>
                          {selected ? <Check className="h-3 w-3" /> : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 8 && (
              <div>
                <div className="text-center">
                  <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">{c.readyTitle}</h1>
                  <p className="mt-3 text-muted-foreground">{c.readyDescription}</p>
                </div>

                <div className="mx-auto mt-6 max-w-xl rounded-lg border bg-card p-5 shadow-sm sm:mt-8">
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
                    <Sparkles className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        <footer className="onboarding-reveal onboarding-reveal-footer mx-auto w-full max-w-xl shrink-0 pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center gap-3">
            {step > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => moveToStep(step - 1)}
                disabled={saving || transitionLocked}
                className="h-12"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">{c.back}</span>
              </Button>
            ) : null}
            <Button
              type="button"
              size="lg"
              disabled={
                !canContinue || saving || transitionLocked
              }
              onClick={() => {
                if (step === totalSteps - 1) {
                  void finishOnboarding();
                } else {
                  moveToStep(step + 1);
                }
              }}
              className="h-12 flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {step === totalSteps - 1
                ? registration
                  ? c.createAccount
                  : c.complete
                : c.continue}
              {!saving ? <ArrowRight className="h-4 w-4" /> : null}
            </Button>
          </div>
          <p className="mt-2 truncate text-center text-xs text-muted-foreground/70 sm:mt-3">
            {registration ? c.registrationEmail : c.emailVerified} {accountEmail}
          </p>
        </footer>
      </div>
    </div>
  );
}
