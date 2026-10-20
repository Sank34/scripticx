import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const admin = "00000000-0000-4000-8000-000000000001";
const delegate = "00000000-0000-4000-8000-000000000002";
const ordinary = "00000000-0000-4000-8000-000000000003";
const role = "00000000-0000-4000-8000-000000000004";
let db: PGlite;
async function login(id: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create schema auth; create role authenticated;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.role() returns text language sql stable as $$ select 'authenticated'::text $$;
    grant usage on schema auth to authenticated;
    create table profiles(id uuid primary key,role text,banned boolean default false);
    create table platform_roles(id uuid primary key,permissions text[]);
    create table platform_user_roles(user_id uuid,role_id uuid);
    create table platform_settings(id text primary key,lockdown_enabled boolean,lockdown_mode text);
    create table competition_participants(user_id uuid,status text);
    create table admin_tasks(id uuid primary key default gen_random_uuid(),title text,description text,done boolean default false);
    create table admin_attention_dismissals(item_id text primary key,signature text);
    alter table admin_tasks enable row level security;
    alter table admin_attention_dismissals enable row level security;
    grant select,insert,update,delete on admin_tasks,admin_attention_dismissals to authenticated;
    create policy "admins manage tasks" on admin_tasks for all using (false) with check (false);
    create policy "admins manage dismissals" on admin_attention_dismissals for all using (false) with check (false);
  `);
  const migration = readFileSync(new URL("../supabase/migrations/20260913090000_platform_roles.sql", import.meta.url), "utf8");
  for (const name of ["platform_user_permissions", "has_platform_permission"]) {
    const definition = migration.match(new RegExp(`create function public\\.${name}\\([\\s\\S]*?\\n\\$\\$;`))?.[0];
    if (!definition) throw new Error(`Missing permission function: ${name}`);
    await db.exec(definition);
  }
  await db.exec(migration.split("\n").filter(line => line.startsWith("alter policy") && /on public.admin_(tasks|attention_dismissals) /.test(line)).join("\n"));
}, 30_000);

beforeEach(async () => {
  await db.exec("reset role; truncate admin_tasks,admin_attention_dismissals,profiles,platform_roles,platform_user_roles;");
  await db.query("insert into profiles(id,role) values ($1,'admin'),($2,'user'),($3,'user')", [admin, delegate, ordinary]);
  await db.query("insert into platform_roles values ($1, array['admin.tasks'])", [role]);
  await db.query("insert into platform_user_roles values ($1,$2)", [delegate, role]);
  await db.exec("insert into admin_tasks(title) values ('Existing task')");
});
afterAll(async () => { await db.close(); });

describe("task access through global roles", () => {
  it("lets a non-admin with only admin.tasks read, create, modify and complete tasks", async () => {
    await login(delegate);
    expect((await db.query<{ allowed: boolean }>("select has_platform_permission('admin.analytics') as allowed")).rows[0].allowed).toBe(false);
    expect((await db.query("select * from admin_tasks")).rows).toHaveLength(1);
    const created = (await db.query<{ id: string }>("insert into admin_tasks(title) values ('Delegated task') returning id")).rows[0];
    await db.query("update admin_tasks set title='Edited task',done=true where id=$1", [created.id]);
    expect((await db.query("select title,done from admin_tasks where id=$1", [created.id])).rows).toEqual([{ title: "Edited task", done: true }]);
    await db.exec("insert into admin_attention_dismissals values ('alert','signature')");
    expect((await db.query("select * from admin_attention_dismissals")).rows).toHaveLength(1);
  });

  it("does not grant tasks through an unrelated analytics role", async () => {
    await db.query("update platform_roles set permissions=array['admin.analytics'] where id=$1", [role]);
    await login(delegate);
    expect((await db.query("select * from admin_tasks")).rows).toHaveLength(0);
    expect((await db.query("update admin_tasks set title='Denied' returning id")).rows).toHaveLength(0);
    await expect(db.query("insert into admin_tasks(title) values ('Denied')")).rejects.toThrow(/row-level security/i);
  });

  it("denies users without the permission and preserves full admin access", async () => {
    await login(ordinary);
    expect((await db.query("select * from admin_tasks")).rows).toHaveLength(0);
    await expect(db.query("insert into admin_tasks(title) values ('Denied')")).rejects.toThrow(/row-level security/i);
    await login(admin);
    expect((await db.query("select * from admin_tasks")).rows).toHaveLength(1);
    await db.exec("insert into admin_tasks(title) values ('Admin task')");
  });

  it("revokes database access immediately when the global role is removed or the user is banned", async () => {
    await login(delegate);
    expect((await db.query("select * from admin_tasks")).rows).toHaveLength(1);
    await db.exec("reset role; delete from platform_user_roles;");
    await login(delegate);
    expect((await db.query("select * from admin_tasks")).rows).toHaveLength(0);
    await db.exec("reset role");
    await db.query("insert into platform_user_roles values ($1,$2)", [delegate, role]);
    await db.query("update profiles set banned=true where id=$1", [delegate]);
    await login(delegate);
    await expect(db.query("insert into admin_tasks(title) values ('Denied')")).rejects.toThrow(/row-level security/i);
  });
});
