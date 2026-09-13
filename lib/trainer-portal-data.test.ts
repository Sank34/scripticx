import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));

import {
  mapWorkshopRow,
  nextSortOrder,
  type WorkshopRow,
} from "./trainer-portal-data";

function row(overrides: Partial<WorkshopRow> = {}): WorkshopRow {
  return {
    id: "workshop-1",
    title: "First steps in MiniScript+",
    summary: "A half-day introduction.",
    status: "scheduled",
    starts_at: "2026-09-10T07:00:00.000Z",
    location: "Computer lab 2",
    audience: "Grades 7–9",
    trainers: ["Lead trainer", "Assistant trainer"],
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-02T00:00:00.000Z",
    workshop_resources: [
      {
        id: "resource-game",
        kind: "game",
        title: "Bug hunt",
        url: "https://platform.scripticx.org/problems",
        note: null,
        sort_order: 20,
      },
      {
        id: "resource-deck",
        kind: "canva",
        title: "Intro deck",
        url: "https://www.canva.com/design/DAGabc/token/view",
        note: "Slides 1–14.",
        sort_order: 10,
      },
    ],
    workshop_sections: [
      {
        id: "section-game",
        title: "Game — bug hunt",
        kind: "game",
        duration_minutes: 20,
        led_by: "Assistant trainer",
        notes: null,
        done: false,
        sort_order: 20,
        workshop_section_resources: [{ resource_id: "resource-game" }],
      },
      {
        id: "section-welcome",
        title: "Welcome",
        kind: "talk",
        duration_minutes: 10,
        led_by: null,
        notes: "Check sign-ins.",
        done: true,
        sort_order: 10,
        workshop_section_resources: [{ resource_id: "resource-deck" }],
      },
    ],
    workshop_comments: [
      {
        id: "comment-old",
        author_name: "Lead trainer",
        body: "Cheat sheets ordered.",
        resolved: true,
        created_at: "2026-09-01T09:00:00.000Z",
      },
      {
        id: "comment-new",
        author_name: "Assistant trainer",
        body: "Wi-Fi was unreliable.",
        resolved: false,
        created_at: "2026-09-03T09:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

describe("mapWorkshopRow", () => {
  it("orders sections and resources by their stored position", () => {
    const workshop = mapWorkshopRow(row());

    expect(workshop.sections.map((section) => section.id)).toEqual([
      "section-welcome",
      "section-game",
    ]);
    expect(workshop.resources.map((resource) => resource.id)).toEqual([
      "resource-deck",
      "resource-game",
    ]);
  });

  it("shows the newest note first", () => {
    expect(mapWorkshopRow(row()).comments.map((comment) => comment.id)).toEqual([
      "comment-new",
      "comment-old",
    ]);
  });

  it("maps led_by onto the owner the agenda renders and nulls onto empty text", () => {
    const [welcome, game] = mapWorkshopRow(row()).sections;

    expect(welcome.owner).toBe("");
    expect(welcome.notes).toBe("Check sign-ins.");
    expect(welcome.done).toBe(true);
    expect(game.owner).toBe("Assistant trainer");
    expect(game.notes).toBe("");
  });

  it("drops links to resources that are no longer part of the workshop", () => {
    const workshop = mapWorkshopRow(
      row({
        workshop_sections: [
          {
            id: "section-welcome",
            title: "Welcome",
            kind: "talk",
            duration_minutes: 10,
            led_by: null,
            notes: null,
            done: false,
            sort_order: 10,
            workshop_section_resources: [
              { resource_id: "resource-deck" },
              { resource_id: "deleted-resource" },
            ],
          },
        ],
      })
    );

    expect(workshop.sections[0].resourceIds).toEqual(["resource-deck"]);
  });

  it("falls back to safe values for unknown enums and missing relations", () => {
    const workshop = mapWorkshopRow(
      row({
        status: "archived",
        trainers: null,
        workshop_resources: null,
        workshop_sections: [
          {
            id: "section-1",
            title: "Mystery",
            kind: "workshop-golf",
            duration_minutes: null,
            led_by: null,
            notes: null,
            done: null,
            sort_order: null,
            workshop_section_resources: null,
          },
        ],
        workshop_comments: null,
      })
    );

    expect(workshop.status).toBe("draft");
    expect(workshop.trainers).toEqual([]);
    expect(workshop.resources).toEqual([]);
    expect(workshop.comments).toEqual([]);
    expect(workshop.sections[0].kind).toBe("talk");
    expect(workshop.sections[0].durationMinutes).toBe(15);
  });
});

describe("nextSortOrder", () => {
  it("leaves room between positions so a later swap has space", () => {
    expect(nextSortOrder(0)).toBe(10);
    expect(nextSortOrder(3)).toBe(40);
  });
});
