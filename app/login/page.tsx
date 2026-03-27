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

export default function LoginPage() {
  const [loading, setLoading] = useState(true); 

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  const router = useRouter();

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
      showModal("Unable to sign in", error.message, "error");
      return;
    }

    router.replace("/dashboard");
  }

  async function handleRegister() {
    if (!username) {
      showModal("Error", "Username is required", "error");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      showModal("Unable to sign up", error.message, "error");
      return;
    }

    const user = data.user;

    if (user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          username,
          role: "user",
        });

      if (profileError) {
        console.error("PROFILE ERROR:", profileError);
      }
    }

    showModal(
      "Account created",
      "You can now log in.",
      "success"
    );
  }

  if (loading) return null;

  return (
    <div className="p-6 max-w-sm mx-auto">

      <h1 className="text-xl font-bold mb-4">Welcome</h1>

      <Tabs defaultValue="login" className="space-y-4">

        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="register">Register</TabsTrigger>
        </TabsList>

        {/* LOGIN */}
        <TabsContent value="login" className="space-y-3">

          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border p-2 w-full rounded-md"
          />

          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border p-2 w-full rounded-md"
          />

          <button
            onClick={handleLogin}
            className="bg-black text-white p-2 w-full rounded-md hover:opacity-90"
          >
            Login
          </button>

        </TabsContent>

        {/* REGISTER */}
        <TabsContent value="register" className="space-y-3">

          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border p-2 w-full rounded-md"
          />

          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border p-2 w-full rounded-md"
          />

          <input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="border p-2 w-full rounded-md"
          />

          <button
            onClick={handleRegister}
            className="bg-black text-white p-2 w-full rounded-md hover:opacity-90"
          >
            Create Account
          </button>

        </TabsContent>

      </Tabs>

      {/* MODAL */}
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