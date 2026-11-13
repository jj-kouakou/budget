# Handoff — Slice 06 Close-out

## Gate

Slice close-out (workflow step 9). Slice 6 — Track account balances.
Build and review were completed in the prior session and are recorded in
`docs/agents/slice-06-build-review-handoff.md`. This close-out re-ran the
verification commands, reconciled the plan docs with the built code, and
re-checked the backlog.

## Branch and state

| Ref | Commit | Meaning |
|---|---|---|
| `slice-06` | `87bd17f` | build and review, tickets 1–8 plus review fix |
| `slice-06` | this docs commit | close-out reconciliation and this report |
| `master` | `6971334` | slice 07 merge; branch cut point, 6 commits ahead of `origin/master` |

Slice 6 is built, reviewed, and closed out. It is **not merged, pushed, or
deployed**; `master` also still holds the unpushed slice 07 merge. Release is
the next step and covers both slices together.

## 1. All tickets pass their tests — confirmed

```
npm test
```

Result on `slice-06` at `87bd17f`: **22 test files passed, 755 tests passed,
0 failures** (32.4s). This is the full suite, including every ticket's money,
ledger, screen, invariant, and backup tests. The build/review session ran the
same suite twice consecutively with the same result.

```
npm run typecheck
npm run build
```

Both are **clean**. The production build completed in 491ms; PWA precache
contains 12 entries.

No test was skipped, removed, or weakened for this close-out. The 115 new
tests are the ones recorded per ticket in the build/review handoff.

## 2. Code review — approved, every issue resolved

Approved. The fresh reviews recorded in
`docs/agents/slice-06-build-review-handoff.md` read only
`git diff master...HEAD` plus the docs, independently of the build transcript,
and ran on a different model from the build.

- **Axis A — standards:** one P3 finding, duplicated `rowFor` helpers in two
  `AccountsScreen.test.tsx` `describe` blocks. Fixed in `a875117` by hoisting
  a single module-level helper; the same commit made the stale-account
  transfer test order-agnostic. No other finding.
- **Axis B — spec and acceptance:** zero findings. Every ticket acceptance
  criterion and architecture invariant was verified against code and tests.
- **Security and data integrity:** zero findings.

No unresolved issue remains. (`a875117` also touched
`AddTransferScreen.test.tsx` for the fixture determinism repair described in
the build handoff; that is test-only.)

## 3. Architecture and spec reflect what was built — confirmed

Verified against the source, not just the plan:

- `parseSignedAmount` in `src/domain/money.ts` matches Spec §5.2: trim, strip
  one leading `-`, reuse `parseAmount`, reject a sign with no digit, normalize
  `-0`, inherit the invalid-exponent `RangeError`. `parseAmount`,
  `formatAmount`, and `formatAmountInput` are unchanged.
- `AccountBalanceListItem` and `AddAccountInput.openingBalanceMinor` in
  `src/data/ledger.ts` match the architecture interfaces, including the
  ledger-signed contract and the `undefined` vs `0` distinction.
- `listAccountBalances` is one `'r'` transaction over `accounts` and `entries`,
  sorts with `compareAccountsByCreation`, applies expense debit, income
  credit, transfer debit/credit, and signed opening, ignores unknown accounts
  and missing destinations, and normalizes `-0`. `hasOpeningBalance` is
  tracked by presence, not by sum, so an explicit zero keeps it true.
- `addAccount` validates name → type → opening, normalizes `-0`, and writes
  account plus optional opening in one `'rw'` transaction. `setOpeningBalance`
  validates before the transaction, checks the account, creates one opening
  when none exists, updates the lowest-id opening and deletes duplicates, and
  deletes every opening on `null`.
- `AccountsScreen` reads `listAccountBalances` and `getSettings`, implements
  the balance table (checking/savings signed with `overdrawn`; credit
  `owed`/`in credit` with explicit zero owed), the invitation copy, the
  set/edit button names, the inline `Starting point for {name}` form with
  Clear/Save/Cancel, busy guards, one-editor rule, the optional
  `Starting point (optional)` add-form field, and the final zero-account copy:
  `Add the accounts you spend from. You can set a starting point now or later.`
- `SCHEMA_VERSION` and `BACKUP_SCHEMA_VERSION` remain `1`. No table, index,
  migration, backup field, route, home read, or `settings.lastAccountId` write
  changed. `domain/backup` is untouched.

**No production divergence was found.** Docs updated to match the built and
executed state:

- `slice-06-architecture.md`: status line now built/reviewed; wayfinder
  release precondition and handoff notes now describe the actual merge state.
- `slice-06-spec.md`: status line now built/reviewed; release precondition
  corrected; ticket shape records the eight-ticket split the build used.
- `slice-06-tickets.md`: status line records resolutions of boundary decisions
  0–7; branch base corrected to the executed merge; all **51** acceptance
  boxes ticked (0 left unticked).

## 4. AGENTS.md — no change required

This slice added no doc path. Scope, architecture, spec, tickets, build/review
handoff, and this handoff all live in folders `AGENTS.md` already lists. No
new ADR, no `docs/external/` file, and no new `CONTEXT.md` section was created
(the glossary already defined Balance and Opening balance). `AGENTS.md` is
unchanged.

## 5. Backlog — slice 6 marked done; no next slice to pull

`docs/product/backlog.md` marks slice 6 as **Done — built and reviewed
2026-11-12**. All eight slices are now done.

**The next backlog slice is not a slice: it is the release.** No deferred
slice remains, and this slice's learning does not add or reorder one:

- `master` has the slice 07 merge but is six commits ahead of `origin/master`;
  slice 6 is not merged. Release order: merge `slice-06` into `master`, push,
  deploy, and verify the live bundle holds income before balances.
- No stored shape changed, so no migration or cleanup precedes release.
- The only tracked validation left is slice 5's real-data last-month
  comparison, which cannot run until December 2026 at the earliest.
- Test-suite fact to carry forward: accounts created in the same millisecond
  share `createdAt`, so fixtures must select the intended account by
  `listAccounts()` order rather than assume creation order. Two transfer
  fixtures were repaired for this on the branch.
- No new candidate work was identified; anything new goes through triage, not
  this backlog's now-empty slice list.

## Known notes, not defects

- `listAccountBalances` reads every entry, because every kind affects some
  account. Intentional at one user and a few thousand rows; an index would not
  narrow this read and would be a later Dexie version bump.
- The backup parser still tolerates a stray `categoryId`/`toAccountId` on an
  opening and does not enforce one opening per account. The balance read sums
  duplicates correctly and the next set/clear collapses them.
- `openingDateFor` falls back to today's local date when a restored
  `createdAt` is not a valid date.

## Not verified

- Backup save/restore through the browser UI; unit tests cover serialize →
  parse → restore, older files, duplicates, and replacement.
- Physical phone install, real service-worker offline reload, and a real
  screen reader. The browser pass used a managed Chromium profile.
- Merge, push, and deployment. This gate did not touch `master` or the remote.

## Next

1. Release: merge `slice-06` into `master`, push (this also pushes the slice 07
   merge), deploy, and verify the live bundle.
2. Keep the December 2026 real-data check for slice 5's last-month comparison
   on the list.
3. Run the periodic architecture drift check before starting new work; slices
   1–8 have now all landed.
