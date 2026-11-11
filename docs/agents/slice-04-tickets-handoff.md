# Handoff — Slice 04 Tickets

## Gate
Ticket Breakdown (workflow step 6) for slice 4 — complete.

## Artifacts
- `docs/program-design/slices/slice-04-tickets.md` — new. Six tickets with
  blocking edges, standing rules, nine boundary decisions, the four existing
  tests that must be updated, and per-ticket architecture citations.

## Ticket order

| # | Ticket | Blocked by |
|---|---|---|
| 1 | Category writes: add, rename, archive, list order | — |
| 2 | Archive-aware expense writes | 1 |
| 3 | Categories route, screen, home action, and add | 1 |
| 4 | Rename and archive/unarchive on the Categories screen | 1, 3 |
| 5 | Add expense: active-only choices and the no-active state | 1, 2, 3 |
| 6 | Correction keeps the entry's archived category | 2, 5 |

Frontier: 1 alone; then 2 and 3 in parallel; 4 after 3; 5 after 2 and 3; 6 as
the tail. Critical path 1 → 3 → 5 → 6.

## Decisions recorded
- Tickets 1–2 add no UI and are verified at the `Ledger` seam, as slices 2
  and 3 did. Ticket 3 is the first runnable surface.
- The three category mutations are one ticket because they share the name and
  uniqueness helpers and the ordering contract.
- The Categories screen is split into list/add (3) and rename/archive (4) to
  keep each session under a compaction risk.
- Ticket 5 owns the `archived-category` error mapping; ticket 6 consumes it,
  which is why 6 follows 5.
- No backup ticket and no glossary ticket: backup needs no code change, and
  `CONTEXT.md` already carries the two new terms.

## Flag raised
**`docs/program-design/slices/slice-04-spec.md` does not exist.** Gate 5 was
never run. The tickets are cut from scope + architecture; the architecture is
contract-complete on seams, error codes, write paths, ordering, routes, states,
and tests, but it leaves screen layout and copy open — and the architecture
handoff says the spec must decide those. Every proposed string is listed in
boundary decision 5. Decide before ticket 3: build from these tickets, or run
gate 5 first and re-cut 3–6.

## Next gate
Build (workflow step 7), one ticket per session, test-first. Read, in order:

1. `docs/program-design/slices/slice-04-tickets.md`
2. `docs/architecture/slices/slice-04-architecture.md`
3. `docs/product/slices/slice-04-scope.md`
4. `CONTEXT.md`

## Suggested skills
- `implement` + `tdd` for each ticket.
- `grill-me` for the copy decisions if they are settled in-session.
- `diagnosing-bugs` if a Dexie transaction or a live query misbehaves.

## Repo state
- Docs-only. No `src/` changes, no tests run, no build.
- `SCHEMA_VERSION` and `BACKUP_SCHEMA_VERSION` are still `1`.
- `slice-03` is complete but not merged; slice 4 must branch from `master`
  after that merge.

## Open items
- Decide the spec question above.
- Review boundary decisions 1–9 in the tickets doc before starting ticket 1.
- Confirm the branch cut after `slice-03` merges.
