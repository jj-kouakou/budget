# Handoff — Slice 05 Tickets

## Gate
Ticket Breakdown (workflow step 6) for slice 5 — complete.

## Artifacts
- `docs/program-design/slices/slice-05-tickets.md` — new. Three tickets with
  blocking edges, standing rules, eight boundary decisions (two open), the
  existing-test change table, and the spec-test-to-ticket map.

## Ticket order

| # | Ticket | Blocked by |
|---|---|---|
| 1 | Comparison read model in `monthSummary` | — |
| 2 | Home comparison: header, two columns, previous-only rows | 1 |
| 3 | Previous-month-empty note and `MIN_MONTH` current-only | 2 |

Frontier and critical path are linear: 1 → 2 → 3.

## Decisions recorded
- Ticket 1 is a data-layer slice verified at the `Ledger` seam, as slices 2–4
  did for their read tickets. The UI cannot render a previous amount before
  the read model returns one.
- Ticket 2 carries the derivation, comparison markup, CSS, and ten UI tests.
  Ticket 3 adds the second `current-only` state and its copy.
- Live-write, rename, archive, and `categoryEntries` consistency are acceptance
  criteria inside tickets 1–2, not separate test-only tickets.
- No backup, offline, glossary, or ADR ticket: none needs production code.

## Flag raised
No open decisions. Both flags were confirmed by the user before the build:

1. **Three tickets, not two** — ticket 3 stays separate; merge into 2 only if
   ticket 2 runs short.
2. **Branch cut** — wait for slices 3 and 4 to merge and deploy, then cut
   `slice-05` from `master`. Do not start ticket 1 on `slice-04`.

## Next gate
Build (workflow step 7), one ticket per session, test-first. Read, in order:

1. `docs/program-design/slices/slice-05-tickets.md`
2. `docs/program-design/slices/slice-05-spec.md`
3. `docs/architecture/slices/slice-05-architecture.md`
4. `docs/product/slices/slice-05-scope.md`
5. `CONTEXT.md`

## Suggested skills
- `implement` + `tdd` for each ticket.
- `grilling` for any in-session decision that does not need to survive the
  ticket.
- `diagnosing-bugs` if the Dexie read transaction or the live query
  misbehaves.

## Repo state
- Docs-only. No `src/` changes, no tests run, no build.
- `SCHEMA_VERSION` and `BACKUP_SCHEMA_VERSION` are still `1`.
- `slice-04` is the current branch; slices 3 and 4 are not merged to `master`.

## Open items
- None. Review the remaining boundary decisions before ticket 1.
