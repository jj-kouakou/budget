# Handoff — Slice 07 Ticket Breakdown

## Gate

Ticket Breakdown (workflow step 6) for slice 7 — complete.

## Artifacts

- `docs/program-design/slices/slice-07-tickets.md` — new.
- This handoff.

No other file changed. No `src/` change, no test run, no build.

## Breakdown

Eight tickets, cut along the seam:

1. Income ledger: record and list — no blockers.
2. Income ledger: correct and remove — blocked by 1.
3. Shared categorized-entry form extraction — no blockers.
4. Income route contract — no blockers.
5. Income list and home entry point — blocked by 1, 2, 4.
6. Add income screen — blocked by 1, 3, 4, 5.
7. Correct and remove income — blocked by 2, 3, 4, 5.
8. Spending, backup, and manual acceptance — blocked by 1–7.

Critical path: 1 → 2 → 5 → 7 → 8. Ticket 4 runs beside 1/2; ticket 3 runs
beside 1/2/4; ticket 6 runs beside 7. Tickets 1, 3, and 4 can start
immediately.

## Deviations from the spec's suggested shape

- The spec suggested one ledger ticket. It is split into record/list (1) and
  correct/remove (2) to keep each session comfortable. No new seam; ticket 2
  reuses `requireCategorizedEntryFields`.
- The spec suggested one "routing and App" ticket. `App` imports the three
  screens, so a single ticket cannot be green before the screens exist
  without stubs. Ticket 4 adds the route contract only; tickets 5–7 add their
  own `App` cases.
- The shared form extraction is its own ticket (3) rather than being folded
  into add (6), because the rename touches the expense and transfer screens
  and needs its own green checkpoint.
- The editor (7) is not blocked by add (6). Its real dependencies are the
  ledger's correct/remove methods, the shared form, the routes, and the list.
  Serial numeric order still builds add first.
- Intermediate tickets 5–7 leave some income routes unhandled. The slice is
  not a release candidate until ticket 8; do not deploy or merge mid-slice.
- Ticket 8 is test/manual-only by design: spending invariants, backup
  round-trip, zero-account gate, and the manual acceptance pass. If a test
  exposes a bug, fix production in that ticket and record it.

## Flagged for confirmation before build

1. The routing/App split in boundary decision 2.
2. Intermediate commits that are not standalone releases in boundary
   decision 3.
3. The editor's dependency set omitting the add ticket in boundary decision 5.
4. Tickets 6 and 7 both editing `App.tsx` and `App.test.tsx`; run serially or
   give one session ownership of the App wiring, per boundary decision 6.
5. Keeping ticket 8 as a test/manual-only ticket, per boundary decision 7.

## Next gate

Build, one ticket per session, test-first. Read `AGENTS.md`,
`docs/workflow.md` steps 6–9, `docs/standards.md`, this tickets doc, the
slice spec, and the slice architecture before the first ticket. Cut
`slice-07` from `master` after committing the gate docs. Build the
dependency frontier, not spec order.
