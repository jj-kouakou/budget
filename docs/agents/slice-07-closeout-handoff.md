# Handoff — Slice 07 Close-out

## Gate

Slice close-out (workflow step 9). Slice 7 — Record income.
Build and review were completed in the same session and are recorded in
`docs/agents/slice-07-build-review-handoff.md`. This close-out independently
re-ran the verification commands, reconciled the plan docs with the built
code, and confirmed the backlog order.

## Branch and state

| Ref | Commit | Meaning |
|---|---|---|
| `slice-07` | `123aaa3` | build and review, tickets 1–8 |
| `slice-07` | this docs commit | final close-out reconciliation and this report |
| `master` | `06323ff` | branch cut point; not merged in this session |

The slice is built and reviewed. It is **not merged, pushed, or deployed**;
that remains the release step. The close-out definition of done does not
include deployment.

## 1. All tickets pass their tests — confirmed

```
npm test
```

Result on `slice-07`: **22 test files passed, 640 tests passed, 0 failures**
(30.9s). This is the full suite, including every ticket's ledger, router,
screen, and invariant tests.

```
npm run typecheck
npm run build
```

Both are **clean**. The production build completed in 665ms; PWA precache
contains 12 entries.

`SCHEMA_VERSION` and `BACKUP_SCHEMA_VERSION` remain `1`, and the ledger test
that pins both still passes. No test was skipped or removed for this close-out.

## 2. Code review — approved, no unresolved issues

Approved. The fresh `reviewer` and `security-reviewer` subagents recorded in
`docs/agents/slice-07-build-review-handoff.md` reviewed
`git diff master...HEAD` independently of the build transcript:

- **Quality and spec conformance:** zero findings.
- **Security:** zero findings.

No review-fixes commit exists because no issue was raised. The one note in the
security review — a pre-existing `domain/backup.ts` currency/exponent
validation gap — is explicitly outside this slice, and the v1 parser was not
tightened.

## 3. Architecture and spec reflect what was built — confirmed

Verified against the source, not just the plan:

- `CategorizedEntryInput`, `IncomeListItem`, `listIncome`, `addIncome`,
  `updateIncome`, and `deleteIncome` match the architecture and spec. The
  validation order is amount → date → account → category → active-or-stored
  archived category.
- `entriesOfKindNewestFirst` orders by `date` descending, then `id`
  descending; both `listTransfers` and `listIncome` use it.
- The three routes `#/income`, `#/income/new`, and `#/income/<id>` match Spec
  §6.1, including the exact-path checks before the id branch, the `/income/`
  fallback, and the three `routeToHash` cases.
- `App` contains the three income screen cases, and the home actions row
  starts with `Income`.
- `IncomeScreen`, `AddIncomeScreen`, and `IncomeEditorScreen` implement the
  state precedence, exact copy, accessible-name template, archived-category
  handling, missing-reference degradation, guards, confirmation copy, and
  focus behaviour described in the spec.
- The shared form cutover is complete: `categorizedEntryForm.tsx` and
  `choiceGroup.tsx` are the only implementations; the expense and transfer
  callers import the kind-neutral names.
- No table, index, backup field, settings write, existing route, or spending
  read changed. Income remains excluded from spending by the existing
  `kind === 'expense'` predicates.

**No production divergence was found.** The close-out therefore changed no
architecture or spec prose; the existing status lines already say “built and
reviewed 2026-11-12”. All eight ticket acceptance blocks and the slice
close-out block are ticked in `slice-07-tickets.md`.

## 4. AGENTS.md — no change required

This slice added no doc path. Scope, architecture, spec, tickets, build/review
handoff, and this handoff all live in folders `AGENTS.md` already lists. No
new ADR, `CONTEXT.md` section, or `docs/external/` file was created. `CONTEXT.md`
gained income terminology, but the file and its path already existed and are
already listed.

## 5. Backlog — slice 7 marked done; slice 6 is still next

`docs/product/backlog.md` marks slice 7 as **Done — built and reviewed
2026-11-12**. Deployment is the only remaining release step.

**Next slice: 6 — Track account balances. Still the right one to pull.**

- The ledger now holds expenses, transfers, and income, so a balance can be
  computed from complete movements instead of omitting inflows.
- Income changed no stored shape, so no migration or cleanup precedes
  balances.
- Slice 5's real-data comparison check remains pending until December 2026;
  that does not reorder anything.
- Nothing learned in this slice changes the dependency order
  transfers → income → balances.

## Known notes, not defects

- The income list reads the whole `entries` table and filters
  `kind === 'income'` in memory. Intentional at one user and a few thousand
  rows; a `kind` or `[kind+date]` index is a later Dexie version bump with no
  data rewrite.
- The backup parser tolerates an income with no `categoryId` and a stray
  `toAccountId`; v1 already does. The list degrades the category to
  `Uncategorized`, spending ignores both fields, the editor requires a
  replacement category, and saving preserves the stray destination.
- `domain/backup.ts` remains unchanged; its pre-existing currency/exponent
  validation gap is outside this slice and was not tightened.

## Not verified

- Physical phone install, real service-worker offline reload, and real screen
  reader output. The browser pass in the build/review handoff used a managed
  Chromium profile.
- Backup restore through the browser UI; unit tests cover the round-trip.
- Merge, push, and deployment.

## Next

1. Release slice 7: merge `slice-07` into `master`, push, deploy, and verify
   the live bundle.
2. Pull slice 6 — Track account balances — in a fresh architecture session.
3. Keep the December 2026 real-data check for the last-month comparison on
   the list.
