# Handoff — Slice 08 Ticket Breakdown

## Gate

Ticket Breakdown (workflow step 6) for slice 8 — complete.

## Artifacts

- `docs/program-design/slices/slice-08-tickets.md` — new.
- This handoff.

No other file changed. No `src/` change, no test run, no build.

## Breakdown

Seven tickets, cut along the seam:

1. Transfer ledger: record and list — no blockers.
2. Transfer ledger: correct and remove — blocked by 1.
3. Transfer route contract — no blockers.
4. Transfers list and home entry point — blocked by 1, 3.
5. Add transfer screen and shared transfer fields — blocked by 1, 3, 4.
6. Correct and remove a transfer — blocked by 1, 2, 3, 4, 5.
7. Spending, backup, and manual acceptance — blocked by 1, 2, 4, 5, 6.

Critical path: 1 → 3 → 4 → 5 → 6 → 7. Ticket 2 runs beside 3/4 and must
finish before 6. Tickets 1 and 3 can start immediately.

## Deviations from the spec's suggested shape

- The spec suggested one ledger ticket. It is split into record/list (1) and
  correct/remove (2) to keep each session comfortable. No new seam; ticket 2
  reuses `requireTransferFields`.
- The spec suggested one "routing and App" ticket. `App` imports the three
  screens, so a single ticket cannot be green before the screens exist
  without stubs. Ticket 3 adds the route contract only; tickets 4–6 add their
  own `App` cases.
- Intermediate tickets 4–5 leave some transfer routes unhandled. The slice is
  not a release candidate until ticket 7; do not deploy or merge mid-slice.
- `TransferFields` is created in ticket 5 (add) and reused in ticket 6
  (editor). `accountWithTypeLabel` is a behaviour-preserving prefactor in
  ticket 4.
- Ticket 7 is test/manual-only by design: spending invariants, backup
  round-trip, zero-account gate, and the manual acceptance pass. If a test
  exposes a bug, fix production in that ticket and record it.

## Flagged for confirmation before build

1. The routing/App split in boundary decision 2.
2. Intermediate commits that are not standalone releases in boundary
   decision 3.
3. Keeping editor correction and removal in one ticket in boundary decision
   9; the fallback split is removal as 6b.

## Next gate

Build, one ticket per session, test-first. Read `AGENTS.md`,
`docs/workflow.md` steps 6–9, `docs/standards.md`, this tickets doc, the
slice spec, and the slice architecture before the first ticket. Cut
`slice-08` from `master` after committing the gate docs. Build the
dependency frontier, not spec order.
