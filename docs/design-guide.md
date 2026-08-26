# ScripticX Design Guide

Status: Foundation 1.0  
Owners: product and frontend  
Visual reference: `/admin/design-system`  
Token source: `app/globals.css`  
Component source: `components/ui`

This document is the normative design contract for ScripticX. It is meant to make product decisions repeatable, keep new work coherent, and help contributors understand the interface without reverse-engineering individual pages.

## 1. Product character

ScripticX is a focused learning workspace. It should feel calm, capable, direct, and thoughtfully made. The product borrows the information clarity of Notion, the interaction discipline of Linear, and the restraint of Apple interfaces, without copying any of them.

The interface is:

- modern, but not trend-driven;
- friendly, but not childish;
- dense enough for serious work, but never cramped;
- expressive through content and interaction, not decoration;
- equally intentional in light and dark mode.

### The anti-"AI slope" rule

Do not default to the visual clichés common in generated dashboards:

- decorative gradients or glowing blobs;
- several unrelated accent colors in one view;
- uppercase subtitles with wide letter spacing;
- an icon or emoji for every label;
- oversized hero cards that push the task below the fold;
- excessive pills, glass effects, or nested rounded containers;
- ornamental copy such as "unlock your potential" when a concrete label works.

A visual effect must communicate hierarchy, state, brand, or interaction. If it does none of those, remove it.

## 2. Source-of-truth order

When implementation and documentation differ, resolve them in this order:

1. accessibility and product behavior;
2. semantic tokens in `app/globals.css`;
3. primitives in `components/ui`;
4. patterns shown at `/admin/design-system`;
5. this written guide;
6. legacy screens.

Legacy screens are references, not specifications. New work must not copy a legacy inconsistency simply because it already exists.

## 3. Foundations

### 3.1 Typography

The platform uses Geist for interface and reading text and Geist Mono for code and technical values.

| Role | Typical size | Weight | Notes |
| --- | ---: | ---: | --- |
| Display | 36–48px | 600 | Rare; onboarding or completion moments |
| Page title | 28–32px | 600 | One per page |
| Section title | 18–20px | 600 | Clear content grouping |
| Card title | 14–16px | 500–600 | Describe the card, not its category |
| Body | 14–16px | 400 | Default line-height 1.5–1.7 |
| Supporting | 12–14px | 400 | Use `text-muted-foreground` |
| Code/value | 12–14px | 400–500 | Geist Mono |

Rules:

- Use sentence case for UI labels and headings.
- Do not add positive tracking to headings, subtitles, badges, or navigation labels.
- A small negative tracking value is acceptable only for large display headings.
- Keep body copy left-aligned. Center alignment is reserved for short empty, success, or onboarding states.
- Prefer two font weights in one surface. Use a third only when hierarchy genuinely requires it.
- Never use typography as decoration at the expense of legibility.

### 3.2 Color

Use semantic shadcn tokens instead of hardcoded light/dark values:

- surfaces: `background`, `card`, `popover`, `muted`;
- text: `foreground`, `muted-foreground`;
- interaction: `primary`, `secondary`, `accent`, `ring`;
- structure: `border`, `input`;
- destructive actions: `destructive`;
- states: `success`, `warning`, `info` backed by `--sx-*` variables.

Accent color is a signal, not a theme. A normal page should usually contain neutral surfaces plus one functional accent family. Charts may use the chart palette when categories require distinction.

Do:

- use neutral surfaces to create most hierarchy;
- reserve green for success/completion, amber for caution, red for destructive/error, blue for information;
- ensure meaning remains understandable without color;
- test both themes and forced/high-contrast states.

Do not:

- use a gradient as the default background of a card, page, progress bar, or avatar;
- color every icon differently in a grid;
- use low-contrast colored text on tinted backgrounds;
- encode several unrelated meanings with the same status color.

### 3.3 Spacing

Use the 4px scale exposed as `--sx-space-*`:

`4, 8, 12, 16, 20, 24, 32, 40, 48, 64px`

Common pairings:

- icon to label: 6–8px;
- label to supporting text: 4px;
- related controls: 8–12px;
- card padding: 16px compact, 20–24px comfortable;
- sections in a page: 24–32px;
- major page regions: 40–64px.

