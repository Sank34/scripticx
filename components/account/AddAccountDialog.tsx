"use client";

import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { ArrowLeft, ArrowRight, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { siGithub, siGoogle } from "simple-icons";
import { toast } from "sonner";

import { useLanguage } from "@/components/LanguageProvider";
import { UserAvatar } from "@/components/user/UserAvatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { saveAccountSession } from "@/lib/account-switcher";
import { GITHUB_AUTH_SCOPES } from "@/lib/github-auth";
import { onboardingMetadataKeys } from "@/lib/onboarding";
import { supabase } from "@/lib/supabase";
import { getWorkspaceLandingRoute } from "@/lib/workspaces";

type AddAccountDialogProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

type AccountPreview = {
  avatarUrl: string | null;
  username: string | null;
};

const ACCOUNT_OAUTH_MESSAGE = "scripticx:add-account-oauth";

type AccountOAuthPayload = {
  accessToken?: string;
  error?: string;
  refreshToken?: string;
  type?: string;
};

type AccountOAuthProvider = "github" | "google";

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

function createSecondaryClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        flowType: "implicit",
        persistSession: false,
      },
    }
  );
}

export function AddAccountDialog({ open, onOpenChange }: AddAccountDialogProps) {
  const router = useRouter();
  const { locale } = useLanguage();
  const { profile, user } = useAuth();
  const ro = locale === "ro";
  const copy = ro
    ? {
        addTitle: "Adaugă încă un cont",
        addDescription: "Autentifică-te fără să pierzi sesiunea contului curent.",
        back: "Înapoi",
        continue: "Continuă",
        email: "Email",
        emailConfirmation: "Verifică emailul pentru a confirma contul, apoi revino și autentifică-te.",
        error: "Contul nu a putut fi adăugat.",
        githubError: "Autentificarea cu GitHub nu a putut fi finalizată.",
        githubLogin: "Continuă cu GitHub",
        githubRegister: "Creează cont cu GitHub",
        googleError: "Autentificarea cu Google nu a putut fi finalizată.",
        googleLogin: "Continuă cu Google",
        googleRegister: "Creează cont cu Google",
        login: "Autentificare",
        loginButton: "Autentifică-te",
        nickname: "Nickname pentru acest dispozitiv",
        nicknameDescription: "Nickname-ul te ajută să recunoști rapid contul în switcher. Nu îți schimbă username-ul public.",
        nicknamePlaceholder: "Ex. Școală, Personal, Profesor",
        nicknameTitle: "Cum vrei să numim acest cont?",
        or: "sau cu email",
        password: "Parolă",
        popupBlocked: "Browserul a blocat fereastra de autentificare. Permite pop-up-urile și încearcă din nou.",
        popupClosed: "Fereastra de autentificare a fost închisă prea devreme.",
        register: "Cont nou",
        registerButton: "Creează contul",
        sameAccount: "Acesta este deja contul activ.",
        signedInAs: "Autentificat ca",
        success: "Cont adăugat și activat.",
        username: "Username",
      }
    : {
        addTitle: "Add another account",
        addDescription: "Sign in without losing the session for your current account.",
        back: "Back",
        continue: "Continue",
        email: "Email",
        emailConfirmation: "Check your email to confirm the account, then return and sign in.",
        error: "The account could not be added.",
        githubError: "GitHub authentication could not be completed.",
        githubLogin: "Continue with GitHub",
        githubRegister: "Sign up with GitHub",
        googleError: "Google authentication could not be completed.",
        googleLogin: "Continue with Google",
        googleRegister: "Sign up with Google",
        login: "Sign in",
        loginButton: "Sign in",
        nickname: "Nickname on this device",
        nicknameDescription: "The nickname helps you recognize this account in the switcher. It does not change your public username.",
        nicknamePlaceholder: "e.g. School, Personal, Teacher",
        nicknameTitle: "What should we call this account?",
        or: "or use email",
        password: "Password",
        popupBlocked: "Your browser blocked the authentication window. Allow pop-ups and try again.",
        popupClosed: "The authentication window was closed too early.",
        register: "New account",
        registerButton: "Create account",
        sameAccount: "This is already the active account.",
        signedInAs: "Signed in as",
        success: "Account added and activated.",
        username: "Username",
      };
  const clientRef = useRef<SupabaseClient | null>(null);
  const [step, setStep] = useState<"auth" | "nickname">("auth");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [nickname, setNickname] = useState("");
  const [pendingSession, setPendingSession] = useState<Session | null>(null);
  const [preview, setPreview] = useState<AccountPreview>({
    avatarUrl: null,
    username: null,
  });
  const [loading, setLoading] = useState(false);
  const [oauthProvider, setOauthProvider] =
    useState<AccountOAuthProvider | null>(null);
  const [message, setMessage] = useState<{
    text: string;
    tone: "error" | "info";
  } | null>(null);

  function getClient() {
    if (!clientRef.current) clientRef.current = createSecondaryClient();
    return clientRef.current;
  }

  function reset() {
    clientRef.current = null;
    setStep("auth");
    setMode("login");
    setEmail("");
    setPassword("");
    setUsername("");
    setNickname("");
    setPendingSession(null);
    setPreview({ avatarUrl: null, username: null });
    setLoading(false);
    setOauthProvider(null);
    setMessage(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && loading) return;
    onOpenChange(nextOpen);
    if (!nextOpen) window.setTimeout(reset, 150);
  }

  async function loadPreview(client: SupabaseClient, session: Session) {
    const { data } = await client
      .from("profiles")
      .select("username,avatar_url")
      .eq("id", session.user.id)
      .maybeSingle<{ username: string | null; avatar_url: string | null }>();
    const metadata = session.user.user_metadata || {};
    const resolvedUsername =
      data?.username ||
      (typeof metadata.preferred_username === "string"
        ? metadata.preferred_username
        : typeof metadata.user_name === "string"
          ? metadata.user_name
          : null);
    const avatarUrl =
      data?.avatar_url ||
      (typeof metadata.avatar_url === "string"
        ? metadata.avatar_url
        : typeof metadata.picture === "string"
          ? metadata.picture
          : null);

    return { username: resolvedUsername, avatarUrl };
  }

  async function continueWithSession(client: SupabaseClient, session: Session) {
    if (session.user.id === user?.id) {
      setMessage({ text: copy.sameAccount, tone: "info" });
      return;
    }

    const accountPreview = await loadPreview(client, session);
    setPreview(accountPreview);
    setPendingSession(session);
    setNickname(
      accountPreview.username || session.user.email?.split("@")[0] || ""
    );
    setPassword("");
    setMessage(null);
    setStep("nickname");
  }

  async function authenticate() {
    if (!email.trim() || !password || loading) return;
    if (mode === "register" && !username.trim()) return;

    setLoading(true);
    setMessage(null);
    const client = getClient();

    try {
      if (mode === "login") {
        const { data, error } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        if (!data.session) throw new Error(copy.error);
        await continueWithSession(client, data.session);
      } else {
        const { data, error } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              [onboardingMetadataKeys.required]: true,
              locale,
              preferred_username: username.trim(),
            },
            emailRedirectTo: `${window.location.origin}/auth/callback?flow=verification`,
          },
        });
        if (error) throw error;

        if (!data.session) {
          setPassword("");
          setMessage({ text: copy.emailConfirmation, tone: "info" });
          return;
        }

        if (data.user) {
          const { error: profileError } = await client.from("profiles").upsert({
            id: data.user.id,
            username: username.trim().toLowerCase(),
          });
          if (profileError) throw profileError;
        }

        await continueWithSession(client, data.session);
      }
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : copy.error,
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  async function authenticateWithProvider(provider: AccountOAuthProvider) {
    if (loading) return;

    const providerError =
      provider === "github" ? copy.githubError : copy.googleError;

    const width = 520;
    const height = 700;
    const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
    const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);
    const popup = window.open(
      "",
      `scripticx-add-account-${provider}`,
      `popup=yes,width=${width},height=${height},left=${left},top=${top}`
    );

    if (!popup) {
      setMessage({ text: copy.popupBlocked, tone: "error" });
      return;
    }

    setLoading(true);
    setOauthProvider(provider);
    setMessage(null);
    const client = getClient();

    try {
      const { data, error } = await client.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth-account-callback.html`,
          skipBrowserRedirect: true,
          ...(provider === "github"
            ? { scopes: GITHUB_AUTH_SCOPES }
            : {
                queryParams: {
                  access_type: "offline",
                  prompt: "select_account",
                },
              }),
        },
      });
      if (error) throw error;
      if (!data.url) throw new Error(providerError);

      popup.location.replace(data.url);

      const tokens = await new Promise<{
        accessToken: string;
        refreshToken: string;
      }>((resolve, reject) => {
        let finished = false;
        const broadcast =
          typeof BroadcastChannel === "undefined"
            ? null
            : new BroadcastChannel(ACCOUNT_OAUTH_MESSAGE);

        const cleanup = () => {
          finished = true;
          window.removeEventListener("message", handleMessage);
          broadcast?.close();
          window.clearInterval(closedCheck);
          window.clearTimeout(timeout);
        };

        const handlePayload = (payload: AccountOAuthPayload) => {
          if (payload?.type !== ACCOUNT_OAUTH_MESSAGE) return;

          if (payload.error) {
            cleanup();
            reject(new Error(payload.error));
            return;
          }

          if (!payload.accessToken || !payload.refreshToken) {
            cleanup();
            reject(new Error(providerError));
            return;
          }

          cleanup();
          resolve({
            accessToken: payload.accessToken,
            refreshToken: payload.refreshToken,
          });
        };

        const handleMessage = (event: MessageEvent<AccountOAuthPayload>) => {
          if (event.origin !== window.location.origin) return;
          if (event.source !== popup) return;
          handlePayload(event.data);
        };

        window.addEventListener("message", handleMessage);
        if (broadcast) {
          broadcast.onmessage = (
            event: MessageEvent<AccountOAuthPayload>
          ) => handlePayload(event.data);
        }
        const closedCheck = window.setInterval(() => {
          if (!finished && popup.closed) {
            cleanup();
            reject(new Error(copy.popupClosed));
          }
        }, 400);
        const timeout = window.setTimeout(() => {
          if (!finished) {
            cleanup();
            popup.close();
            reject(new Error(providerError));
          }
        }, 120_000);
      });

      popup.close();
      const { data: sessionData, error: sessionError } =
        await client.auth.setSession({
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
        });
      if (sessionError) throw sessionError;
      if (!sessionData.session) throw new Error(providerError);

      await continueWithSession(client, sessionData.session);
    } catch (error) {
      popup.close();
      setMessage({
        text: error instanceof Error ? error.message : providerError,
        tone: "error",
      });
    } finally {
      setLoading(false);
      setOauthProvider(null);
    }
  }

  async function finish() {
    if (!pendingSession || !nickname.trim() || loading) return;
    setLoading(true);
    setMessage(null);

    try {
      const { data: current } = await supabase.auth.getSession();
      if (current.session) {
        saveAccountSession(current.session, {
          avatarUrl: profile?.avatar_url || null,
          username: profile?.username || null,
        });
      }

      saveAccountSession(pendingSession, {
        avatarUrl: preview.avatarUrl,
        nickname,
        username: preview.username,
      });

      const { data, error } = await supabase.auth.setSession({
        access_token: pendingSession.access_token,
        refresh_token: pendingSession.refresh_token,
      });
      if (error) throw error;
      if (!data.session) throw new Error(copy.error);

      saveAccountSession(data.session, {
        avatarUrl: preview.avatarUrl,
        nickname,
        username: preview.username,
      });

      toast.success(copy.success);
      onOpenChange(false);
      window.setTimeout(reset, 150);
      router.replace(getWorkspaceLandingRoute(data.session.user.user_metadata));
      router.refresh();
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : copy.error,
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[min(720px,calc(100dvh-2rem))] overflow-y-auto p-0 sm:max-w-lg"
        showCloseButton={!loading}
      >
        <div className="border-b px-6 py-5">
          <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
            <span className={step === "auth" ? "text-foreground" : undefined}>1</span>
            <span className="h-px w-8 bg-border" />
            <span className={step === "nickname" ? "text-foreground" : undefined}>2</span>
          </div>
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {step === "auth" ? copy.addTitle : copy.nicknameTitle}
            </DialogTitle>
            <DialogDescription>
              {step === "auth" ? copy.addDescription : copy.nicknameDescription}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 pt-2">
          <div
            key={step}
            className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-2 motion-safe:duration-200"
          >
            {step === "auth" ? (
              <Tabs
                value={mode}
                onValueChange={(value) => {
                  setMode(value === "register" ? "register" : "login");
                  setMessage(null);
                }}
                className="space-y-5"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">{copy.login}</TabsTrigger>
                  <TabsTrigger value="register">{copy.register}</TabsTrigger>
                </TabsList>

                <div className="space-y-4">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => void authenticateWithProvider("google")}
                      disabled={loading}
                    >
                      {oauthProvider === "google" ? (
                        <LoaderCircle className="animate-spin" />
                      ) : (
                        <GoogleIcon />
                      )}
                      {mode === "register"
                        ? copy.googleRegister
                        : copy.googleLogin}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => void authenticateWithProvider("github")}
                      disabled={loading}
                    >
                      {oauthProvider === "github" ? (
                        <LoaderCircle className="animate-spin" />
                      ) : (
                        <GitHubIcon />
                      )}
                      {mode === "register"
                        ? copy.githubRegister
                        : copy.githubLogin}
                    </Button>
                  </div>
                  <div
                    className="flex items-center gap-3"
                    aria-hidden="true"
                  >
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs text-muted-foreground">
                      {copy.or}
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                </div>

                <TabsContent value="login" className="space-y-3">
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder={copy.email}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoFocus
                  />
                  <Input
                    type="password"
                    autoComplete="current-password"
                    placeholder={copy.password}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void authenticate();
                    }}
                  />
                  <Button
                    className="mt-2 w-full"
                    onClick={() => void authenticate()}
                    disabled={loading || !email.trim() || !password}
                  >
                    {loading ? <LoaderCircle className="animate-spin" /> : null}
                    {copy.loginButton}
                  </Button>
                </TabsContent>

                <TabsContent value="register" className="space-y-3">
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder={copy.email}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                  <Input
                    type="password"
                    autoComplete="new-password"
                    placeholder={copy.password}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <Input
                    autoComplete="username"
                    placeholder={copy.username}
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void authenticate();
                    }}
                  />
                  <Button
                    className="mt-2 w-full"
                    onClick={() => void authenticate()}
                    disabled={
                      loading ||
                      !email.trim() ||
                      !password ||
                      !username.trim()
                    }
                  >
                    {loading ? <LoaderCircle className="animate-spin" /> : null}
                    {copy.registerButton}
                  </Button>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
                  <UserAvatar
                    avatarUrl={preview.avatarUrl}
                    username={preview.username}
                    email={pendingSession?.user.email}
                    className="size-10"
                  />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{copy.signedInAs}</p>
                    <p className="truncate font-medium">
                      {preview.username || pendingSession?.user.email}
                    </p>
                    {preview.username ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {pendingSession?.user.email}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="account-nickname" className="text-sm font-medium">
                    {copy.nickname}
                  </label>
                  <Input
                    id="account-nickname"
                    value={nickname}
                    onChange={(event) => setNickname(event.target.value)}
                    placeholder={copy.nicknamePlaceholder}
                    maxLength={40}
                    autoFocus
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void finish();
                    }}
                  />
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setStep("auth");
                      setPendingSession(null);
                      setMessage(null);
                    }}
                    disabled={loading}
                  >
                    <ArrowLeft />
                    {copy.back}
                  </Button>
                  <Button
                    onClick={() => void finish()}
                    disabled={loading || !nickname.trim()}
                  >
                    {loading ? <LoaderCircle className="animate-spin" /> : null}
                    {copy.continue}
                    {!loading ? <ArrowRight /> : null}
                  </Button>
                </div>
              </div>
            )}

            {message ? (
              <p
                role="status"
                className={
                  message.tone === "error"
                    ? "mt-4 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                    : "mt-4 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
                }
              >
                {message.text}
              </p>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
