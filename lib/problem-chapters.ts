import { supabase } from "@/lib/supabase";

export type ChapterText = { ro: string; en: string };
export type ProblemTopic = { id: string; title: ChapterText; problemIds: string[] };
export type ProblemChapter = { id: string; title: ChapterText; description: ChapterText; topics: ProblemTopic[] };

// These associations match the existing lesson recommendations, by problem ID.
export const defaultProblemChapters: ProblemChapter[] = [
  {
    id: "basics", title: { ro: "Bazele programării", en: "Programming basics" },
    description: { ro: "Citire, afișare și calcule cu variabile.", en: "Input, output, and calculations with variables." },
    topics: [
      { id: "input-output", title: { ro: "Citire și afișare", en: "Input and output" }, problemIds: ["235ccbb5-e7a6-4b59-b6b5-9597f37fbdaa"] },
      { id: "variables", title: { ro: "Variabile și expresii", en: "Variables and expressions" }, problemIds: ["02354eee-9b9a-4343-b274-0f373f54a97d", "5c039369-d082-4fbe-a030-f1f17d3a7167", "c8827f29-bb1e-4bcd-a7de-a315de0239c5", "38da88f2-4436-42d3-a95f-62b1218d7c16", "c2fcb4c5-f5ac-462a-b3bb-6502a04b6c5f"] },
    ],
  },
  {
    id: "control", title: { ro: "Condiții și bucle", en: "Conditions and loops" },
    description: { ro: "Decizii, repetiții și parcurgerea numerelor.", en: "Decisions, repetition, and iterating over numbers." },
    topics: [
      { id: "conditions", title: { ro: "Structuri de decizie", en: "Conditional statements" }, problemIds: ["cffac95d-3a99-453d-8c04-83a754d8fb41", "5ebb8e10-3902-46cc-950e-496e986701e3", "52dcd0c5-c841-436e-b221-bb5d0ff0cce7", "f6028962-c1d1-4823-8f55-8018744d2011", "33bd8d26-796a-4f29-b39c-e346a57dd1b5"] },
      { id: "loops", title: { ro: "Structuri repetitive", en: "Loops" }, problemIds: ["44dc4d65-8b42-4337-9075-92c563522d5b", "4b2f9bfb-c6a4-48ea-8881-737b3894245c", "520f1d08-805a-43f9-8a0d-a8f35ebee008", "41bfd990-cdc3-4614-a290-151780bef879"] },
    ],
  },
  {
    id: "algorithms", title: { ro: "Algoritmi elementari", en: "Elementary algorithms" },
    description: { ro: "Cifre, divizibilitate și construirea șirurilor.", en: "Digits, divisibility, and generating sequences." },
    topics: [
      { id: "digits", title: { ro: "Cifrele unui număr", en: "Digits of a number" }, problemIds: ["edc94e99-d0b3-4c8e-adc0-c365c2c32f59", "eb086fd3-4ba0-48ea-a342-f62d69f84679", "419440b4-437e-4b55-803b-96aa7f45e04d", "3c216ebd-5cd3-4d1a-86a9-beae3a62cbd1"] },
      { id: "divisibility", title: { ro: "Divizibilitate", en: "Divisibility" }, problemIds: ["e40b9d99-42dd-4b6e-b972-d0095e378a0f", "70fed27a-0829-40a0-8444-cd85c3381bc8", "7e9844b2-5b12-475e-8ea8-5532011019e9", "2b0d2d83-0ee0-411d-b82a-2afb4e030cdf"] },
      { id: "sequences", title: { ro: "Produse și șiruri", en: "Products and sequences" }, problemIds: ["49ab556a-a17f-4c3a-940c-48523c6a1a67", "a7e5d46a-7913-47fd-adcc-9654445a764a"] },
    ],
  },
];

export function validateProblemChapters(value: unknown): value is ProblemChapter[] {
  if (!Array.isArray(value) || value.length > 100) return false;
  const ids = new Set<string>();
  const text = (v: unknown): v is ChapterText => Boolean(v && typeof v === "object" &&
    "ro" in v && typeof v.ro === "string" && "en" in v && typeof v.en === "string");
  const id = (v: unknown) => {
    if (typeof v !== "string" || !v || ids.has(v)) return false;
    ids.add(v); return true;
  };
  return value.every(c => c && id(c.id) && text(c.title) && text(c.description) &&
    Array.isArray(c.topics) && c.topics.every((t: ProblemTopic) => t && id(t.id) && text(t.title) &&
      Array.isArray(t.problemIds) && t.problemIds.every(p => typeof p === "string")));
}

export async function fetchProblemChapters() {
  const { data, error } = await supabase.from("problem_catalog").select("chapters, updated_at").eq("id", 1).maybeSingle();
  // Keep the public library usable while the additive migration is being deployed.
  if (error && (error.code === "PGRST205" || error.code === "42P01")) {
    return { chapters: defaultProblemChapters, available: false, updatedAt: null as string | null };
  }
  if (error) throw error;
  if (data && !validateProblemChapters(data.chapters)) throw new Error("Invalid problem catalog");
  return { chapters: data ? data.chapters as ProblemChapter[] : defaultProblemChapters, available: true, updatedAt: data?.updated_at as string | null ?? null };
}
