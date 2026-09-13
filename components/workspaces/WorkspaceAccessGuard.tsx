"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import {
  WORKSPACE_SETUP_VERSION,
  canAccessWorkspaceForAccount,
  getDefaultWorkspaceKind,
  getDefaultWorkspaceRoute,
  getWorkspacePersonaFromMetadata,
  workspaceMetadataKeys,
  type WorkspaceKind,
} from "@/lib/workspaces";

export function WorkspaceAccessGuard({
  children,
  kind,
}: {
  children: React.ReactNode;
  kind: WorkspaceKind;
}) {
  const router = useRouter();
  const provisioningRef = useRef(false);
  const { isAdmin, loading, user } = useAuth();
  const metadata = user?.user_metadata as Record<string, unknown> | undefined;
  const persona = getWorkspacePersonaFromMetadata(metadata) || "learner";
  const allowed = Boolean(
    user && canAccessWorkspaceForAccount(persona, kind, isAdmin)
  );

  useEffect(() => {
    if (loading || !user || allowed) return;
    router.replace(getDefaultWorkspaceRoute(persona));
  }, [allowed, loading, persona, router, user]);

  useEffect(() => {
    if (!user || !allowed || isAdmin || provisioningRef.current) return;
    const setupVersion = Number(
      metadata?.[workspaceMetadataKeys.setupVersion] || 0
    );
    if (setupVersion >= WORKSPACE_SETUP_VERSION) return;

    provisioningRef.current = true;
    void (async () => {
      try {
        const { error } = await supabase.rpc("provision_default_workspaces", {
          p_persona: persona,
          p_workspace_name: null,
        });
        if (error) throw error;
        const activeKind = getDefaultWorkspaceKind(persona);
        const { error: metadataError } = await api.auth.updateUserMetadata({
          [workspaceMetadataKeys.activeWorkspaceKind]: activeKind,
          [workspaceMetadataKeys.setupVersion]: WORKSPACE_SETUP_VERSION,
        });
        if (metadataError) throw metadataError;
      } catch (error) {
        provisioningRef.current = false;
        console.warn("Could not finish workspace provisioning.", error);
      }
    })();
  }, [allowed, isAdmin, metadata, persona, user]);

  if (loading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-56 w-full rounded-2xl" />
      </div>
    );
  }

  if (!user || !allowed) return null;
  return children;
}
