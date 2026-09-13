"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, FileText, HelpCircle, Send } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

type Topic = "bug" | "feature" | "account" | "feedback" | "other";

type SupportHistoryRequest = {
  id: string;
  topic: Topic;
  description: string;
  status: "new" | "read" | "resolved";
  created_at: string;
  reference: string;
  replies: Array<{
    id: string;
    sender_name: string;
    sender_address: string;
    subject: string;
    content: string;
    created_at: string;
  }>;
};

const MAX_MESSAGE_LENGTH = 5_000;
const MIN_MESSAGE_LENGTH = 10;

export default function ContactPage() {
  const { locale } = useLanguage();
  const { user, profile } = useAuth();
  const isLoggedIn = !!user;

  const copy = locale === "ro"
    ? {
        title: "Contact",
        subtitle: "Trimite o solicitare echipei ScripticX și urmărește răspunsul prin email.",
        formTitle: "Trimite un mesaj",
        formDescription: "Include detaliile necesare pentru ca solicitarea să poată fi verificată și rezolvată.",
        signedInAs: "Solicitarea va fi asociată contului",
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
        descriptionHint: "Nu include parole, token-uri sau alte date confidențiale.",
        descriptionPlaceholder: "Descrie ce s-a întâmplat, ce rezultat așteptai și pașii prin care problema poate fi reprodusă…",
        characters: "caractere",
        submit: "Trimite mesajul",
        submitting: "Se trimite…",
        successTitle: "Mesaj înregistrat",
        successText: "Confirmarea a fost adăugată în coada de email. Răspunsul echipei va ajunge la aceeași adresă.",
        successFallback: "Mesajul a fost înregistrat. Răspunsul echipei va ajunge la adresa ta de email.",
        reference: "Referință",
        successAgain: "Trimite alt mesaj",
        errorRequired: "Completează toate câmpurile obligatorii.",
        errorEmail: "Introdu o adresă de email validă.",
        errorMessageTooShort: "Mesajul tău este prea scurt! Spune-ne puțin mai multe.",
        errorGeneric: "Mesajul nu a putut fi trimis. Încearcă din nou.",
        resourcesTitle: "Găsește mai repede un răspuns",
        resourcesDescription: "Pentru întrebările uzuale, aceste resurse sunt disponibile imediat.",
        helpTitle: "Centru de ajutor",
        helpText: "Răspunsuri la întrebări frecvente.",
        docsTitle: "Documentație",
        docsText: "Ghiduri pentru editor și MiniScript+.",
        updatesTitle: "Noutăți",
        updatesText: "Schimbări și remedieri recente.",
        historyTitle: "Solicitările tale",
        historyText: "Răspunsurile echipei apar aici și sunt livrate și prin email.",
        historyEmpty: "Nu ai trimis încă nicio solicitare.",
        historyError: "Istoricul nu a putut fi încărcat.",
        historyLoading: "Se încarcă istoricul…",
        historyRetry: "Încearcă din nou",
        historyWaiting: "Solicitarea este înregistrată. Echipa nu a răspuns încă.",
        historyReply: "Răspuns ScripticX Support",
        statuses: { new: "Primită", read: "În verificare", resolved: "Rezolvată" },
      }
    : {
        title: "Contact",
        subtitle: "Submit a request to the ScripticX team and receive the response by email.",
        formTitle: "Send a message",
        formDescription: "Include the details required to review and resolve your request.",
        signedInAs: "This request will be linked to",
        name: "Name",
        namePlaceholder: "Your name",
        email: "Email",
        emailPlaceholder: "you@example.com",
        topic: "Topic",
        topicPlaceholder: "Select a topic",
        topics: {
          bug: "Report a bug",
          feature: "Feature suggestion",
          account: "Account issue",
          feedback: "General feedback",
          other: "Something else",
        } as Record<Topic, string>,
        description: "Description",
        descriptionHint: "Do not include passwords, access tokens, or other confidential data.",
        descriptionPlaceholder: "Describe what happened, what you expected, and the steps required to reproduce the issue…",
        characters: "characters",
        submit: "Send message",
        submitting: "Sending…",
        successTitle: "Message received",
        successText: "The confirmation was added to the email queue. The team response will arrive at the same address.",
        successFallback: "Your message was recorded. The team response will arrive at your email address.",
        reference: "Reference",
        successAgain: "Send another message",
        errorRequired: "Complete all required fields.",
        errorEmail: "Enter a valid email address.",
        errorMessageTooShort: "Your message is too short! Tell us a bit more.",
        errorGeneric: "The message could not be sent. Please try again.",
        resourcesTitle: "Find an answer sooner",
        resourcesDescription: "These resources are available immediately for common questions.",
        helpTitle: "Help center",
        helpText: "Answers to frequently asked questions.",
        docsTitle: "Documentation",
        docsText: "Guides for the editor and MiniScript+.",
        updatesTitle: "What's new",
        updatesText: "Recent changes and resolved issues.",
        historyTitle: "Your requests",
        historyText: "Team replies appear here and are also delivered by email.",
        historyEmpty: "You have not submitted a support request yet.",
        historyError: "Support history could not be loaded.",
        historyLoading: "Loading support history…",
        historyRetry: "Try again",
        historyWaiting: "Your request is recorded. The team has not replied yet.",
        historyReply: "ScripticX Support reply",
        statuses: { new: "Received", read: "In review", resolved: "Resolved" },
      };

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<Topic | "">("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [confirmationQueued, setConfirmationQueued] = useState(false);
  const [history, setHistory] = useState<SupportHistoryRequest[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const userId = user?.id ?? null;

  const accountName = profile?.username
    || user?.user_metadata?.full_name
    || user?.email?.split("@")[0]
    || "";

  const loadHistory = useCallback(async () => {
    if (!userId) {
      setHistory([]);
      return;
    }
    setHistoryLoading(true);
    setHistoryError(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Authentication required");
      const response = await fetch("/api/contact", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = (await response.json()) as { error?: string; requests?: SupportHistoryRequest[] };
      if (!response.ok) throw new Error(result.error || "Could not load support history");
      setHistory(result.requests || []);
    } catch {
      setHistoryError(true);
    } finally {
      setHistoryLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  function reset() {
    setName("");
    setEmail("");
    setTopic("");
    setDescription("");
    setError(null);
    setDone(false);
    setReference(null);
    setConfirmationQueued(false);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const finalName = isLoggedIn ? accountName : name.trim();
    const finalEmail = isLoggedIn ? (user?.email ?? "") : email.trim();

    if (!finalName || !finalEmail || !topic || !description.trim()) {
      setError(copy.errorRequired);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(finalEmail)) {
      setError(copy.errorEmail);
      return;
    }

    if (description.trim().length < MIN_MESSAGE_LENGTH) {
      setError(copy.errorMessageTooShort);
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ name: finalName, email: finalEmail, topic, description, locale }),
      });
      const result = (await response.json()) as {
        confirmationQueued?: boolean;
        error?: string;
        reference?: string;
      };

      if (!response.ok) {
        setError(result.error || copy.errorGeneric);
        return;
      }

      setReference(result.reference || null);
      setConfirmationQueued(result.confirmationQueued === true);
      setDone(true);
      void loadHistory();
    } catch {
      setError(copy.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  }

  const resources = [
    { href: "/help", icon: HelpCircle, title: copy.helpTitle, text: copy.helpText },
    { href: "/docs/basics", icon: FileText, title: copy.docsTitle, text: copy.docsText },
    { href: "/updates", icon: CheckCircle2, title: copy.updatesTitle, text: copy.updatesText },
  ];

  return (
    <PageContainer variant="wide" className="space-y-8 pb-8">
      <PageHeader className="border-b border-border/70 pb-6" title={copy.title} subtitle={copy.subtitle} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="sx-surface overflow-hidden" aria-labelledby="contact-form-title">
          <div className="border-b border-border px-5 py-5 sm:px-7">
            <h2 id="contact-form-title" className="text-lg font-semibold text-foreground">{copy.formTitle}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{copy.formDescription}</p>
          </div>

          <div className="p-5 sm:p-7">
            {done ? (
              <div className="flex min-h-[390px] flex-col items-center justify-center text-center">
                <div className="grid size-10 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-5" aria-hidden="true" />
                </div>
                <h2 className="mt-4 text-xl font-semibold text-foreground">{copy.successTitle}</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  {confirmationQueued ? copy.successText : copy.successFallback}
                </p>
                {reference && (
                  <p className="mt-4 rounded-[var(--sx-radius-control)] border border-border bg-muted/40 px-3 py-1.5 font-mono text-xs text-muted-foreground">
                    {copy.reference}: {reference}
                  </p>
                )}
                <Button variant="outline" onClick={reset} className="mt-6">{copy.successAgain}</Button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-6">
                {isLoggedIn ? (
                  <div className="rounded-[var(--sx-radius-control)] border border-border bg-muted/30 px-4 py-3">
                    <p className="text-xs font-medium text-muted-foreground">{copy.signedInAs}</p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {accountName} <span className="font-normal text-muted-foreground">· {user?.email}</span>
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="contact-name" className="text-sm font-medium text-foreground">{copy.name}</label>
                      <Input id="contact-name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder={copy.namePlaceholder} />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="contact-email" className="text-sm font-medium text-foreground">{copy.email}</label>
                      <Input id="contact-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={copy.emailPlaceholder} />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="contact-topic" className="text-sm font-medium text-foreground">{copy.topic}</label>
                  <Select value={topic} onValueChange={(value) => setTopic(value as Topic)}>
                    <SelectTrigger id="contact-topic" className="w-full">
                      <SelectValue placeholder={copy.topicPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(copy.topics) as Topic[]).map((key) => (
                        <SelectItem key={key} value={key}>{copy.topics[key]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <label htmlFor="contact-description" className="text-sm font-medium text-foreground">{copy.description}</label>
                      <p id="contact-description-hint" className="mt-1 text-xs text-muted-foreground">{copy.descriptionHint}</p>
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {description.length}/{MAX_MESSAGE_LENGTH} {copy.characters}
                    </span>
                  </div>
                  <Textarea
                    id="contact-description"
                    aria-describedby="contact-description-hint"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder={copy.descriptionPlaceholder}
                    maxLength={MAX_MESSAGE_LENGTH}
                    rows={9}
                    className="min-h-48 resize-y"
                  />
                </div>

                {error && (
                  <p role="alert" className="rounded-[var(--sx-radius-control)] border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>
                )}

                <div className="flex justify-end border-t border-border pt-5">
                  <Button type="submit" disabled={submitting} size="lg">
                    <Send aria-hidden="true" />
                    {submitting ? copy.submitting : copy.submit}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </section>

        <aside className="space-y-5 lg:sticky lg:top-6">
          <section className="sx-surface overflow-hidden" aria-labelledby="contact-resources-title">
            <div className="border-b border-border px-5 py-5">
              <h2 id="contact-resources-title" className="font-semibold text-foreground">{copy.resourcesTitle}</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{copy.resourcesDescription}</p>
            </div>
            <nav className="divide-y divide-border" aria-label={copy.resourcesTitle}>
              {resources.map((resource) => (
                <Link key={resource.href} href={resource.href} className="sx-interactive group flex items-center gap-3 px-5 py-4 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                  <span className="grid size-8 shrink-0 place-items-center rounded-[var(--sx-radius-control)] border border-border bg-background text-muted-foreground">
                    <resource.icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">{resource.title}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{resource.text}</span>
                  </span>
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              ))}
            </nav>
          </section>

        </aside>
      </div>

      {isLoggedIn ? (
        <section className="sx-surface overflow-hidden" aria-labelledby="contact-history-title">
          <div className="border-b border-border px-5 py-5 sm:px-7">
            <h2 id="contact-history-title" className="text-lg font-semibold text-foreground">{copy.historyTitle}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{copy.historyText}</p>
          </div>
          {historyLoading && !history.length ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">{copy.historyLoading}</div>
          ) : historyError ? (
            <div className="flex items-center justify-between gap-4 px-5 py-6 sm:px-7">
              <p className="text-sm text-destructive">{copy.historyError}</p>
              <Button variant="outline" onClick={() => void loadHistory()}>{copy.historyRetry}</Button>
            </div>
          ) : history.length ? (
            <div className="divide-y divide-border">
              {history.map((request) => (
                <article key={request.id} className="space-y-4 px-5 py-5 sm:px-7">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{copy.topics[request.topic]}</h3>
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground">{copy.reference}: {request.reference}</p>
                    </div>
                    <span className="rounded-full border border-border bg-muted/30 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                      {copy.statuses[request.status]}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{request.description}</p>
                  {request.replies.length ? (
                    <div className="space-y-3">
                      {request.replies.map((reply) => (
                        <div key={reply.id} className="rounded-[var(--sx-radius-control)] border border-border bg-muted/20 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-foreground">{copy.historyReply}</p>
                            <time className="text-[11px] text-muted-foreground">{new Date(reply.created_at).toLocaleString(locale === "ro" ? "ro-RO" : "en-US")}</time>
                          </div>
                          <p className="mt-2 text-sm font-medium text-foreground">{reply.subject}</p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{plainSupportContent(reply.content)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-[var(--sx-radius-control)] bg-muted/30 px-4 py-3 text-sm text-muted-foreground">{copy.historyWaiting}</p>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">{copy.historyEmpty}</p>
          )}
        </section>
      ) : null}
    </PageContainer>
  );
}

function plainSupportContent(value: string) {
  return value.replace(/<br\s*\/?\s*>/gi, "\n").replace(/<[^>]+>/g, "").trim();
}