Do not solve hierarchy by adding arbitrary empty space. Space communicates relationship: closer means related, farther means separate.

### 3.4 Radius

Use radius by object role, not taste:

- controls: `--sx-radius-control` (10px);
- cards: `--sx-radius-card` (14px);
- major panels: `--sx-radius-panel` (20px);
- application shell: `--sx-radius-shell` (24px);
- badges/avatars/progress: full radius only when the shape has semantic value.

Avoid multiple nested rounded rectangles with similar borders. If a parent already establishes the surface, use separators, spacing, or a muted fill for children.

### 3.5 Borders and shadows

Borders provide structure. Shadows communicate elevation.

- Base cards use a 1px semantic border or ring and `--sx-shadow-subtle`.
- Floating menus and popovers use `--sx-shadow-raised`.
- Modals may use `--sx-shadow-overlay`.
- Do not use colored or oversized shadows for standard product UI.
- Never use a shadow to compensate for insufficient contrast.

### 3.6 Layout

- Standard page maximum: `--sx-content-max` (80rem).
- Reading/editor maximum: `--sx-reading-max` (48rem).
- Use `.sx-page` for a standard page container.
- Keep primary actions in the page header or near the content they affect.
- Use responsive grids only when cards have equal importance. Prefer a linear flow for tasks with an order.
- On mobile, preserve priority and order; do not merely squeeze the desktop grid.

## 4. Components

### 4.1 Use shadcn primitives first

New controls must be composed from `components/ui` before introducing a one-off replacement. This gives ScripticX consistent keyboard behavior, focus rings, themes, and dimensions.

Use Lucide icons. An icon must do at least one of the following:

- make a familiar action faster to recognize;
- communicate state;
- distinguish compact navigation where text cannot fit.

If the icon repeats the adjacent text without improving scanning, omit it. Emoji are content, not interface chrome.

### 4.2 Buttons

- One primary button per action cluster.
- Use outline or secondary for alternatives and ghost for low-emphasis toolbar actions.
- Destructive actions use the destructive variant and require confirmation when data loss is material.
- Labels begin with a verb: "Create class", "Save changes", "Export PDF".
- Icon-only buttons require an accessible label and a tooltip when the action is not universally obvious.
- Preserve a minimum 40–44px touch target even when the visible control is compact.

### 4.3 Inputs

- Labels remain visible; placeholders show examples, never replace labels.
- Put help text before the user makes an error when a format is not obvious.
- Validate near the field and explain how to recover.
- Disabled and read-only are different states and should look and behave differently.
- Group related controls with spacing and headings, not decorative cards around every field.

### 4.4 Navigation

- Sidebar navigation represents product areas; tabs switch views within the current area.
- Keep common personal/student/teacher destinations visually and semantically consistent.
- A menu contains actions; it is not a substitute for a page with complex settings.
- The current location must remain visible after refresh and have an accessible active state.

### 4.5 Cards and data widgets

- A card needs one clear purpose.
- Put the key value or action first; supporting metadata follows.
- Avoid card-in-card layouts unless the inner surface is interactive or independently meaningful.
- Charts need a textual summary, readable tooltip in both themes, labeled axes when applicable, and an empty state.
- Do not assign a new color to each metric unless color encodes categories across the whole view.

### 4.6 Dialogs, popovers, and tooltips

- Dialog: decisions or focused workflows that interrupt the page.
- Popover: contextual controls that remain related to a trigger.
- Tooltip: short clarification, never required content or a multi-step workflow.
- Use shadcn components. Do not use browser `alert()`, `confirm()`, or `prompt()`.
- Keep overlays within the viewport and ensure Escape, focus return, and keyboard navigation work.

## 5. Product states

Every data-backed feature must define these states before it is complete:

1. initial loading;
2. content;
3. empty;
4. recoverable error;
5. offline/local fallback when supported;
6. saving/optimistic state when the user mutates data;
7. permission denied when applicable.

### Loading

Use the shared `Skeleton`, which is powered by Boneyard. The skeleton should approximate the final layout and reserve its space. Avoid a spinner for full pages and avoid showing a fake starter item while remote data is still loading.

### Empty

Explain what is absent and offer the next relevant action. Do not fill an empty product with fake data unless explicitly labeled as a demo.

### Error

