"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type { User } from "@supabase/supabase-js";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, LoaderCircle, LogOut } from "lucide-react";
import { siGithub, siGoogle } from "simple-icons";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  getRegistrationBirthDate,
} from "@/lib/birthday";
import { savePrivateBirthDate } from "@/lib/birthdayData";
import {
  clearPendingEmailVerification,
  emailVerificationBroadcastChannel,
  emailVerificationStorageKey,
  isEmailVerified,
  readPendingEmailVerification,
  storePendingEmailVerification,
  type EmailVerificationSignal,
} from "@/lib/email-verification";
import {
  getOnboardingPersona,
  normalizeOnboardingUsername,
  productTourStorageKey,
  type OnboardingDraft,
} from "@/lib/onboarding";
import {
  buildRegistrationMetadata,
  registrationProfileMetadataKeys,
} from "@/lib/registration-onboarding";
import {
  saveAccountSession,
  type SavedScripticXAccount,
} from "@/lib/account-switcher";
import {
  activateSavedAccount,
  logoutCurrentAccount,
  logoutSavedAccount,
} from "@/lib/account-session-manager";
import { supabase } from "@/lib/supabase";
import { getWorkspaceLandingRoute } from "@/lib/workspaces";
import { AppModal } from "@/components/ui/app-modal";
import { RegistrationVerification } from "@/components/onboarding/RegistrationVerification";
import { PasswordlessSignInDialog } from "@/components/auth/PasswordlessSignInDialog";
import { UserAvatar } from "@/components/user/UserAvatar";
import { useSavedAccounts } from "@/hooks/useSavedAccounts";

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useLanguage } from "@/components/LanguageProvider";

type AuthAction =
  | "login"
  | "register"
  | "google"
  | "github"
  | "resend"
  | "signout"
  | "verify"
  | null;

type RegistrationCredentials = {
  email: string;
  password: string;
  username: string;
};

type BrandMessage = {
  keyword: string;
  statement: string;
};

const loginSparkles = [
  { x: "2%", y: "18%", dx: "12px", dy: "-12px", delay: "0s", duration: "3.4s", size: "7px" },
  { x: "18%", y: "96%", dx: "-8px", dy: "-15px", delay: "-1.1s", duration: "3.1s", size: "5px" },
  { x: "43%", y: "-10%", dx: "10px", dy: "8px", delay: "-2.2s", duration: "3.7s", size: "6px" },
  { x: "68%", y: "92%", dx: "14px", dy: "-11px", delay: "-0.6s", duration: "3.3s", size: "4px" },
  { x: "87%", y: "2%", dx: "-10px", dy: "13px", delay: "-1.7s", duration: "3.8s", size: "7px" },
  { x: "98%", y: "62%", dx: "-16px", dy: "-7px", delay: "-2.8s", duration: "3.5s", size: "5px" },
] as const;

function LoginBrandSparkles() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute -inset-x-4 -inset-y-3"
    >
      {loginSparkles.map((sparkle, index) => (
        <span
          key={index}
          className="login-brand-sparkle-particle"
          style={
            {
              "--sparkle-delay": sparkle.delay,
              "--sparkle-duration": sparkle.duration,
              "--sparkle-dx": sparkle.dx,
              "--sparkle-dy": sparkle.dy,
              "--sparkle-size": sparkle.size,
              "--sparkle-x": sparkle.x,
              "--sparkle-y": sparkle.y,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}

function LoginBrandMascot() {
  const trackerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) return;

    let animationFrame = 0;

    function followPointer(event: PointerEvent) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        const tracker = trackerRef.current;
        if (!tracker) return;

        const horizontal = (event.clientX / window.innerWidth - 0.5) * 2;
        const vertical = (event.clientY / window.innerHeight - 0.5) * 2;

        tracker.style.setProperty("--mascot-follow-x", `${horizontal * 7}px`);
        tracker.style.setProperty("--mascot-follow-y", `${vertical * 5}px`);
        tracker.style.setProperty(
          "--mascot-follow-rotation",
          `${horizontal * 0.65}deg`
        );
      });
    }

    window.addEventListener("pointermove", followPointer, { passive: true });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("pointermove", followPointer);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="login-brand-mascot pointer-events-none absolute -bottom-16 -right-4 z-0 w-32 select-none xl:-bottom-20 xl:right-0 xl:w-40"
    >
      <div ref={trackerRef} className="login-brand-mascot-tracker">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/mascota-soricel.png"
          alt=""
          className="login-brand-mascot-image block h-auto w-full"
        />
      </div>
    </div>
  );
}

