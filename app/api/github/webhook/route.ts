import { NextResponse } from "next/server";

import { verifyGitHubWebhookSignature } from "@/lib/server/githubApp";
import { createAdminSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type WebhookInstallation = {
  account?: { id?: number; login?: string; type?: string };
  id?: number;
  repository_selection?: string;
  suspended_at?: string | null;
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyGitHubWebhookSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  const event = request.headers.get("x-github-event") || "unknown";
  const deliveryId = request.headers.get("x-github-delivery") || "";
  if (!deliveryId) {
    return NextResponse.json({ error: "Missing webhook delivery ID" }, { status: 400 });
  }

  try {
    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    const admin = createAdminSupabase();
    const { data: existing } = await admin
      .from("github_webhook_deliveries")
      .select("delivery_id")
      .eq("delivery_id", deliveryId)
      .maybeSingle<{ delivery_id: string }>();
    if (existing) return NextResponse.json({ accepted: true, duplicate: true });

    const installation = payload.installation as WebhookInstallation | undefined;
    const action = typeof payload.action === "string" ? payload.action : "";
    if (event === "installation" && installation?.id) {
      if (action === "deleted") {
        await admin
          .from("github_installations")
          .delete()
          .eq("installation_id", installation.id);
      } else if (installation.account?.login) {
        await admin.from("github_installations").upsert(
          {
            installation_id: installation.id,
            account_id: installation.account.id || null,
            account_login: installation.account.login,
            account_type: installation.account.type || "User",
            repository_selection: installation.repository_selection || "selected",
            suspended_at: installation.suspended_at || null,
          },
          { onConflict: "installation_id" }
        );
      }
    }

    if (event === "installation_repositories" && installation?.id) {
      await admin
        .from("github_installations")
        .update({ repository_selection: installation.repository_selection || "selected" })
        .eq("installation_id", installation.id);
    }

    if (event === "push" && installation?.id) {
      const repository = payload.repository as
        | { name?: string; owner?: { login?: string } }
        | undefined;
      const ref = typeof payload.ref === "string" ? payload.ref : "";
      const after = typeof payload.after === "string" ? payload.after : "";
      const branch = ref.startsWith("refs/heads/") ? ref.slice("refs/heads/".length) : "";
      if (repository?.owner?.login && repository.name && branch && after) {
        const { data: links } = await admin
          .from("github_project_links")
          .select("id, head_sha")
          .eq("installation_id", installation.id)
          .eq("owner", repository.owner.login)
          .eq("repo", repository.name)
          .eq("current_branch", branch);
        for (const link of links || []) {
          await admin
            .from("github_project_links")
            .update({
              remote_head_sha: after,
              sync_status: link.head_sha === after ? "clean" : "behind",
            })
            .eq("id", link.id);
        }
      }
    }

    const { error: deliveryError } = await admin.from("github_webhook_deliveries").insert({
      delivery_id: deliveryId,
      event_name: event,
    });
    if (deliveryError?.code !== "23505") throw deliveryError;
    return NextResponse.json({ accepted: true });
  } catch (error) {
    console.error("Could not process GitHub webhook", error);
    return NextResponse.json({ error: "Could not process webhook" }, { status: 500 });
  }
}