State what failed in plain language, preserve the user's input, and offer a retry or recovery action. A toast may confirm a failure, but it must not be the only place where a blocking error is explained.

### Save feedback

Use stable states such as `Saving…`, `Saved`, `Saved locally`, and `Could not sync`. Do not restart `Saving…` continuously because of derived state or autosave loops.

## 6. Motion

Motion explains change. It should not perform for its own sake.

- fast (`--sx-motion-fast`, 120ms): hover/focus feedback;
- standard (`--sx-motion-standard`, 200ms): menus, small panels, selection;
- slow (`--sx-motion-slow`, 280ms): screen or onboarding transitions;
- use `--sx-ease-standard` for controls and `--sx-ease-emphasized` for larger transitions.

Animate opacity and transform when possible. Avoid animating layout dimensions on frequently updated surfaces. Never delay access to content to finish an animation. Respect `prefers-reduced-motion`.

## 7. Accessibility

Minimum acceptance criteria:

- all functionality works with keyboard only;
- visible `focus-visible` state on every interactive element;
- semantic headings in a logical order;
- form controls have programmatic labels;
- icon-only buttons have accessible names;
- contrast meets WCAG AA for normal UI text;
- status is communicated with text or icon as well as color;
- touch targets are large enough and do not overlap;
- zoom to 200% and narrow layouts do not hide required actions;
- reduced motion is respected.

Use native semantics first. ARIA supplements semantics; it does not replace them.

## 8. Content and voice

ScripticX copy is clear, specific, supportive, and concise.

- Say what happened and what the user can do next.
- Prefer "Could not save the note" to "Something went wrong".
- Do not blame the user.
- Avoid exclamation marks in routine success messages.
- Use consistent Romanian and English product terminology.
- Keep button labels short; put explanations in supporting copy.
- Translators need complete sentences or well-named keys, not concatenated fragments.

## 9. Responsive behavior

Design the information order before choosing breakpoints.

- Mobile retains the primary action and current context.
- Sidebars become drawers using the same navigation model.
- Tables must scroll, transform into labeled rows, or reduce columns intentionally.
- Toolbars may wrap or collapse into an overflow menu.
- Dialogs use safe viewport padding and can become sheets for long mobile workflows.
- Test at 320px, 768px, 1024px, and a wide desktop, plus browser zoom.

## 10. Email

Email is part of the ScripticX product, not a separate visual brand.

- Use a restrained single-column layout, generous readable spacing, and one primary action.
- Use the ScripticX logo once, at an appropriate size.
- Avoid gradients, decorative badges, complex card stacks, and UI that resembles an application screenshot.
- Provide a plain-text equivalent and meaningful preheader.
- Keep transactional and marketing semantics distinct; marketing email requires consent and unsubscribe support.
- Test common desktop/mobile clients and dark-mode transformations.

## 11. Review checklist

Before requesting review for a new or redesigned screen:

- [ ] Uses semantic tokens and shared primitives.
- [ ] Has no decorative gradient, random accent palette, or wide-tracked subtitle.
- [ ] Uses sentence case and concrete copy.
- [ ] Defines loading, empty, error, and save states.
- [ ] Uses Boneyard through the shared `Skeleton`.
- [ ] Works in light and dark mode.
- [ ] Works with keyboard and visible focus.
- [ ] Handles narrow/mobile layouts intentionally.
- [ ] Uses a dialog/popover instead of browser alerts.
- [ ] Avoids unnecessary icons, emoji, pills, nested cards, and rounded containers.
- [ ] Runs `npm run design:check`.

## 12. Product-wide enforcement

The legacy visual debt is cleared, so the default checker now enforces the contract across every product screen and shared component. CI must fail when a decorative gradient, arbitrary or tinted elevation, wide-tracked interface copy, raw large radius, or browser dialog is introduced.

1. Open `/admin/design-system` and match the approved patterns.
2. Build with semantic tokens and `components/ui`.
3. Run `npm run design:check` locally; this scans all product UI.
4. Use `npm run design:check:strict` when an explicit strict command is useful in automation; it checks the same product-wide scope.
5. Use `node scripts/check-design-system.mjs --adoption` only for a non-blocking migration report on an old branch.

Do not add a second token file or a separate component kit. Improve the shared source instead.
