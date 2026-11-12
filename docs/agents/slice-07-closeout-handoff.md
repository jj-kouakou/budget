# Handoff — Slice 07 Close-out

## Gate

Slice close-out (workflow step 9). Slice 7 — Record income.
Build and review were completed in the same session and are recorded in
`docs/agents/slice-07-build-review-handoff.md`. This close-out reconciles the
definition of done, updates the plan docs to the built state, and updates the
backlog.

## Branch and state

| Ref | Commit | Meaning |
|---|---|---|
| `slice-07` | `123aaa3` | build and review, tickets 1–8 |
| `slice-07` | close-out commit | docs reconciliation and this report |
| `master` | `06323ff` | branch cut point; not merged in this session |

The slice is built and reviewed. It is **not merged, pushed, or deployed**;
that remains the release step.

## 1. Tests

```
npm test
```

Result: **640 passed, 22 files, 0 failures.** No test was deleted or skipped.

```
npm run typecheck
```

Result: **clean**.

```
npm run build
```

Result: **clean**; PWA precache 12 entries.

`SCHEMA_VERSION` and `BACKUP_SCHEMA_VERSION` remain `1`; the ledger test that
pins both still passes.

## 2. Review

Approved. Fresh `reviewer` and `security-reviewer` subagents reviewed
`git diff master...HEAD` independently, without the build transcript:

- **Quality and spec conformance:** zero findings across the ledger contract,
  router fallbacks, shared form cutover, three screens, exact copy,
  accessible names, focus, guards, and tests.
- **Security:** zero findings across untrusted backup strings, the `Ledger`
  seam, settings mutation, validation bypass, cross-kind corruption, routes,
  schema/backup compatibility, and fail-open behavior.

Per-call model override is disabled in this environment, so the reviewers ran
on their configured agent profiles. No review-fixes commit exists.

## 3. Docs vs. what was built

Verified against the source and test suite:

- `listIncome`, `addIncome`, `updateIncome`, `deleteIncome`,
  `entriesOfKindNewestFirst`, and `requireCategorizedEntryFields` match the
  architecture and spec. Validation order is amount → date → account →
  category → active-or-stored archived.
- The three routes and fallbacks match Spec §6.1; `App` gained the three
  screen cases.
- The list state precedence is loading → empty → list. Rows render in ledger
  order with category, amount, account label, and date, and the accessible
  name is `Income: {category}, {amount}, {account}, {date}`.
- Add defaults are `lastAccountId` when valid, else the first account; date
  today; amount blank; category unselected. The no-active-category gate
  renders the exact message and Categories action with no form.
- The editor seeds from the stored row, requires replacements for missing
  references, offers the archived stored category as `(archived)`, corrects
  one row, and removes with a stored-value confirmation focused on Cancel.
- No schema, index, backup field, settings write, or route on an existing
  screen changed. Income remains excluded from spending by the existing
  `kind === 'expense'` predicates.

No production divergence was found, so close-out changes were documentation
only:

- Status lines in `slice-07-architecture.md`, `slice-07-spec.md`, and
  `slice-07-tickets.md` now say built and reviewed.
- All ticket acceptance boxes and the slice close-out boxes are ticked.
- The flagged ticket-boundary decisions record how the build confirmed them.
- `docs/product/backlog.md` marks slice 7 done and records the close-out order
  check.

## 4. AGENTS.md

**No change required.** This slice added no doc path. Scope, architecture,
spec, tickets, build/review handoff, and this handoff all live in folders
`AGENTS.md` already lists. No new ADR, `CONTEXT.md` entry, or
`docs/external/` file was created.

## 5. Backlog

`docs/product/backlog.md` marks slice 7 done — built and reviewed
2026-11-12. Deployment is the remaining release step.

**Next slice: 6 — Track account balances. Still the right one to pull.**

- The ledger now holds expenses, transfers, and income. Balances are the
  remaining user-visible gap.
- No stored shape changed, so no migration or cleanup precedes balances.
- Slice 5's real-data comparison check is still pending until December 2026;
  it does not reorder anything.

## Known notes, not defects

- The income list reads the whole `entries` table and filters
  `kind === 'income'` in memory. This is intentional at one user and a few
  thousand rows; a `kind` or `[kind+date]` index is a later Dexie version
  bump with no data rewrite.
- The backup parser tolerates an income with no `categoryId` and a stray
  `toAccountId`; v1 already does. The list degrades the category to
  `Uncategorized`, spending ignores both fields, the editor requires a
  replacement category, and saving preserves the stray destination.
- `domain/backup.ts` remains unchanged; its pre-existing currency/exponent
  validation gap is outside this slice and was not tightened.

## Not verified

- Physical phone install, real service-worker offline reload, and real screen
  reader output.
- Backup restore through the browser UI; unit tests cover the round-trip.
- Merge, push, and deployment.

## Next

1. Release slice 7: merge `slice-07` into `master`, push, deploy, and verify
   the live bundle.
2. Pull slice 6 — Track account balances — in a fresh architecture session.
3. Keep the December 2026 real-data check for the last-month comparison on
   the list.
