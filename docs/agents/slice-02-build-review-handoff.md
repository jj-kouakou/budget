# Handoff — Slice 02 Build and Review

## Gate
Build + Review, combined (workflow steps 7–8) — complete. Slice close-out
(step 9) is deliberately not part of this pass.

## Branch
`slice-02`, cut from `master` at `5acdbd1` (the slice-02 gate docs commit).

## Preflight
- Uncommitted gate docs (scope, architecture, spec, tickets, `CONTEXT.md`,
  `AGENTS.md`, backlog, workflow) committed as `5acdbd1`.
- Baseline before any code: `npm test` 153 passed across 9 files;
  `npm run typecheck` clean. No red baseline.

## Build — commits, in dependency order

| # | Ticket | Commit |
|---|---|---|
| 1 | Ledger read models and shared vocabulary | `7985582` |
| 2 | Ledger writes for correction and removal | `10080ec` |
| 3 | Shared expense fields prefactor | `1022c64` |
| 4 | Category entries list | `d081597` |
| 5 | Entry editor and correction save | `dbe2347` |
| 6 | Removal with confirmation | `d8de43e` |
| — | Review fixes | `6d269c4` |

What landed:
- `categoryEntries(month, categoryId)` and `getEntry(id)` (normalizing
  `undefined` to `null`), with exported `UNCATEGORIZED_CATEGORY_ID` /
  `UNCATEGORIZED_LABEL`.
- `requireExpenseFields` shared by `addExpense` and `updateExpense`;
  `updateExpense` and `deleteExpense` in single-id `rw` transactions, never
  touching `settings`. Error codes `unknown-entry` and
  `unsupported-entry-kind`.
- `formatAmountInput`, the `category` and `entry` hash routes, home rows as
  labelled buttons, the category entry list, the seed-once editor, and the
  inline removal confirmation.
- `src/app/expenseForm.tsx` — one shared field set; add-expense behaviour
  unchanged and its test file untouched.
- No schema, index, version, dependency, or module-direction change.

## Review — fresh, two axes, different model
Two fresh `reviewer` subagents ran on `deepseek-ai/DeepSeek-V4-Pro`
(session-only `task.agentModelOverrides.reviewer`), each seeing only
`git diff master...HEAD` plus the standards/spec/architecture/tickets docs
and the slice-1 close-out. Build ran on DeepSeek V4.1 Flash.

Findings and resolutions:
1. **P2 — standards, `prose:no-implementation-coupled-tests` / spec §13.2.**
   Two editor tests spied on `ledger.updateExpense` /
   `ledger.deleteExpense` and asserted call counts. Removed both spies and
   the call-count assertions; the remaining behavioural assertions (disabled
   action, stored row unchanged/removed) still cover the guards.
2. **P3 — spec §12.4.** Editor `Back` and `Remove entry` used
   `disabled={submitting}` instead of `submitting || deleting`. Added
   `deleting` to both.

No blockers, no spec-axis gaps, no other standards violations. Both
reviewers explicitly confirmed the ledger transaction scopes, error
precedence, `categoryEntries` invariants, route fallbacks, navigation modes,
seed-once form, removal destinations, and error copy.

## Verification
- `npm run typecheck` — clean.
- `npm test` — 244 tests across 11 files, all passing (baseline 153/9).
- `npm run build` — clean; PWA precache emits 12 entries.
- Chromium against `npm run dev`:
  - Ticket 4: home → October (reached with the month arrow) → category list
    → Back returns to October; list total matched the tapped home row.
  - Ticket 5: opened a real entry, changed only the amount, saved; the list
    total and the home row updated without refresh.
  - Ticket 6: removing one of two entries kept the category list with the
    reduced total; removing a category's last entry landed on that month's
    home without the category; removing the month's last entry showed the
    empty state (`Spent CA$0.00`, "No spending yet this month.").
  - Post-review-fix re-check: add → correct amount → remove → empty state
    still works.

## Docs
Nothing the build built contradicted the spec or architecture docs. No spec
edit was needed; the review fixes align the code with §12.4 and §13.2 rather
than changing them.

## Verification limits
- Browser checks used headless Chromium, not a physical phone; layout at
  390×844 and screen-reader announcements were not re-verified for the new
  screens.
- Offline behaviour of the new routes was not exercised; the service worker
  and precache configuration are unchanged from slice 1.
- Cross-tab concurrency and same-day insertion order remain documented,
  deliberate limits (spec §17).
- Removal's `unknown-entry` catch during confirm is implemented but is
  covered only by the observable stale-entry not-found path; the live query
  usually renders not-found before the confirm can race it.

## Next gate
Slice close-out (workflow step 9): confirm ticket tests, fold this handoff
into the slice handoff, update the backlog, merge `slice-02` to `master`, and
tag `slice-02-complete`.
