"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { useLanguage } from "@/components/LanguageProvider";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

const copy = {
  en: {
    accept: "Join class",
    accepted: "This invitation was accepted.",
    back: "Back to classes",
    decline: "Decline",
    declined: "This invitation was declined.",
    description: (name: string) => `${name} invited you to join this class.`,
    signIn: "Sign in to view this invitation.",
    title: (name: string) => `Join ${name}`,
    unavailable: "This class invitation is no longer available.",
  },
  ro: {
    accept: "Intră în clasă",
    accepted: "Această invitație a fost acceptată.",
    back: "Înapoi la clase",
    decline: "Refuză",
    declined: "Această invitație a fost refuzată.",
    description: (name: string) => `${name} te-a invitat să intri în această clasă.`,
    signIn: "Autentifică-te pentru a vedea invitația.",
    title: (name: string) => `Intră în ${name}`,
    unavailable: "Această invitație nu mai este disponibilă.",
  },
} as const;

type Invitation = {
  classId: string;
  className: string;
  id: string;
  inviterName: string;
  status: "accepted" | "declined" | "pending";
};

export default function ClassInvitationPage() {
  const params = useParams<{ invitationId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { locale: activeLocale } = useLanguage();
  const locale = activeLocale === "ro" ? "ro" : "en";
  const c = copy[locale];
  const [responding, setResponding] = useState(false);
  const invitationQuery = useQuery({
    queryKey: ["class-invitation", params.invitationId, user?.id],
    enabled: Boolean(params.invitationId && user?.id),
    queryFn: async (): Promise<Invitation | null> => {
      const { data: invitation, error } = await supabase
        .from("class_invitations")
        .select("id,class_id,user_id,invited_by,status")
        .eq("id", params.invitationId)
        .eq("user_id", user!.id)
        .maybeSingle<{
          class_id: string;
          id: string;
          invited_by: string;
          status: string;
          user_id: string;
        }>();
      if (error) throw error;
      if (!invitation) return null;
      const [{ data: classRow, error: classError }, { data: inviter, error: inviterError }] =
        await Promise.all([
          supabase.from("classes").select("name").eq("id", invitation.class_id).maybeSingle<{ name: string }>(),
          supabase.from("profiles").select("username").eq("id", invitation.invited_by).maybeSingle<{ username: string | null }>(),
        ]);
      if (classError) throw classError;
      if (inviterError) throw inviterError;
      if (!classRow) return null;
      return {
        classId: invitation.class_id,
        className: classRow.name,
        id: invitation.id,
        inviterName: inviter?.username || "A teacher",
        status: invitation.status === "accepted" || invitation.status === "declined"
          ? invitation.status
          : "pending",
      };
    },
  });

  async function respond(accept: boolean) {
    const invitation = invitationQuery.data;
    if (!invitation || responding) return;
    setResponding(true);
    const { data, error } = await supabase.rpc("respond_class_invitation", {
      p_accept: accept,
      p_invitation_id: invitation.id,
    });
    setResponding(false);
    if (error) return toast.error(error.message);
    await queryClient.invalidateQueries({ queryKey: ["class-invitation"] });
    await queryClient.invalidateQueries({ queryKey: ["classes"] });
    if (accept) router.replace(`/classes/${String(data)}`);
  }

  const invitation = invitationQuery.data;
  return (
    <PageContainer className="sx-page space-y-7">
      <PageHeader
        action={<Button variant="outline" onClick={() => router.push("/classes")}>{c.back}</Button>}
        subtitle={invitation ? c.description(invitation.inviterName) : undefined}
        title={invitation ? c.title(invitation.className) : "Class invitation"}
      />
      {authLoading || (Boolean(user) && invitationQuery.isPending) ? (
        <Skeleton className="h-64 rounded-[var(--sx-radius-card)]" />
      ) : !user ? (
        <Card><CardContent className="py-16 text-center">{c.signIn}</CardContent></Card>
      ) : !invitation ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">{c.unavailable}</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="space-y-5 py-7">
            <div>
              <p className="text-xl font-semibold">{invitation.className}</p>
              <p className="mt-2 text-sm text-muted-foreground">{c.description(invitation.inviterName)}</p>
            </div>
            {invitation.status === "pending" ? (
              <div className="flex flex-wrap gap-3">
                <Button disabled={responding} onClick={() => void respond(true)}>{c.accept}</Button>
                <Button disabled={responding} variant="outline" onClick={() => void respond(false)}>{c.decline}</Button>
              </div>
            ) : (
              <p className="rounded-[var(--sx-radius-control)] bg-muted px-4 py-3 text-sm text-muted-foreground">
                {invitation.status === "accepted" ? c.accepted : c.declined}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
