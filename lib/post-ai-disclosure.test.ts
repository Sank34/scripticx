import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const author = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
const postId = "00000000-0000-4000-8000-000000000003";
const migration = readFileSync(new URL("../supabase/migrations/20261021180000_post_ai_disclosure.sql", import.meta.url), "utf8");
let db: PGlite;
let legacyDisclosure: unknown;

async function login(user: string | null = author, role = "authenticated") {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user || ""]);
  await db.exec(`set role ${role}`);
}

async function mark(checked: boolean | null) {
  return db.query<{ marked: boolean }>("select public.set_post_ai_generated($1, $2) as marked", [postId, checked]);
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create schema auth;
    create role anon;
    create role authenticated;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create table public.profiles(id uuid primary key, banned boolean default false);
    create table public.posts(id uuid primary key, user_id uuid, content text, code text, image_url text);
    grant select on public.posts to anon, authenticated;
  `);
  await db.query("insert into public.posts values ($1, $2, 'Existing post', null, null)", [postId, author]);
  await db.exec(migration);
  legacyDisclosure = (await db.query<{ is_ai_generated: boolean }>("select is_ai_generated from public.posts")).rows[0].is_ai_generated;
});

beforeEach(async () => {
  await db.exec("reset role; truncate public.posts, public.profiles");
  await db.query("insert into public.profiles(id) values ($1), ($2)", [author, other]);
  await db.query("insert into public.posts(id, user_id, content, code, image_url) values ($1, $2, 'Original content', 'PRINT 1', 'https://example.com/image.png')", [postId, author]);
  await login();
});

afterAll(async () => { await db?.close(); });

describe("post AI disclosure persistence and permissions", () => {
  it("keeps existing and new posts unmarked by default", async () => {
    expect(legacyDisclosure).toBe(false);
    expect((await db.query<{ is_ai_generated: boolean }>("select is_ai_generated from public.posts")).rows[0].is_ai_generated).toBe(false);
  });

  it("allows the author to mark and unmark without changing other content", async () => {
    expect((await mark(true)).rows[0].marked).toBe(true);
    expect((await db.query("select * from public.posts")).rows[0]).toMatchObject({
      id: postId, user_id: author, content: "Original content", code: "PRINT 1", image_url: "https://example.com/image.png", is_ai_generated: true,
    });
    expect((await mark(false)).rows[0].marked).toBe(false);
  });

  it("rejects another account and does not clear the author's disclosure", async () => {
    await mark(true);
    await login(other);
    await expect(mark(false)).rejects.toThrow("Post unavailable or not owned by you");
    expect((await db.query<{ is_ai_generated: boolean }>("select is_ai_generated from public.posts")).rows[0].is_ai_generated).toBe(true);
  });

  it("does not grant execution to anonymous users", async () => {
    await login(null, "anon");
    await expect(mark(true)).rejects.toThrow("permission denied");
  });

  it("requires an authenticated identity even if the database role is authenticated", async () => {
    await login(null);
    await expect(mark(true)).rejects.toThrow("Authentication required");
  });

  it("rejects banned and missing profiles", async () => {
    await db.exec("reset role");
    await db.query("update public.profiles set banned = true where id = $1", [author]);
    await login();
    await expect(mark(true)).rejects.toThrow("Account cannot update posts");
    await db.exec("reset role; delete from public.profiles");
    await login();
    await expect(mark(true)).rejects.toThrow("Account cannot update posts");
  });

  it("rejects null values and missing posts without reporting success", async () => {
    await expect(mark(null)).rejects.toThrow("AI disclosure must be a boolean");
    await db.exec("reset role; delete from public.posts");
    await login();
    await expect(mark(true)).rejects.toThrow("Post unavailable or not owned by you");
  });

  it("can be applied again without resetting existing declarations", async () => {
    await mark(true);
    await db.exec("reset role");
    await db.exec(migration);
    expect((await db.query<{ is_ai_generated: boolean }>("select is_ai_generated from public.posts")).rows[0].is_ai_generated).toBe(true);
  });
});
