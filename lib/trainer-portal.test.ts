import { describe, expect, it } from "vitest";

import {
  agendaToPlainText,
  buildAgenda,
  clampDuration,
  currentAgendaEntry,
  formatDuration,
  parseTrainers,
  summarizeWorkshop,
  toCanvaEmbedUrl,
  type Workshop,
} from "./trainer-portal";

function workshopFixture(): Workshop {
  return {
    id: "workshop-1",
    title: "First steps in MiniScript+",
    summary: "",
    status: "scheduled",
    startsAt: "2026-09-10T07:00:00.000Z",
    location: "",
    audience: "",
    trainers: ["Lead trainer"],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    comments: [],
    resources: [
      {
        id: "resource-deck",
        kind: "canva",
        title: "Intro deck",
        url: "https://www.canva.com/design/DAGabc123/xyz-token/view",
        note: "",
      },
      {
        id: "resource-game",
        kind: "game",
        title: "Bug hunt",
        url: "https://platform.scripticx.org/problems",
        note: "",
      },
    ],
    sections: [
      {
        id: "section-welcome",
        title: "Welcome",
        kind: "talk",
        durationMinutes: 10,
        owner: "Lead trainer",
        notes: "",
        resourceIds: ["resource-deck"],
        done: false,
      },
      {
        id: "section-intro",
        title: "Why MiniScript+ exists",
        kind: "talk",
        durationMinutes: 15,
        owner: "",
        notes: "",
        resourceIds: [],
        done: false,
      },
      {
        id: "section-game",
        title: "Game — bug hunt",
        kind: "game",
        durationMinutes: 20,
        owner: "",
        notes: "",
        resourceIds: ["resource-game"],
        done: false,
      },
    ],
  };
}

describe("trainer portal agenda", () => {
  it("lays sections onto the clock from the workshop start time", () => {
    const agenda = buildAgenda(workshopFixture());

    expect(agenda[0].startsAt.toISOString()).toBe("2026-09-10T07:00:00.000Z");
    expect(agenda[0].endsAt.toISOString()).toBe("2026-09-10T07:10:00.000Z");
    expect(agenda[1].startsAt.toISOString()).toBe("2026-09-10T07:10:00.000Z");
    expect(agenda[1].offsetMinutes).toBe(10);
    expect(agenda[2].endsAt.toISOString()).toBe("2026-09-10T07:45:00.000Z");
  });

  it("reports the section a trainer should be running right now", () => {
    const workshop = workshopFixture();

    expect(
      currentAgendaEntry(workshop, new Date("2026-09-10T07:15:00.000Z"))?.section.id
    ).toBe("section-intro");
    expect(currentAgendaEntry(workshop, new Date("2026-09-10T06:59:00.000Z"))).toBeNull();
    expect(currentAgendaEntry(workshop, new Date("2026-09-10T20:00:00.000Z"))).toBeNull();
  });

  it("summarizes total time and completion", () => {
    const workshop = workshopFixture();
    const summary = summarizeWorkshop({
      ...workshop,
      sections: workshop.sections.map((section, index) =>
        index === 0 ? { ...section, done: true } : section
      ),
    });

    expect(summary.totalMinutes).toBe(45);
    expect(summary.totalSections).toBe(3);
    expect(summary.completedSections).toBe(1);
    expect(summary.progress).toBe(33);
    expect(summary.endsAt.toISOString()).toBe("2026-09-10T07:45:00.000Z");
    expect(summary.gameCount).toBe(1);
  });

  it("stays usable when a workshop has no sections yet", () => {
    const summary = summarizeWorkshop({ ...workshopFixture(), sections: [] });

    expect(summary.totalMinutes).toBe(0);
    expect(summary.progress).toBe(0);
    expect(summary.endsAt.toISOString()).toBe("2026-09-10T07:00:00.000Z");
  });
});

describe("run sheet", () => {
  it("lists every section with its clock window and attached links", () => {
    const text = agendaToPlainText(workshopFixture(), "en");
    const lines = text.split("\n");

    expect(lines[0]).toBe("First steps in MiniScript+");
    expect(lines[2]).toContain("Welcome");
    expect(lines[2]).toContain("(10 min)");
    expect(text).toContain("Intro deck — https://www.canva.com");
  });

  it("formats durations that cross the hour", () => {
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(120)).toBe("2 h");
    expect(formatDuration(150)).toBe("2 h 30 min");
  });
});

describe("input normalization", () => {
  it("clamps a duration to what the schema accepts", () => {
    expect(clampDuration(-20)).toBe(5);
    expect(clampDuration(10_000)).toBe(480);
    expect(clampDuration("not a number")).toBe(15);
    expect(clampDuration(42)).toBe(42);
  });

  it("splits a trainer list and drops empty entries", () => {
    expect(parseTrainers("Ana, Bogdan ,, ")).toEqual(["Ana", "Bogdan"]);
    expect(parseTrainers("")).toEqual([]);
  });
});

describe("canva links", () => {
  it("builds an embeddable viewer url from a shared design link", () => {
    expect(
      toCanvaEmbedUrl(
        "https://www.canva.com/design/DAGabc123/xyz-token/view?utm_content=DAGabc123"
      )
    ).toBe("https://www.canva.com/design/DAGabc123/xyz-token/view?embed");
  });

  it("returns null for links that cannot be embedded", () => {
    expect(toCanvaEmbedUrl("https://example.com/deck.pdf")).toBeNull();
    expect(toCanvaEmbedUrl("https://www.canva.com/")).toBeNull();
  });
});