function AnimatedBrandStatement({ messages }: { messages: BrandMessage[] }) {
  const [activeMessage, setActiveMessage] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const interval = window.setInterval(() => {
      setActiveMessage((current) => (current + 1) % messages.length);
    }, 4200);

    return () => window.clearInterval(interval);
  }, [messages.length]);

  const message = messages[activeMessage] || messages[0];
  const measuringMessage = messages.reduce((longest, candidate) =>
    `${candidate.keyword} ${candidate.statement}`.length >
    `${longest.keyword} ${longest.statement}`.length
      ? candidate
      : longest
  );

  return (
    <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-normal xl:text-5xl">
      <span className="sr-only">
        {messages
          .map(({ keyword, statement }) => `${keyword} ${statement}`)
          .join(" ")}
      </span>
      <span
        aria-hidden="true"
        className="relative grid overflow-visible"
      >
        <span className="invisible col-start-1 row-start-1 block">
          {measuringMessage.keyword} {measuringMessage.statement}
        </span>
        <span
          key={`${activeMessage}-${message.keyword}`}
          className="login-brand-message relative col-start-1 row-start-1 block self-center"
        >
          <LoginBrandSparkles />
          <span className="login-brand-keyword relative z-10 inline-block">
            {message.keyword}
          </span>{" "}
          <span className="relative z-10">{message.statement}</span>
        </span>
      </span>
    </h1>
  );
}

const OnboardingExperience = dynamic(
  () =>
    import("@/components/onboarding/OnboardingExperience").then(
      (module) => module.OnboardingExperience
    ),
  { ssr: false }
);

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4 fill-current"
    >
      <path d={siGoogle.path} />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4 fill-current"
    >
      <path d={siGithub.path} />
    </svg>
  );
}

