import { NextResponse } from "next/server";

import {
  createInstallationToken,
  getGitHubAppConfig,
  listInstallationRepositories,
} from "@/lib/server/githubApp";
import { githubRouteError } from "@/lib/server/githubRoute";
import { requireUser } from "@/lib/server/requestSecurity";
import { createAdminSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ClassRow = {
  archived_at: string | null;
  id: string;
  name: string;
  subject: string | null;
  teacher_id: string;
};

export async function GET(request: Request) {
  try {
    const { role, user } = await requireUser(request);
    getGitHubAppConfig();
    const admin = createAdminSupabase();

    const [membershipsResult, projectsResult, teacherMembershipsResult] = await Promise.all([
      admin
        .from("github_installation_users")
        .select("installation_id")
        .eq("user_id", user.id),
      admin
        .from("snippets")
        .select("id,title,description,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100),
      role === "admin"
        ? Promise.resolve({ data: [], error: null })
        : admin
            .from("class_members")
            .select("class_id")
            .eq("user_id", user.id)
            .eq("role", "teacher"),
    ]);
    if (membershipsResult.error) throw membershipsResult.error;
    if (projectsResult.error) throw projectsResult.error;
    if (teacherMembershipsResult.error) throw teacherMembershipsResult.error;

    const installationIds = (membershipsResult.data || []).map((row) =>
      Number(row.installation_id)
    );
    const installationsResult = installationIds.length
      ? await admin
          .from("github_installations")
          .select(
            "installation_id,account_login,account_type,repository_selection,suspended_at"
          )
          .in("installation_id", installationIds)
      : { data: [], error: null };
    if (installationsResult.error) throw installationsResult.error;

    let classes: ClassRow[] = [];
    if (role === "admin") {
      const { data, error } = await admin
        .from("classes")
        .select("id,name,subject,teacher_id,archived_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      classes = (data || []) as ClassRow[];
    } else {
      const memberClassIds = (teacherMembershipsResult.data || []).map((row) =>
        String(row.class_id)
      );
      const [ownedResult, memberResult] = await Promise.all([
        admin
          .from("classes")
          .select("id,name,subject,teacher_id,archived_at")
          .eq("teacher_id", user.id)
          .order("created_at", { ascending: false }),
        memberClassIds.length
          ? admin
              .from("classes")
              .select("id,name,subject,teacher_id,archived_at")
              .in("id", memberClassIds)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (ownedResult.error) throw ownedResult.error;
      if (memberResult.error) throw memberResult.error;
      classes = Array.from(
        new Map(
          ([...(ownedResult.data || []), ...(memberResult.data || [])] as ClassRow[]).map(
            (classRow) => [classRow.id, classRow]
          )
        ).values()
      );
    }

    const activeInstallations = (installationsResult.data || []).filter(
      (installation) => !installation.suspended_at
    );
    const repositories = (
      await Promise.all(
        activeInstallations.map(async (installation) => {
          const installationId = Number(installation.installation_id);
          return listInstallationRepositories(
            installationId,
            await createInstallationToken(installationId)
          );
        })
      )
    )
      .flat()
      .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));

    const projectIds = (projectsResult.data || []).map((project) => String(project.id));
    const classIds = classes.map((classRow) => classRow.id);
    const [projectLinksResult, classLinksResult] = await Promise.all([
      projectIds.length
        ? admin
            .from("github_project_links")
            .select(
              "project_id,installation_id,repository_id,owner,repo,default_branch,current_branch,updated_at"
            )
            .eq("user_id", user.id)
            .in("project_id", projectIds)
        : Promise.resolve({ data: [], error: null }),
      classIds.length
        ? admin
            .from("github_class_links")
            .select(
              "id,class_id,installation_id,repository_id,owner,repo,default_branch,current_branch,updated_at"
            )
            .in("class_id", classIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (projectLinksResult.error) throw projectLinksResult.error;
    if (classLinksResult.error) throw classLinksResult.error;

    return NextResponse.json({
      associations: {
        classes: (classLinksResult.data || []).map((link) => ({
          branch: link.current_branch,
          classId: link.class_id,
          defaultBranch: link.default_branch,
          id: link.id,
          installationId: Number(link.installation_id),
          owner: link.owner,
          repo: link.repo,
          repositoryId: Number(link.repository_id),
          updatedAt: link.updated_at,
        })),
        projects: (projectLinksResult.data || []).map((link) => ({
          branch: link.current_branch,
          defaultBranch: link.default_branch,
          installationId: Number(link.installation_id),
          owner: link.owner,
          projectId: link.project_id,
          repo: link.repo,
          repositoryId: Number(link.repository_id),
          updatedAt: link.updated_at,
        })),
      },
      classes: classes.map((classRow) => ({
        archived: Boolean(classRow.archived_at),
        id: classRow.id,
        name: classRow.name,
        subject: classRow.subject,
      })),
      configured: true,
      installations: (installationsResult.data || []).map((installation) => ({
        accountLogin: installation.account_login,
        accountType: installation.account_type,
        id: Number(installation.installation_id),
        repositorySelection: installation.repository_selection,
        suspended: Boolean(installation.suspended_at),
      })),
      projects: (projectsResult.data || []).map((project) => ({
        description: project.description || null,
        id: project.id,
        title: project.title || "Untitled project",
        updatedAt: project.created_at || null,
      })),
      repositories,
    });
  } catch (error) {
    return githubRouteError(error, "Could not load GitHub Companion");
  }
}
