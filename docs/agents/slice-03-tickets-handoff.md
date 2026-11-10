# Handoff — Slice 03 Spec and Tickets

## Gate
Slice Program Design (workflow step 5) and Ticket Breakdown (workflow step 6)
for slice 3 — complete. Both ran in one session because the spec did not exist
when the breakdown started.

## Artifacts
- `docs/program-design/slices/slice-03-spec.md` — new. Derived strictly from
  `docs/architecture/slices/slice-03-architecture.md` and
  `docs/product/slices/slice-03-scope.md`; adds no architectural decision.
  Marked in its provenance note.
- `docs/program-design/slices/slice-03-tickets.md` — new. Seven tickets with
  blocking edges, standing rules, boundary decisions, per-ticket spec
  citations, and acceptance criteria.

## Ticket order

| # | Ticket | Blocked by |
|---|---|---|
| 1 | Backup file format module | — |
| 2 | Ledger backup operations and first-run seeding | 1 |
| 3 | Storage status module and boot wiring | — |
| 4 | Save-backup browser adapter | — |
| 5 | Backup screen, route, and save path | 1, 2, 3, 4 |
| 6 | Restore path, zero-account gate, and first-run entry | 1, 2, 5 |
| 7 | Home storage warning | 3, 5 |

Frontier: 1, 3, and 4 in parallel; 2 after 1; 5 integrates all four; 6 is the
restore tail; 7 is a small independent tail.

## Decisions recorded
- The spec fixes exact screen copy, ids, routes, the save-outcome ladder, the
  storage states, the zero-account gate, and the restore-landing suppression.
- Tickets 1–4 add no UI and are verified at their module seam; ticket 5 is the
  first runnable surface; ticket 6 makes restore reachable on an empty phone.
- The home warning is ticket 7 rather than part of 5, because its acceptance
  criteria are distinct (never visible while the status is `undefined`).
- The accounts restore link lands with the restore flow (ticket 6), so no
  commit points at a screen with no restore UI.
- Spec-level boundary calls are listed in the tickets doc: code-unit sorting,
  `opening` amount sign, deferred blob-URL revoke, module-level memoization,
  `onRestored(0)` semantics, ICU-independent date tests.

## Flag raised
**The backup file contract is still unconfirmed.** `format` +
`schemaVersion` + `exportedAt` + `data`, with `schemaVersion` as the
data-model version and device state excluded, is the one durable decision.
Confirm it before ticket 1, or accept it as the point of no return.

## Next gate
Build (workflow step 7), one ticket per session, test-first. Start with ticket
1 or ticket 3/4 (independent). Read, in order:

1. `docs/program-design/slices/slice-03-spec.md`
2. `docs/program-design/slices/slice-03-tickets.md`
3. `docs/architecture/slices/slice-03-architecture.md`
4. `docs/product/slices/slice-03-scope.md`

## Suggested skills
- `implement` + `tdd` for each ticket.
- `diagnosing-bugs` if a Dexie transaction or a browser adapter misbehaves.
- `prototype` only if the save-capability ladder or the restore preview state
  needs a sanity check.

## Repo state
- Docs-only. No `src/` changes, no tests run, no build.
- `SCHEMA_VERSION` is still `1`; slice 3 is not started.
- Branch `slice-03` does not exist yet.

## Open items
- Confirm the flagged file contract.
- Review boundary decisions 1–10 in the tickets doc before starting ticket 1.
