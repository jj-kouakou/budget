# Handoff — Architecture drift fixes, priorities 1–5

## Gate

Periodic architecture drift check follow-up. Fixed and reviewed priorities
1–5 from the 2026-11-12 drift report. No product scope changed; the public
`Ledger` interface, routes, user-facing copy, `SCHEMA_VERSION`, and
`BACKUP_SCHEMA_VERSION` remain unchanged.

## Branch and state

Working tree on `slice-06` at `d56174e`, uncommitted. Not merged, pushed, or
deployed.

## Fixed

1. **Categorized-entry and transfer behavior are now deep modules.**
   `src/app/categorizedEntryEditor.tsx` owns loading, the zero-account and
   no-active-category preconditions, form state, client validation, submit,
   error mapping, removal confirmation, focus, busy guards, and not-found
   rendering for both add and edit. `AddExpenseScreen`, `AddIncomeScreen`,
   `EntryEditorScreen`, and `IncomeEditorScreen` are thin route adapters that
   pass navigation callbacks. `CategorizedEntryFields` remains the field
   renderer. `src/app/transferEditor.tsx` applies the same pattern to
   transfers; `AddTransferScreen` and `TransferEditorScreen` are adapters and
   `TransferFields` remains the field renderer. This removes the duplicated
   submit/validation/delete logic that previously lived in six screens.
2. **Balance effects are exhaustive.** `listAccountBalances` now switches over
   `EntryKind` with a `never` default, so a future kind cannot be silently
   omitted from balances.
3. **Exact fixes.** `EntryEditorScreen` navigates with the returned entry's
   category; `AccountsScreen` derives its type options from
   `ACCOUNT_TYPES`/`ACCOUNT_TYPE_LABELS` in `app/labels.ts`.
4. **`categoryEntries` is snapshot-consistent.** It now reads `entries`,
   `accounts`, and `categories` in one `r` transaction, matching the other
   multi-table read models.
5. **`data/ledger` is split behind the same seam.** `createLedger` composes
   `ledgerAccounts`, `ledgerCategories`, `ledgerEntries`, `ledgerReports`,
   and `ledgerBackup`; shared types, errors, and helpers live in
   `ledgerShared`. `ledger.ts` re-exports the existing public surface, so no
   caller or test import changed.

## Verification

- `npm run typecheck` — clean.
- `npm test` — 22 files, **755 tests passed**, 0 failures.
- `npm run build` — clean; PWA precache 12 entries.
- Browser smoke on `vite preview` with a managed Chromium tab: added an
  account with a starting point, added an expense, corrected its amount
  through the category list, added income, corrected its amount, added a
  second account, added a transfer, and corrected its amount. Home, category
  list, income list, transfer list, and totals updated through the live
  queries.
- `tsc --noUnusedLocals --noUnusedParameters` — only three pre-existing
  unused test symbols; no new unused symbols.

## Review

Two independent read-only reviewers on the reviewer agent (different model
from the build) reviewed the diff, the new files, `docs/standards.md`, and
the architecture docs.

- **Standards / architecture:** zero findings. The shared editor passes the
  deletion test, the ledger split keeps the public seam and composition
  complete, all applicable `ts-*` and `pj-*` rules are clean, and the
  north-star invariants (one `entries` collection, expense-only spending,
  derived balances, one entry write path, backup v1, no stored aggregates)
  hold.
- **Behavior:** zero regressions. Every affected path was compared against
  the pre-refactor implementation, including initial form state, validation,
  error mapping, delete confirmation/focus, busy guards, navigation, and
  not-found behavior. A focused follow-up review of the transfer editor was
  also clean. One informational P3: the exhaustive balance switch now throws
  on an unknown `EntryKind` instead of silently computing a partial balance.
  That is deliberate hardening and unreachable through the v1 data model.

## Docs

- `docs/architecture/slices/slice-07-architecture.md` records the shared
  categorized-entry editor as a follow-up and adds a decision-log row.
- `docs/architecture/slices/slice-08-architecture.md` records the shared
  transfer editor the same way.
- No ADR or `CONTEXT.md` change: no new domain term or hard-to-reverse
  decision.
- `docs/standards.md` needs no change; `pj-account-type-labels` is now fully
  satisfied.

## Not verified

- Backup save/restore through the browser UI after the module move. The
  backup logic is byte-identical and the ledger tests cover serialize →
  parse → restore, older files, duplicate ids, and replacement.
- Physical phone install, real offline reload, and real screen-reader output.
- Merge, push, and deployment. Slice 6 is still unmerged, and `master` still
  holds the unpushed slice 7 merge.

## Next

1. Review and commit the drift-fix diff.
2. Release: merge `slice-06` into `master`, push, deploy, and verify the live
   bundle holds income before balances.
3. Keep the December 2026 real-data check for slice 5's last-month
   comparison.
