"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type LiveCodeData } from "@/lib/api";
import { loadLiveInvitation, respondToLiveInvitation } from "@/lib/live-invitations";
import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function LiveInvitationDialog({ roomId, userId, onClose, onAccepted }: {
  roomId: string;
  userId: string;
  onClose: () => void;
  onAccepted: () => void;
}) {
  const { locale } = useLanguage();
  const ro = locale === "ro";
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const invitation = useQuery({
    queryKey: ["live-invitation", userId, roomId],
    queryFn: () => loadLiveInvitation(api.live, roomId, userId),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
  const status = invitation.isError ? "error" : invitation.isFetching ? "loading" : invitation.data?.status;

  async function respond(decision: "accept" | "decline") {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await respondToLiveInvitation(api.live, roomId, userId, decision);
      queryClient.setQueryData<LiveCodeData>(["livecode"], current => current?.userId === userId ? {
        ...current, invites: current.invites.filter(invite => invite.room_id !== roomId),
      } : current);
      void queryClient.invalidateQueries({ queryKey: ["livecode"] });
      void queryClient.invalidateQueries({ queryKey: ["live-invitation", userId, roomId] });
      if (decision === "accept" && result === "accepted") onAccepted();
      else if (result === "accepted") {
        setError(ro ? "Invitația a fost deja acceptată. Poți deschide sesiunea." : "This invitation was already accepted. You can open the session.");
        void invitation.refetch();
      } else onClose();
    } catch {
      setError(ro ? "Răspunsul nu a putut fi salvat. Verifică invitația și încearcă din nou." : "Your response could not be saved. Check the invitation and try again.");
      void invitation.refetch();
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return <Dialog open onOpenChange={open => { if (!open && !busy.current) onClose(); }}>
    <DialogContent showCloseButton={!pending}>
      <DialogHeader>
        <DialogTitle>{ro ? "Invitație Live Share" : "Live Share invitation"}</DialogTitle>
        <DialogDescription className="break-words">
          {status === "loading" ? (ro ? "Se verifică invitația…" : "Checking invitation…")
            : status === "pending" ? (ro ? `Accepți invitația la „${invitation.data?.room?.name || "Live Share"}”?` : `Accept the invitation to “${invitation.data?.room?.name || "Live Share"}”?`)
              : status === "accepted" ? (ro ? "Ai acceptat deja invitația la această sesiune." : "You have already accepted this session invitation.")
                : status === "error" ? (ro ? "Invitația nu a putut fi verificată." : "The invitation could not be checked.")
                  : (ro ? "Invitația nu mai este disponibilă sau sesiunea s-a încheiat." : "The invitation is no longer available or the session has ended.")}
        </DialogDescription>
      </DialogHeader>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter>
        {status === "pending" ? <>
          <Button variant="outline" disabled={pending} onClick={() => void respond("decline")}>{ro ? "Refuză" : "Decline"}</Button>
          <Button disabled={pending} onClick={() => void respond("accept")}>{pending ? (ro ? "Se salvează…" : "Saving…") : (ro ? "Acceptă și intră" : "Accept and join")}</Button>
        </> : <>
          <Button variant="outline" disabled={pending} onClick={onClose}>{ro ? "Închide" : "Close"}</Button>
          {status === "accepted" && <Button disabled={pending} onClick={() => void respond("accept")}>{ro ? "Deschide sesiunea" : "Open session"}</Button>}
          {status === "error" && <Button onClick={() => void invitation.refetch()}>{ro ? "Reîncearcă" : "Retry"}</Button>}
        </>}
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
