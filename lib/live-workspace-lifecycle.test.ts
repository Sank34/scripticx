import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createLiveWorkspaceDocument, parseLiveWorkspace, serializeLiveWorkspace } from "./editor-live-workspace";
import { createProjectFile } from "./editor-project";

const owner = "00000000-0000-4000-8000-000000000001";
const guest = "00000000-0000-4000-8000-000000000002";
const projectId = "00000000-0000-4000-8000-000000000003";
let db: PGlite;
let migratedProjectCode: unknown;
let migratedRoomCode: unknown;
const document = (content = "print(42)", id?: string) => serializeLiveWorkspace(createLiveWorkspaceDocument({
  files: [createProjectFile("src/main.py", content)], directories: [], title: "Python project",
  project: id ? { ownerId: owner, projectId: id } : null,
}));
const login = (id: string) => db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
async function room(code = document()) {
  await login(owner);
  const result = await db.query<{ id: string; project_id: string; code: string }>("insert into live_rooms(owner_id,name,code,status) values ($1,'Live test',$2,'active') returning *", [owner, code]);
  return result.rows[0];
}
async function invite(roomId: string) {
  await db.query("insert into room_participants(room_id,user_id,status) values ($1,$2,'accepted')", [roomId, guest]);
  await login(guest);
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth; create role authenticated;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table snippets(id uuid primary key default gen_random_uuid(),user_id uuid not null,title text,description text,code text,files jsonb,is_public boolean default true);
    create table live_rooms(id uuid primary key default gen_random_uuid(),owner_id uuid not null,name text,code text,status text,created_at timestamptz default now(),ended_at timestamptz);
    create table room_participants(id uuid default gen_random_uuid(),room_id uuid,user_id uuid,status text,unique(room_id,user_id));`);
  await db.query("insert into snippets(id,user_id,title,code,files) values ($1,$2,'Latest project','latest owner code','[]')", [projectId, owner]);
  await db.query("insert into live_rooms(owner_id,name,status,code) values ($1,'Old session','closed',$2)", [owner, document("outdated snapshot", projectId)]);
  await db.exec(readFileSync(new URL("../supabase/migrations/20261018151000_live_workspace_project_lifecycle.sql", import.meta.url), "utf8"));
  migratedProjectCode = (await db.query<{ code: string }>("select code from snippets where id=$1", [projectId])).rows[0].code;
  migratedRoomCode = (await db.query<{ code: string | null }>("select code from live_rooms")).rows[0].code;
}, 30_000);
beforeEach(async () => { await login(""); await db.exec("truncate room_participants,live_rooms,snippets"); });
afterAll(async () => { await db.close(); });

describe("database Live Share lifecycle", () => {
  it("removes closed snapshots without overwriting a newer linked project during migration", () => {
    expect(migratedProjectCode).toBe("latest owner code");
    expect(migratedRoomCode).toBeNull();
  });

  it("creates exactly one private project in the owner's account for an unsaved session", async () => {
    const created = await room();
    const projects = await db.query<{ user_id: string; is_public: boolean }>("select * from snippets");
    expect(projects.rows).toHaveLength(1);
    expect(projects.rows[0]).toMatchObject({ user_id: owner, is_public: false });
    expect(parseLiveWorkspace(created.code).project?.projectId).toBe(created.project_id);
  });

  it("saves an accepted guest's edits into the same owner project while the owner is absent", async () => {
    const created = await room();
    await invite(created.id);
    await db.query("select save_live_workspace($1,$2)", [created.id, document("print('guest edit')")]);
    const projects = await db.query<{ code: string; user_id: string; files: unknown[] }>("select * from snippets");
    expect(projects.rows).toHaveLength(1);
    expect(projects.rows[0]).toMatchObject({ user_id: owner, code: "print('guest edit')" });
    expect(projects.rows[0].files).toEqual(expect.arrayContaining([expect.objectContaining({ path: "src/main.py" })]));
    const current = (await db.query<{ project_id: string; code: string }>("select * from live_rooms where id=$1", [created.id])).rows[0];
    expect(current.project_id).toBe(created.project_id);
    expect(parseLiveWorkspace(current.code).project?.ownerId).toBe(owner);
  });

  it("keeps the existing project identity and prevents collaborators from redirecting writes", async () => {
    await db.query("insert into snippets(id,user_id,title,code,files) values ($1,$2,'Original','','[]')", [projectId, owner]);
    const created = await room(document("original", projectId));
    expect(created.project_id).toBe(projectId);
    expect((await db.query<{ is_public: boolean }>("select is_public from snippets where id=$1", [projectId])).rows[0].is_public).toBe(false);
    await invite(created.id);
    await db.query("select save_live_workspace($1,$2)", [created.id, document("changed", "00000000-0000-4000-8000-000000000099")]);
    expect((await db.query("select id from snippets")).rows).toEqual([{ id: projectId }]);
    expect((await db.query<{ code: string }>("select code from snippets where id=$1", [projectId])).rows[0].code).toBe("changed");
  });

  it("keeps history but removes guest access to files when a session ends", async () => {
    const created = await room();
    await invite(created.id);
    await db.query("select save_live_workspace($1,$2)", [created.id, document("final changes")]);
    await login(owner);
    await db.query("update snippets set is_public=true where id=$1", [created.project_id]);
    await db.query("select close_live_workspace($1)", [created.id]);
    expect((await db.query<{ is_public: boolean }>("select is_public from snippets where id=$1", [created.project_id])).rows[0].is_public).toBe(false);
    expect((await db.query("select code,status from live_rooms where id=$1", [created.id])).rows[0]).toEqual({ code: null, status: "closed" });
    await login(guest);
    const closed = (await db.query<{ result: { code: string | null; project_id: string | null; name: string } }>("select get_live_workspace($1) as result", [created.id])).rows[0].result;
    expect(closed).toMatchObject({ name: "Live test", code: null, project_id: null });
    await expect(db.query("select save_live_workspace($1,$2)", [created.id, document("late edit")])).rejects.toThrow("access denied");
    await login(owner);
    const restored = (await db.query<{ result: { code: string } }>("select get_live_workspace($1) as result", [created.id])).rows[0].result;
    expect(parseLiveWorkspace(restored.code).files[0].content).toBe("final changes");
    expect(parseLiveWorkspace(restored.code).project?.projectId).toBe(created.project_id);
  });

  it("rejects outsiders, removed members and attempts to end somebody else's session", async () => {
    const created = await room();
    await login(guest);
    await expect(db.query("select save_live_workspace($1,$2)", [created.id, document()])).rejects.toThrow("access denied");
    await expect(db.query("select close_live_workspace($1)", [created.id])).rejects.toThrow("Only the owner");
    await db.query("insert into room_participants(room_id,user_id,status) values ($1,$2,'removed')", [created.id, guest]);
    await expect(db.query("select save_live_workspace($1,$2)", [created.id, document()])).rejects.toThrow("access denied");
  });

  it("returns invitation metadata without files until the invitation is accepted", async () => {
    const created = await room();
    await db.query("insert into room_participants(room_id,user_id,status) values ($1,$2,'invited')", [created.id, guest]);
    await login(guest);
    const result = (await db.query<{ result: { code: string | null; name: string } }>("select get_live_workspace($1) as result", [created.id])).rows[0].result;
    expect(result).toMatchObject({ name: "Live test", code: null });
    await db.query("update room_participants set status='accepted' where room_id=$1 and user_id=$2", [created.id, guest]);
    const accepted = (await db.query<{ result: { code: string } }>("select get_live_workspace($1) as result", [created.id])).rows[0].result;
    expect(parseLiveWorkspace(accepted.code).files[0].path).toBe("src/main.py");
  });

  it("rejects direct relinking and direct writes after closure, including the legacy update path", async () => {
    const created = await room();
    await expect(db.query("update live_rooms set project_id=$1 where id=$2", [projectId, created.id])).rejects.toThrow("linked project cannot be changed");
    await db.query("select close_live_workspace($1)", [created.id]);
    await expect(db.query("update live_rooms set code=$1 where id=$2", [document(), created.id])).rejects.toThrow("has ended");
    await expect(db.query("update live_rooms set status='active' where id=$1", [created.id])).rejects.toThrow("has ended");
  });
});
