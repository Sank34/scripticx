import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const alice = "00000000-0000-4000-8000-000000000001";
const bob = "00000000-0000-4000-8000-000000000002";
const problem = "00000000-0000-4000-8000-000000000003";
const challenge = "00000000-0000-4000-8000-000000000004";
const verifiedAt = "2026-10-20T10:00:00Z";
let db: PGlite;
let nextId = 10;
async function login(id: string | null = alice) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id ?? ""]);
  await db.exec("set role authenticated");
}
async function submission(score = 100, verified: string | null = verifiedAt, user = alice) {
  await db.exec("reset role");
  const id = `00000000-0000-4000-8000-${String(nextId++).padStart(12, "0")}`;
  await db.query("insert into submissions(id,user_id,problem_id,score,created_at,verified_at,verification_source) values ($1,$2,$3,$4,'2026-10-20 10:00:00',$5,$6)", [id, user, problem, score, verified, verified ? "server-v1" : null]);
  await login();
  return id;
}
async function award(id: string, completion: string | null = null) {
  const { rows } = await db.query<{ reward: { awarded: number; base_points: number; bonus_points: number; bonus_awarded: boolean; daily_completed: boolean; already_claimed: boolean; total_score: number; reward_points: number } }>("select award_submission_reward($1,$2) as reward", [id, completion]);
  return rows[0].reward;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create schema auth; create role authenticated; create role anon;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated;
    create table profiles(id uuid primary key,total_score integer default 0,reward_points integer default 0);
    create table submissions(id uuid primary key,user_id uuid,problem_id uuid,score integer,created_at timestamp,verified_at timestamptz,verification_source text);
    create table daily_challenges(id uuid primary key,problem_id uuid,challenge_date date unique,bonus_points integer check (bonus_points>=0),is_active boolean default true);
    create table daily_challenge_completions(id uuid primary key default gen_random_uuid(),challenge_id uuid references daily_challenges(id),user_id uuid,problem_id uuid,bonus_points integer not null default 0,completed_at timestamptz not null default now(),unique(challenge_id,user_id));
    create table reward_point_awards(id uuid primary key default gen_random_uuid(),user_id uuid references profiles(id),submission_id text not null,completion_id text,amount integer not null check (amount>=0),created_at timestamptz default now(),unique(user_id,submission_id));
    create unique index reward_point_awards_completion_uidx on reward_point_awards(completion_id) where completion_id is not null;
  `);
  await db.exec(readFileSync(new URL("../supabase/migrations/20261020140000_daily_challenge_rewards.sql", import.meta.url), "utf8"));
}, 30_000);
beforeEach(async () => {
  await db.exec("reset role; drop trigger if exists simulate_reward_failure on profiles; truncate reward_point_awards,daily_challenge_completions,daily_challenges,submissions,profiles cascade;");
  await db.query("insert into profiles(id) values ($1),($2)", [alice, bob]);
  await db.query("insert into daily_challenges(id,problem_id,challenge_date,bonus_points) values ($1,$2,'2026-10-20',37)", [challenge, problem]);
  await login();
});
afterAll(async () => { await db.close(); });

describe("atomic daily challenge rewards", () => {
  it("adds the first 100 points and the configured daily bonus to both balances", async () => {
    const reward = await award(await submission());
    expect(reward).toMatchObject({ awarded: 137, base_points: 100, bonus_points: 37, bonus_awarded: true, daily_completed: true, total_score: 137, reward_points: 137 });
    await db.exec("reset role");
    expect((await db.query("select bonus_points from daily_challenge_completions")).rows).toEqual([{ bonus_points: 37 }]);
  });
  it("awards only the bonus when the problem was already solved", async () => {
    await db.exec("reset role; update daily_challenges set is_active=false");
    expect((await award(await submission())).awarded).toBe(100);
    await db.exec("reset role; update daily_challenges set is_active=true");
    expect(await award(await submission())).toMatchObject({ awarded: 37, base_points: 0, bonus_points: 37, total_score: 137 });
  });
  it("preserves existing legacy solved progress", async () => {
    await submission(100, null);
    await db.exec("reset role; update profiles set total_score=100,reward_points=100");
    expect(await award(await submission())).toMatchObject({ awarded: 37, base_points: 0, bonus_points: 37, total_score: 137 });
  });
  it("does not pay twice for retries or separate accepted submissions created before either claim", async () => {
    const first = await submission(); const second = await submission();
    expect((await award(second)).awarded).toBe(137);
    expect(await award(second)).toMatchObject({ awarded: 0, already_claimed: true, daily_completed: true, total_score: 137 });
    expect(await award(first)).toMatchObject({ awarded: 0, bonus_awarded: false, daily_completed: true, total_score: 137 });
    await db.exec("reset role");
    expect((await db.query("select * from daily_challenge_completions")).rows).toHaveLength(1);
  });
  it("keeps partial-score improvement and reserves the bonus for a perfect solution", async () => {
    expect(await award(await submission(40))).toMatchObject({ awarded: 40, bonus_points: 0, daily_completed: false });
    expect(await award(await submission())).toMatchObject({ awarded: 97, base_points: 60, bonus_points: 37, total_score: 137 });
    expect((await award(await submission(20))).awarded).toBe(0);
  });
  it("recovers an orphan completion and uncredited accepted submission from the old failing flow", async () => {
    const failed = await submission();
    await db.exec("reset role");
    const orphan = (await db.query<{ id: string }>("insert into daily_challenge_completions(challenge_id,user_id,problem_id,bonus_points) values ($1,$2,$3,37) returning id", [challenge, alice, problem])).rows[0].id;
    await login();
    expect(await award(failed, orphan)).toMatchObject({ awarded: 137, base_points: 100, bonus_points: 37 });
    expect((await award(await submission())).awarded).toBe(0);
  });
  it("recovers the same missing credit when the user submits a new solution", async () => {
    await submission();
    expect(await award(await submission())).toMatchObject({ awarded: 137, base_points: 100, bonus_points: 37 });
  });
  it("rolls completion creation and rewards back together if the balance update fails", async () => {
    const id = await submission();
    await db.exec("reset role; create or replace function fail_reward() returns trigger language plpgsql as $$ begin raise exception 'simulated_reward_failure'; end $$; create trigger simulate_reward_failure before update on profiles for each row execute function fail_reward();");
    await login();
    await expect(award(id)).rejects.toThrow("simulated_reward_failure");
    await db.exec("reset role");
    expect((await db.query("select * from daily_challenge_completions")).rows).toHaveLength(0);
    expect((await db.query("select * from reward_point_awards")).rows).toHaveLength(0);
    await db.exec("drop trigger simulate_reward_failure on profiles");
    await login();
    expect((await award(id)).awarded).toBe(137);
  });
  it("uses the Bucharest calendar day, including the interval before UTC midnight", async () => {
    expect(await award(await submission(100, "2026-10-19T21:30:00Z"))).toMatchObject({ bonus_points: 37 });
  });
  it("does not award a challenge from another day or an inactive challenge", async () => {
    expect(await award(await submission(100, "2026-10-19T10:00:00Z"))).toMatchObject({ awarded: 100, bonus_points: 0 });
    await db.exec("reset role; update daily_challenges set is_active=false");
    expect(await award(await submission())).toMatchObject({ awarded: 0, bonus_points: 0 });
  });
  it("handles zero-bonus challenges as completed without blocking the base reward", async () => {
    await db.exec("reset role; update daily_challenges set bonus_points=0");
    expect(await award(await submission())).toMatchObject({ awarded: 100, bonus_points: 0, bonus_awarded: true, daily_completed: true });
  });
  it("rejects unverified or foreign submissions and unauthenticated callers", async () => {
    await expect(award(await submission(100, null))).rejects.toThrow("submission_not_found");
    await expect(award(await submission(100, verifiedAt, bob))).rejects.toThrow("submission_not_found");
    const own = await submission(); await login(null);
    await expect(award(own)).rejects.toThrow("authentication_required");
  });
  it("rejects a mismatched completion and leaves no partial reward or completion", async () => {
    const id = await submission();
    await expect(award(id, "00000000-0000-4000-8000-999999999999")).rejects.toThrow("daily_completion_not_found");
    await db.exec("reset role");
    expect((await db.query("select * from daily_challenge_completions")).rows).toHaveLength(0);
    expect((await db.query("select * from reward_point_awards")).rows).toHaveLength(0);
  });
});
