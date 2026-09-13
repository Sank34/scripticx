"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Command, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user/UserAvatar";
import { competitionApiFetch } from "@/lib/competitionClient";

type Invitee = { id: string; username: string; avatar_url: string | null; invited: boolean };

export function CompetitionInviteeSearch({ competitionId, ro }: { competitionId: string; ro: boolean }) {
  const { user } = useAuth();
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim().replace(/^@+/, "")), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const prefix = ["competition-invitees", competitionId, user?.id];
  const query = useQuery({
    queryKey: [...prefix, debounced],
    enabled: Boolean(user) && debounced.length >= 2,
    queryFn: ({ signal }) => competitionApiFetch<{ users: Invitee[] }>(
      `/api/competitions/${competitionId}/invitees?q=${encodeURIComponent(debounced)}`, { signal }),
  });
  const add = useMutation({
    mutationFn: (person: Invitee) => competitionApiFetch(`/api/competitions/${competitionId}/invitees`, {
      method: "POST", body: JSON.stringify({ userId: person.id }),
    }),
    onSuccess: async (_, person) => {
      client.setQueriesData<{ users: Invitee[] }>({ queryKey: prefix }, (previous) => previous && ({
        users: previous.users.map((entry) => entry.id === person.id ? { ...entry, invited: true } : entry),
      }));
      toast.success(ro ? `@${person.username} a fost invitat.` : `@${person.username} invited.`);
      await client.invalidateQueries({ queryKey: prefix });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const waiting = search.trim().replace(/^@+/, "") !== debounced || query.isFetching;
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{ro ? "Invită utilizatori" : "Invite users"}</p>
      <p className="text-xs text-muted-foreground">{ro
        ? "Caută un username și selectează utilizatorul pentru a-l invita. Acesta se poate înscrie apoi în competiție."
        : "Search a username and select the user to invite them. They can then register for the competition."}</p>
      <Command shouldFilter={false} className="h-auto border">
        <CommandInput value={search} onValueChange={setSearch} maxLength={80}
          aria-label={ro ? "Caută utilizatori de invitat" : "Search users to invite"}
          placeholder={ro ? "Caută un username…" : "Search a username…"} />
        <CommandList>
          {debounced.length < 2 ? <p className="p-3 text-xs text-muted-foreground">{ro ? "Scrie cel puțin 2 caractere." : "Type at least 2 characters."}</p>
            : waiting ? <p role="status" className="p-3 text-sm text-muted-foreground">{ro ? "Se caută…" : "Searching…"}</p>
            : query.isError ? <div role="alert" className="p-3 text-sm"><p>{ro ? "Căutarea nu a reușit." : "Search failed."}</p><Button variant="ghost" size="sm" onClick={() => query.refetch()}>{ro ? "Reîncearcă" : "Retry"}</Button></div>
            : !query.data?.users.length ? <p role="status" className="p-3 text-sm text-muted-foreground">{ro ? "Nu am găsit utilizatori." : "No users found."}</p>
            : query.data.users.map((person) => <CommandItem key={person.id} value={person.id}
              disabled={person.invited || add.isPending} onSelect={() => add.mutate(person)} className="gap-3 py-2">
              <UserAvatar avatarUrl={person.avatar_url} username={person.username} />
              <span className="min-w-0 flex-1 truncate">@{person.username}</span>
              <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                {person.invited ? <Check className="size-4" /> : <Plus className="size-4" />}
                {person.invited ? (ro ? "Invitat" : "Invited") : add.isPending && add.variables.id === person.id ? (ro ? "Se adaugă…" : "Adding…") : (ro ? "Invită" : "Invite")}
              </span>
            </CommandItem>)}
        </CommandList>
      </Command>
    </div>
  );
}