export default function LoginPage() {
  const [loading, setLoading] = useState(true);
  const [loginTransitioning, setLoginTransitioning] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [passwordlessOpen, setPasswordlessOpen] = useState(false);
  const [authAction, setAuthAction] = useState<AuthAction>(null);
  const [savedAccountActionId, setSavedAccountActionId] = useState<
    string | null
  >(null);
  const [savedAccountRemovalId, setSavedAccountRemovalId] = useState<
    string | null
  >(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [registration, setRegistration] =
    useState<RegistrationCredentials | null>(null);
  const [registrationDraft, setRegistrationDraft] =
    useState<OnboardingDraft | null>(null);
  const [registrationUserId, setRegistrationUserId] = useState<string | null>(
    null
  );
  const [registrationVerificationEmail, setRegistrationVerificationEmail] =
    useState<string | null>(null);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<
    string | null
  >(null);

  const router = useRouter();
  const { t, locale } = useLanguage();
  const { accounts: savedAccounts } = useSavedAccounts();
  const savedAccountsCopy = locale === "ro"
    ? {
        title: "Conturi salvate",
        description: "Continuă pe acest dispozitiv fără să introduci parola.",
        continue: "Continuă cu acest cont",
        remove: "Deconectează acest cont de pe dispozitiv",
        removed: "Contul a fost eliminat de pe acest dispozitiv.",
        error: "Contul salvat nu a putut fi activat.",
      }
    : {
        title: "Saved accounts",
        description: "Continue on this device without entering your password.",
        continue: "Continue with this account",
        remove: "Log this account out on this device",
        removed: "The account was removed from this device.",
        error: "The saved account could not be activated.",
      };
  const brandMessages: BrandMessage[] = [
    {
      keyword: t("login.brandMessages.learn.keyword"),
      statement: t("login.brandMessages.learn.statement"),
    },
    {
      keyword: t("login.brandMessages.build.keyword"),
      statement: t("login.brandMessages.build.statement"),
    },
    {
      keyword: t("login.brandMessages.create.keyword"),
      statement: t("login.brandMessages.create.statement"),
    },
  ];

  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState({
    title: "",
    description: "",
    type: "info" as "error" | "success" | "info",
  });
  const verificationCheckInFlightRef = useRef(false);
  const loginTransitionTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (authTab !== "register") return;
    void import("@/components/onboarding/OnboardingExperience");
  }, [authTab]);

  useEffect(
    () => () => {
      if (loginTransitionTimerRef.current) {
        window.clearTimeout(loginTransitionTimerRef.current);
      }
    },
    []
  );

  useEffect(() => {
    async function checkUser() {
      try {
        const { data } = await api.auth.getSessionWithTimeout(6_000);

        if (data.session && isEmailVerified(data.session.user)) {
          clearPendingEmailVerification();
          router.replace(
            getWorkspaceLandingRoute(data.session.user.user_metadata)
          );
          return;
        }

        if (data.session) {
          const sessionEmail = data.session.user.email || "";
          storePendingEmailVerification(sessionEmail, data.session.user.id);
          setEmail(sessionEmail);
          setRegistrationUserId(data.session.user.id);
          setRegistrationVerificationEmail(sessionEmail);
          return;
        }

        const pendingVerification = readPendingEmailVerification();
        if (pendingVerification) {
          storePendingEmailVerification(
            pendingVerification.email,
            pendingVerification.userId
          );
          setEmail(pendingVerification.email);
          setRegistrationUserId(pendingVerification.userId);
          setRegistrationVerificationEmail(pendingVerification.email);
        }
      } catch {
        // The form must remain available when the initial session check fails;
        // the explicit login request can still succeed after connectivity recovers.
      } finally {
        setLoading(false);
      }
    }

    void checkUser();
  }, [router]);

  function showModal(
    title: string,
    description: string,
    type: "error" | "success" | "info" = "info",
    verificationEmail: string | null = null
  ) {
    setModalData({ title, description, type });
    setPendingVerificationEmail(verificationEmail);
    setModalOpen(true);
  }

  const finalizeVerifiedRegistration = useCallback(
    async (verifiedUser: User) => {
      const normalizedUsername = normalizeOnboardingUsername(
        registrationDraft?.username ||
          registration?.username ||
          String(
            verifiedUser.user_metadata?.preferred_username ||
              verifiedUser.email?.split("@")[0] ||
              "user"
          )
      );
      const storedBio =
        verifiedUser.user_metadata?.[registrationProfileMetadataKeys.bio];

      try {
        await api.profiles.saveRegistrationProfile(
          verifiedUser.id,
          normalizedUsername,
          registrationDraft?.bio ||
            (typeof storedBio === "string" ? storedBio : undefined)
        );

        const birthDate =
          registrationDraft?.birthDate ||
          getRegistrationBirthDate(verifiedUser.user_metadata);
        if (birthDate) await savePrivateBirthDate(birthDate);

        const { error: workspaceError } = await supabase.rpc(
          "provision_default_workspaces",
          {
            p_persona:
              registrationDraft?.persona ||
              getOnboardingPersona(verifiedUser.user_metadata),
            p_workspace_name: null,
          }
        );
        if (workspaceError) throw workspaceError;

        clearPendingEmailVerification();
        window.localStorage.setItem(productTourStorageKey, verifiedUser.id);
        router.replace(
          getWorkspaceLandingRoute(verifiedUser.user_metadata)
        );
        return true;
      } catch (error) {
        toast.error(t("login.modal.profileError"), {
          description: error instanceof Error ? error.message : undefined,
        });
        return false;
      }
    },
    [registration, registrationDraft, router, t]
  );

  const continueAfterEmailVerification = useCallback(
    async (showPendingFeedback: boolean) => {
      if (verificationCheckInFlightRef.current) return false;

      verificationCheckInFlightRef.current = true;
      setAuthAction("verify");

      try {
        const { data: sessionData } = await api.auth.getSession();
        let verifiedUser = sessionData.session?.user ?? null;

        if (!isEmailVerified(verifiedUser) && registration) {
          const { data, error } = await api.auth.signInWithPassword(
            registration.email,
            registration.password
          );

          if (error) {
            const isPending =
              error.code === "email_not_confirmed" ||
              /email[^.]*not[^.]*confirm/i.test(error.message);

            if (showPendingFeedback) {
              if (isPending) {
                toast.info(t("login.registration.stillPending"));
              } else {
                toast.error(t("login.modal.loginErrorTitle"), {
                  description: error.message,
                });
              }
            }
            return false;
          }

          verifiedUser = data.user;
        }

        if (!verifiedUser || !isEmailVerified(verifiedUser)) {
          if (showPendingFeedback) {
            toast.info(t("login.registration.stillPending"));
          }
          return false;
        }

        return finalizeVerifiedRegistration(verifiedUser);
      } finally {
        verificationCheckInFlightRef.current = false;
        setAuthAction(null);
      }
    },
    [finalizeVerifiedRegistration, registration, t]
  );

  useEffect(() => {
    if (!registrationVerificationEmail) return;

    function signalMatchesCurrentRegistration(
      signal: EmailVerificationSignal | null
    ) {
      return (
        !signal?.userId ||
        !registrationUserId ||
        signal.userId === registrationUserId
      );
    }

    function readSignal(value: string | null) {
      if (!value) return null;
      try {
        return JSON.parse(value) as EmailVerificationSignal;
      } catch {
        return null;
      }
    }

    function continueSilently(signal: EmailVerificationSignal | null = null) {
      if (!signalMatchesCurrentRegistration(signal)) return;
      void continueAfterEmailVerification(false);
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === emailVerificationStorageKey) {
        continueSilently(readSignal(event.newValue));
        return;
      }

      if (event.key === productTourStorageKey && event.newValue) {
        continueSilently();
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") continueSilently();
    }

    const channel =
      typeof window.BroadcastChannel === "undefined"
        ? null
        : new window.BroadcastChannel(emailVerificationBroadcastChannel);
    const handleBroadcast = (event: MessageEvent<EmailVerificationSignal>) => {
      continueSilently(event.data);
    };

    channel?.addEventListener("message", handleBroadcast);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleVisibilityChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      channel?.removeEventListener("message", handleBroadcast);
      channel?.close();
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleVisibilityChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    continueAfterEmailVerification,
    registrationUserId,
    registrationVerificationEmail,
  ]);

  async function handleLogin() {
    if (!email.trim() || !password) return;

    setAuthAction("login");
    const { data, error } = await api.auth.signInWithPassword(
      email.trim(),
      password
    );
    setAuthAction(null);

    if (error) {
      const isEmailNotConfirmed =
        error.code === "email_not_confirmed" ||
        /email[^.]*not[^.]*confirm/i.test(error.message);

      if (isEmailNotConfirmed) {
        showModal(
          t("login.modal.verificationRequiredTitle"),
          t("login.modal.verificationRequiredDescription"),
          "info",
          email.trim()
        );
        return;
      }

      showModal(t("login.modal.loginErrorTitle"), error.message, "error");
      return;
    }

    if (!isEmailVerified(data.user)) {
      showModal(
        t("login.modal.verificationRequiredTitle"),
        t("login.modal.verificationRequiredDescription"),
        "info",
        email.trim()
      );
      return;
    }

    if (data.session) saveAccountSession(data.session);
    router.replace(getWorkspaceLandingRoute(data.user.user_metadata));
  }

  async function continueWithSavedAccount(account: SavedScripticXAccount) {
    if (savedAccountActionId || authAction) return;
    setSavedAccountActionId(account.userId);

    try {
      const session = await activateSavedAccount(account);
      router.replace(getWorkspaceLandingRoute(session.user.user_metadata));
      router.refresh();
    } catch (error) {
      showModal(
        t("login.modal.loginErrorTitle"),
        error instanceof Error ? error.message : savedAccountsCopy.error,
        "error"
      );
    } finally {
      setSavedAccountActionId(null);
    }
  }

  async function forgetSavedAccount(account: SavedScripticXAccount) {
    if (savedAccountActionId || savedAccountRemovalId || authAction) return;
    setSavedAccountRemovalId(account.userId);
    try {
      await logoutSavedAccount(account);
      toast.success(savedAccountsCopy.removed);
    } finally {
      setSavedAccountRemovalId(null);
    }
  }

  async function handleRegister() {
    if (!username.trim()) {
      showModal(t("common.error"), t("login.modal.usernameRequired"), "error");
      return;
    }

    if (!email.trim() || !password || loginTransitioning) return;

    const nextRegistration = {
      email: email.trim(),
      password,
      username: username.trim(),
    };
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reducedMotion) {
      setRegistration(nextRegistration);
      return;
    }

    setLoginTransitioning(true);
    loginTransitionTimerRef.current = window.setTimeout(() => {
      setRegistration(nextRegistration);
      loginTransitionTimerRef.current = null;
    }, 520);
  }

  async function completeRegistrationOnboarding(draft: OnboardingDraft) {
    if (!registration) return false;

    const normalizedUsername = normalizeOnboardingUsername(draft.username);
    if (normalizedUsername.length < 3) {
      toast.error(t("login.modal.usernameRequired"));
      return false;
    }

    setAuthAction("register");
    const metadata = buildRegistrationMetadata({
      draft,
      username: normalizedUsername,
    });
    const { data, error } = await api.auth.signUp(
      registration.email,
      registration.password,
      metadata,
      `${window.location.origin}/auth/callback?flow=verification`
    );

    if (error) {
      setAuthAction(null);
      toast.error(t("login.modal.registerErrorTitle"), {
        description: error.message,
      });
      return false;
    }

    const user = data.user;
    setRegistrationDraft(draft);
    setRegistrationUserId(user?.id ?? null);
    storePendingEmailVerification(registration.email, user?.id ?? null);

    if (user && data.session && isEmailVerified(user)) {
      try {
        await api.profiles.saveRegistrationProfile(
          user.id,
          normalizedUsername,
          draft.bio
        );
        await savePrivateBirthDate(draft.birthDate);
        const { error: workspaceError } = await supabase.rpc(
          "provision_default_workspaces",
          {
            p_persona: draft.persona,
            p_workspace_name: null,
          }
        );
        if (workspaceError) throw workspaceError;
      } catch (profileError) {
        setAuthAction(null);
        toast.error(t("login.modal.registerErrorTitle"), {
          description:
            profileError instanceof Error
              ? profileError.message
              : t("login.modal.profileError"),
        });
        return false;
      }
    }

    setAuthAction(null);
    if (data.session && isEmailVerified(data.session.user)) {
      window.localStorage.setItem(productTourStorageKey, data.session.user.id);
      router.replace(
        getWorkspaceLandingRoute(data.session.user.user_metadata)
      );
      return true;
    }

    setPassword("");
    setRegistrationVerificationEmail(registration.email);
    return true;
  }

  async function handleResendConfirmation() {
    const verificationEmail =
      registrationVerificationEmail || pendingVerificationEmail;
    if (!verificationEmail || authAction) return;

    setAuthAction("resend");
    const { error } = await api.auth.resendSignupConfirmation(
      verificationEmail,
      `${window.location.origin}/auth/callback?flow=verification`
    );
    setAuthAction(null);

    if (error) {
      toast.error(t("login.modal.resendError"));
      return;
    }

    toast.success(t("login.modal.resendSuccess"));
  }

  async function checkRegistrationVerification() {
    if (authAction) return;
    await continueAfterEmailVerification(true);
  }

  async function handleRegistrationSignOut() {
    if (authAction) return;

    setAuthAction("signout");
    try {
      const { data } = await api.auth.getSession();
      const result = data.session?.user
        ? await logoutCurrentAccount(data.session.user.id)
        : null;
      if (!data.session?.user) {
        const { error } = await api.auth.signOut();
        if (error) throw error;
      }

      verificationCheckInFlightRef.current = false;
      clearPendingEmailVerification();
      setRegistration(null);
      setRegistrationDraft(null);
      setRegistrationUserId(null);
      setRegistrationVerificationEmail(null);
      setPendingVerificationEmail(null);
      setEmail("");
      setPassword("");
      setUsername("");
      setAuthTab("login");

      if (result) {
        router.replace(
          getWorkspaceLandingRoute(result.session.user.user_metadata)
        );
        router.refresh();
      }
    } catch {
      toast.error(t("login.registration.signOutError"));
    } finally {
      setAuthAction(null);
    }
  }

  async function handleGoogleLogin() {
    setAuthAction("google");

    const { error } = await api.auth.signInWithGoogle(
      `${window.location.origin}/auth/callback`
    );

    if (error) {
      setAuthAction(null);
      showModal(t("login.modal.googleErrorTitle"), error.message, "error");
    }
  }

  async function handleGitHubLogin() {
    setAuthAction("github");

    const { error } = await api.auth.signInWithGitHub(
      `${window.location.origin}/auth/callback`
    );

    if (error) {
      setAuthAction(null);
      showModal(t("login.modal.githubErrorTitle"), error.message, "error");
    }
  }

  if (registration && !registrationVerificationEmail) {
    return (
      <OnboardingExperience
        profile={null}
        registration={{
          email: registration.email,
          username: registration.username,
          onSubmit: completeRegistrationOnboarding,
        }}
      />
    );
  }

  if (registrationVerificationEmail) {
    return (
      <RegistrationVerification
        email={registrationVerificationEmail}
        checking={authAction === "verify"}
        resending={authAction === "resend"}
        signingOut={authAction === "signout"}
        onCheck={() => void checkRegistrationVerification()}
        onResend={() => void handleResendConfirmation()}
        onSignOut={() => void handleRegistrationSignOut()}
      />
    );
  }

  return (
    <div
      className={`fixed inset-0 z-40 overflow-y-auto bg-background ${
        loginTransitioning ? "login-screen-leave" : ""
      }`}
    >
      <div className="grid min-h-full lg:grid-cols-[minmax(320px,0.85fr)_minmax(520px,1.15fr)]">
        <aside className="relative hidden overflow-hidden border-r bg-muted/20 p-10 lg:flex lg:flex-col lg:justify-between xl:p-14">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/scripticx-logo-lung.png"
            alt="ScripticX"
            className="h-auto w-36 dark:brightness-0 dark:invert"
          />
          <div className="relative z-10 max-w-lg pb-6">
            <p className="text-sm font-medium text-muted-foreground">
              {t("login.brandLabel")}
            </p>
            <AnimatedBrandStatement messages={brandMessages} />
            <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">
              {t("login.brandDescription")}
            </p>
          </div>
          <p className="relative z-10 text-xs text-muted-foreground">
            © 2026 ScripticX
          </p>
          <LoginBrandMascot />
        </aside>

        <main className="flex min-h-full items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/scripticx-logo-lung.png"
                alt="ScripticX"
                className="h-auto w-32 dark:brightness-0 dark:invert"
              />
            </div>

            <div className="mb-6">
              <h2 className="text-3xl font-semibold tracking-normal">
                {authTab === "login"
                  ? t("login.signInTitle")
                  : t("login.registerTitle")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {authTab === "login"
                  ? t("login.signInDescription")
                  : t("login.registerDescription")}
              </p>
            </div>

            <Card className="relative overflow-hidden shadow-sm" aria-busy={loading}>
              {loading ? (
                <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-muted">
                  <div className="h-full w-full animate-pulse bg-foreground" />
                </div>
              ) : null}
              <CardContent className="space-y-5 p-5 sm:p-6">
                {authTab === "login" && savedAccounts.length ? (
                  <section className="rounded-xl border bg-muted/25 p-2">
                    <div className="px-2 pb-2 pt-1">
                      <p className="text-sm font-medium">{savedAccountsCopy.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {savedAccountsCopy.description}
                      </p>
                    </div>
                    <div className="max-h-52 space-y-1 overflow-y-auto">
                      {savedAccounts.map((account) => (
                        <div
                          key={account.userId}
                          className="flex min-w-0 items-center gap-2 rounded-lg bg-background p-2 shadow-sm"
                        >
                          <UserAvatar
                            avatarUrl={account.avatarUrl}
                            username={account.username}
                            email={account.email}
                            className="size-9"
                          />
                          <button
                            type="button"
                            className="min-w-0 flex-1 text-left"
                            onClick={() => void continueWithSavedAccount(account)}
                            disabled={Boolean(savedAccountActionId) || Boolean(savedAccountRemovalId) || authAction !== null}
                          >
                            <span className="block truncate text-sm font-medium">
                              {account.nickname}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {account.email}
                            </span>
                          </button>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            title={savedAccountsCopy.continue}
                            aria-label={savedAccountsCopy.continue}
                            disabled={Boolean(savedAccountActionId) || Boolean(savedAccountRemovalId) || authAction !== null}
                            onClick={() => void continueWithSavedAccount(account)}
                          >
                            {savedAccountActionId === account.userId ? (
                              <LoaderCircle className="animate-spin" />
                            ) : (
                              <ArrowRight />
                            )}
                          </Button>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            className="text-muted-foreground hover:text-destructive"
                            title={savedAccountsCopy.remove}
                            aria-label={`${savedAccountsCopy.remove}: ${account.nickname}`}
                            disabled={Boolean(savedAccountActionId) || Boolean(savedAccountRemovalId) || authAction !== null}
                            onClick={() => void forgetSavedAccount(account)}
                          >
                            {savedAccountRemovalId === account.userId ? (
                              <LoaderCircle className="animate-spin" />
                            ) : (
                              <LogOut />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                <Tabs
                  value={authTab}
                  onValueChange={(value) =>
                    setAuthTab(value as "login" | "register")
                  }
                  className="space-y-5"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">{t("login.tabs.login")}</TabsTrigger>
                    <TabsTrigger value="register">{t("login.tabs.register")}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login" className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="login-email" className="text-sm font-medium">
                        {t("login.email")}
                      </label>
                      <Input
                        id="login-email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <label htmlFor="login-password" className="text-sm font-medium">
                          {t("login.password")}
                        </label>
                        <Link
                          href="/forgot-password"
                          className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                        >
                          {t("login.forgotPassword")}
                        </Link>
                      </div>
                      <Input
                        id="login-password"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") void handleLogin();
                        }}
                      />
                    </div>

                    <Button
                      onClick={handleLogin}
                      className="w-full"
                      disabled={loading || authAction !== null || !email.trim() || !password}
                    >
                      {authAction === "login" ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : null}
                      {t("login.loginButton")}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full text-muted-foreground hover:text-foreground"
                      onClick={() => setPasswordlessOpen(true)}
                      disabled={loading || authAction !== null}
                    >
                      <KeyRound className="size-4" />
                      {t("login.passwordless.open")}
                    </Button>
                  </TabsContent>

                  <TabsContent value="register" className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="register-email" className="text-sm font-medium">
                        {t("login.email")}
                      </label>
                      <Input
                        id="register-email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="register-password" className="text-sm font-medium">
                        {t("login.password")}
                      </label>
                      <Input
                        id="register-password"
                        type="password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="register-username" className="text-sm font-medium">
                        {t("login.username")}
                      </label>
                      <Input
                        id="register-username"
                        autoComplete="username"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                      />
                    </div>
                    <Button
                      onClick={handleRegister}
                      className="w-full"
                      disabled={
                        authAction !== null ||
                        loading ||
                        !email.trim() ||
                        !password ||
                        !username.trim()
                      }
                    >
                      {authAction === "register" ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : null}
                      {t("login.registerButton")}
                    </Button>
                  </TabsContent>
                </Tabs>

                <div className="flex items-center gap-3" aria-hidden="true">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">{t("login.or")}</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleLogin}
                    disabled={loading || authAction !== null}
                  >
                    {authAction === "google" ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <GoogleIcon />
                    )}
                    {t("login.googleButton")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleGitHubLogin}
                    disabled={loading || authAction !== null}
                  >
                    {authAction === "github" ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <GitHubIcon />
                    )}
                    {t("login.githubButton")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      <PasswordlessSignInDialog
        initialEmail={email}
        open={passwordlessOpen}
        onOpenChange={setPasswordlessOpen}
      />

      <AppModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={modalData.title}
        description={modalData.description}
        type={modalData.type}
        closeLabel={t("login.modal.close")}
        actionLabel={
          pendingVerificationEmail
            ? t("login.modal.resendConfirmation")
            : t("login.modal.ok")
        }
        actionLoading={authAction === "resend"}
        onAction={
          pendingVerificationEmail ? handleResendConfirmation : undefined
        }
      />
    </div>
  );
}
