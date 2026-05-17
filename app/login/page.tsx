"use client";

import { useState, useEffect } from "react"; 
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
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
import { translations } from "@/lib/i18n";

export default function LoginPage() {
  const [loading, setLoading] = useState(true); 

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  const router = useRouter();

  const { locale } = useLanguage();

  const t = (key: string) => {
    const keys = key.split(".");
    let value: any = translations[locale];

    for (const k of keys) {
      value = value?.[k];
    }

    return value || key;
  };

  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState({
    title: "",
    description: "",
    type: "info" as "error" | "success" | "info",
  });

  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        router.replace("/dashboard"); 
      } else {
        setLoading(false);
      }
    }

    checkUser();
  }, []);

  function showModal(
    title: string,
    description: string,
    type: "error" | "success" | "info" = "info"
  ) {
    setModalData({ title, description, type });
    setModalOpen(true);
  }

  async function handleLogin() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      showModal(t("login.modal.loginErrorTitle"), error.message, "error");
      return;
    }

    router.replace("/dashboard");
  }

  async function handleRegister() {
    if (!username) {
      showModal(t("common.error"), t("login.modal.usernameRequired"), "error");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      showModal(t("login.modal.registerErrorTitle"), error.message, "error");
      return;
    }

    const user = data.user;

    if (user) {
      await supabase.from("profiles").upsert({
        id: user.id,
        username: username.toLowerCase(),
        role: "user",
      });
    }

    showModal(
      t("login.modal.accountCreatedTitle"),
      t("login.modal.accountCreatedDescription"),
      "success"
    );
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

          <Tabs defaultValue="login" className="space-y-4">

            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="login">{t("login.tabs.login")}</TabsTrigger>
              <TabsTrigger value="register">{t("login.tabs.register")}</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-3">

              <Input
                placeholder={t("login.email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Input
                placeholder={t("login.password")}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <Button onClick={handleLogin} className="w-full">
                {t("login.loginButton")}
              </Button>

            </TabsContent>

            <TabsContent value="register" className="space-y-3">

              <Input
                placeholder={t("login.email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Input
                placeholder={t("login.password")}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <Input
                placeholder={t("login.username")}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />

              <Button onClick={handleRegister} className="w-full">
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