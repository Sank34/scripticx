"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { AppModal } from "@/components/ui/app-modal";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState({
    title: "",
    description: "",
    type: "info" as "error" | "success" | "info",
  });

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

    router.push("/dashboard");
  }

  async function handleRegister() {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      showModal("Unable to sign up", error.message, "error");
      return;
    }

    showModal(
      "Check your email",
      "We sent you a confirmation link.",
      "success"
    );
  }

  return (
    <div className="p-6 space-y-4 max-w-sm mx-auto">
      <h1 className="text-xl font-bold">Login</h1>

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

      <button
        onClick={handleRegister}
        className="border p-2 w-full rounded-md hover:bg-muted"
      >
        Register
      </button>

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