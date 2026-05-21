"use client";

import { useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { CheckCircle2, Send } from "lucide-react";

import { useLanguage } from "@/components/LanguageProvider";
import { supabase } from "@/lib/supabase";
import { Footer } from "@/components/Footer";

type Topic = "bug" | "feature" | "account" | "feedback" | "other";

export default function ContactPage() {
  const { locale } = useLanguage();

  const copy = locale === "ro"
    ? {
        title: "Contact",
        subtitle: "Spune-ne despre problema ta și revenim cât putem de repede.",
        name: "Nume",
        namePlaceholder: "Numele tău",
        email: "Email",
        emailPlaceholder: "tu@exemplu.com",
        topic: "Subiect",
        topicPlaceholder: "Alege un subiect",
        topics: {
          bug: "Raportează un bug",
          feature: "Sugestie de funcționalitate",
          account: "Problemă cu contul",
          feedback: "Feedback general",
          other: "Altceva",
        } as Record<Topic, string>,
        description: "Descriere",
        descriptionPlaceholder: "Descrie problema sau întrebarea ta…",
        submit: "Trimite mesajul",
        submitting: "Se trimite…",
        successTitle: "Mesaj trimis!",
        successText: "Mulțumim. Vom reveni cu un răspuns la adresa ta de email.",
        successAgain: "Trimite alt mesaj",
        errorRequired: "Te rugăm să completezi toate câmpurile.",
        errorEmail: "Te rugăm să introduci o adresă de email validă.",
        errorGeneric: "Ceva nu a funcționat. Încearcă din nou.",
      }
    : {
        title: "Contact",
        subtitle: "Tell us what's going on and we'll get back to you soon.",
        name: "Name",
        namePlaceholder: "Your name",
        email: "Email",
        emailPlaceholder: "you@example.com",
        topic: "Topic",
        topicPlaceholder: "Pick a topic",
        topics: {
          bug: "Report a bug",
          feature: "Feature suggestion",
          account: "Account issue",
          feedback: "General feedback",
          other: "Something else",
        } as Record<Topic, string>,
        description: "Description",
        descriptionPlaceholder: "Describe your issue or question…",
        submit: "Send message",
        submitting: "Sending…",
        successTitle: "Message sent!",
        successText: "Thanks. We'll get back to you at the email you provided.",
        successAgain: "Send another message",
        errorRequired: "Please fill in every field.",
        errorEmail: "Please enter a valid email address.",
        errorGeneric: "Something went wrong. Please try again.",
      };

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<Topic | "">("");
  const [description, setDescription] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function reset() {
    setName("");
    setEmail("");
    setTopic("");
    setDescription("");
    setError(null);
    setDone(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !topic || !description.trim()) {
      setError(copy.errorRequired);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(copy.errorEmail);
      return;
    }

    setSubmitting(true);

    const { error: insertError } = await supabase
      .from("contact_messages")
      .insert({
        name,
        email,
        topic,
        description,
      });

    setSubmitting(false);

    if (insertError) {
      setError(copy.errorGeneric);
      return;
    }

    setDone(true);
  }

  return (
    <div className="flex flex-col">

      <div className="p-6 max-w-2xl w-full mx-auto space-y-8">

        <div>
          <h1 className="text-3xl font-bold">{copy.title}</h1>
          <p className="text-muted-foreground">{copy.subtitle}</p>
        </div>

        <Card>
          <CardContent className="p-6">

            {done ? (
              <div className="flex flex-col items-center text-center gap-3 py-6">
                <div className="rounded-full bg-emerald-100 p-3">
                  <CheckCircle2 size={24} className="text-emerald-600" />
                </div>
                <h2 className="text-lg font-semibold">{copy.successTitle}</h2>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {copy.successText}
                </p>
                <Button
                  variant="outline"
                  onClick={reset}
                  className="mt-2 rounded-xl"
                >
                  {copy.successAgain}
                </Button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5">

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">{copy.name}</label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={copy.namePlaceholder}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">{copy.email}</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={copy.emailPlaceholder}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{copy.topic}</label>
                  <Select
                    value={topic}
                    onValueChange={(v) => setTopic(v as Topic)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={copy.topicPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(copy.topics) as Topic[]).map((key) => (
                        <SelectItem key={key} value={key}>
                          {copy.topics[key]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    {copy.description}
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={copy.descriptionPlaceholder}
                    rows={6}
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl"
                >
                  <Send size={16} />
                  {submitting ? copy.submitting : copy.submit}
                </Button>

              </form>
            )}

          </CardContent>
        </Card>

      </div>

      <Footer />

    </div>
  );
}
