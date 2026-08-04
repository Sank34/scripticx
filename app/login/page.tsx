"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { siGoogle } from "simple-icons";
import { api } from "@/lib/api";
import { onboardingMetadataKeys } from "@/lib/onboarding";
import { AppModal } from "@/components/ui/app-modal";

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useLanguage } from "@/components/LanguageProvider";

type AuthAction = "login" | "register" | "google" | null;

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

export default function LoginPage() {
  const [loading, setLoading] = useState(true);
  const [authAction, setAuthAction] = useState<AuthAction>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  const router = useRouter();
  const { t } = useLanguage();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState({
    title: "",
    description: "",
    type: "info" as "error" | "success" | "info",
  });

  useEffect(() => {
    async function checkUser() {
      const { data } = await api.auth.getSession();

      if (data.session) {
        router.replace("/dashboard");
      } else {
        setLoading(false);
      }
    }

    void checkUser();
  }, [router]);

  function showModal(
    title: string,
    description: string,
    type: "error" | "success" | "info" = "info"
  ) {
    setModalData({ title, description, type });
    setModalOpen(true);
  }

  async function handleLogin() {
    if (!email.trim() || !password) return;

    setAuthAction("login");
    const { error } = await api.auth.signInWithPassword(email.trim(), password);
    setAuthAction(null);

    if (error) {
      showModal(t("login.modal.loginErrorTitle"), error.message, "error");
      return;
    }

    router.replace("/dashboard");
  }

  async function handleRegister() {
    if (!username.trim()) {
      showModal(t("common.error"), t("login.modal.usernameRequired"), "error");
      return;
    }

    if (!email.trim() || !password) return;

    setAuthAction("register");
    const { data, error } = await api.auth.signUp(email.trim(), password, {
      [onboardingMetadataKeys.required]: true,
    });

    if (error) {
      setAuthAction(null);
      showModal(t("login.modal.registerErrorTitle"), error.message, "error");
      return;
    }

    const user = data.user;

    if (user) {
      try {
        await api.profiles.saveRegistrationProfile(user.id, username);
      } catch (profileError) {
        setAuthAction(null);
        showModal(
          t("login.modal.registerErrorTitle"),
          profileError instanceof Error
            ? profileError.message
            : t("login.modal.profileError"),
          "error"
        );
        return;
      }
    }

    setAuthAction(null);
    if (data.session) {
      router.replace("/dashboard");
      return;
    }

    showModal(
      t("login.modal.accountCreatedTitle"),
      t("login.modal.accountCreatedDescription"),
      "success"
    );
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

  if (loading) return null;

  return (
    <div className="flex min-h-[calc(100vh-140px)] items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            {t("login.title")}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
            disabled={authAction !== null}
          >
            {authAction === "google" ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            {t("login.googleButton")}
          </Button>

          <div className="flex items-center gap-3" aria-hidden="true">
            <div className="h-px flex-1 bg-zinc-200" />
            <span className="text-xs text-zinc-500">{t("login.or")}</span>
            <div className="h-px flex-1 bg-zinc-200" />
          </div>

          <Tabs defaultValue="login" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t("login.tabs.login")}</TabsTrigger>
              <TabsTrigger value="register">{t("login.tabs.register")}</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-3">
              <Input
                type="email"
                autoComplete="email"
                placeholder={t("login.email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Input
                placeholder={t("login.password")}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void handleLogin();
                }}
              />

              <div className="flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-sm text-zinc-600 underline-offset-4 hover:text-zinc-950 hover:underline"
                >
                  {t("login.forgotPassword")}
                </Link>
              </div>

              <Button
                onClick={handleLogin}
                className="w-full"
                disabled={authAction !== null || !email.trim() || !password}
              >
                {authAction === "login" && (
                  <LoaderCircle className="size-4 animate-spin" />
                )}
                {t("login.loginButton")}
              </Button>
            </TabsContent>

            <TabsContent value="register" className="space-y-3">
              <Input
                type="email"
                autoComplete="email"
                placeholder={t("login.email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Input
                placeholder={t("login.password")}
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <Input
                autoComplete="username"
                placeholder={t("login.username")}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />

              <Button
                onClick={handleRegister}
                className="w-full"
                disabled={
                  authAction !== null ||
                  !email.trim() ||
                  !password ||
                  !username.trim()
                }
              >
                {authAction === "register" && (
                  <LoaderCircle className="size-4 animate-spin" />
                )}
                {t("login.registerButton")}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <AppModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={modalData.title}
        description={modalData.description}
        type={modalData.type}
      />
    </div>
  );
}
