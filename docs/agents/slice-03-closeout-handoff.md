# Handoff — Slice 03 Close-out

## Gate
Slice close-out (workflow step 9) — complete. Build and review detail is in
`docs/agents/slice-03-build-review-handoff.md`; this pass ran step 9 only.

## Artifacts
- `docs/architecture/slices/slice-03-architecture.md`
- `docs/program-design/slices/slice-03-spec.md`
- `docs/program-design/slices/slice-03-tickets.md`
- Code on `slice-03` (not yet merged to `master`, not yet deployed)
- No `slice-03-complete` tag yet

## Definition of Done

1. **All tickets pass their tests.** `npm test` — 352 tests across 15 files,
   all passing. `npm run typecheck` — clean. `npm run build` — clean; PWA
   precache emits 12 entries. Baseline at slice start was 245 tests across
   11 files. Every slice-1/2 test still passes unchanged.
2. **`code-review` approved.** Two fresh `reviewer` subagents on
   DeepSeek V4 Pro, two axes, seeing only `git diff master...HEAD` plus
   `docs/standards.md`, the slice spec, architecture, tickets, and the
   slice-02 close-out. No build transcript. Every finding has a resolution:
   - P3 duplicate code-unit comparator — **fixed** in `3023178`:
     `byCodeUnitId` is exported from `domain/backup` and imported by
     `data/ledger`, so snapshot and file ordering share one comparator.
   - P3 `isObject` guard flagged for `rule://ts-no-local-is-record` —
     **accepted** as a narrowing type guard at the JSON boundary, with every
     field validated immediately after; the rule's type-guard exception
     applies. No change.
   - P3 missing `markBackupSaved` failure test — **fixed** in `3023178`:
     the test starts a real save, closes the real database with
     `disableAutoOpen`, resolves the picker, and asserts both
     “Backup saved.” (`role="status"`) and “The backup was saved, but the app
     couldn't record when.” (`role="alert"`). No ledger mock.
   - P3 save status/alert ARIA roles unasserted — **fixed** in `3023178`:
     saved, cancelled, unconfirmed, thrown-error, and timestamp-failure tests
     now query `role="status"` / `role="alert"` and assert their text.
   No findings remain open.
3. **Architecture and spec reflect what was built.** Close-out audited
   exports, error codes, validation order, transaction scopes, route grammar,
   zero-account gate, restore landing, UI copy, and storage version against
   the code. No behavioural, interface, storage, navigation, or copy drift.
   Documentation corrections made in this pass:
   - Spec header no longer says slice 3 is “not built”; the backup file
     contract is marked **confirmed by the build** as v1.
   - Architecture’s durable-contract section is retitled and written in the
     past tense; it records that v1 files now exist.
   - Both interface listings now include exported `byCodeUnitId`.
   - `schemaVersion` validation is described as a **positive safe integer**,
     matching `Number.isSafeInteger`.
   - Spec §11.2 now describes the actual `pendingRestore` behaviour: both the
     redirect and loading guard are skipped, and home renders from the
     committed ledger rather than flashing accounts.
   - Spec §17 records the implementation facts not in the original plan: the
     shared comparator export, the `tsconfig.json` `lib` bump from ES2022 to
     ES2024 for `Promise.withResolvers` in tests, and the review-added
     role/failure tests. No dependency, DOM type, schema, or store change.
   - Tickets are marked complete; the environment-limited manual checks are
     annotated rather than claimed as fully exercised.
   - `docs/architecture/north-star.md` no longer lists the exact backup file
     shape as open; it points to the slice-03 architecture.
4. **`AGENTS.md` updated if new doc paths landed.** No new doc paths were
   added this slice. Every new file falls under paths already listed:
   `docs/product/slices/`, `docs/architecture/slices/`,
   `docs/program-design/slices/`, and `docs/agents/`. No edit required.
5. **Backlog updated.** Slice 3 is marked **Done — 2026-11-10 on branch
   `slice-03`; not yet deployed**. Slice 4 — Manage categories — remains the
   next slice. Close-out re-checked the order: the backup file is ledger-only
   and the data model did not change (`SCHEMA_VERSION` and
   `BACKUP_SCHEMA_VERSION` both stay `1`), so category management adds no
   backup migration. The starter category list is still fixed, and the user
   should shape categories before the first full-month comparison. Nothing
   learned in slice 3 changes slice 4; no priority shift.
6. **Final handoff.** This file.

## What landed
- **`domain/backup`:** envelope, deterministic build/serialize, ordered
  parse/refusal, empty migration registry, row validation, preview, filename,
  and the shared `byCodeUnitId` comparator.
- **`data/ledger`:** `readBackupData`, `restoreBackup` (one `rw` transaction,
  `clear` + `bulkAdd`, preserves `lastBackupAt`, drops `lastAccountId`),
  `markBackupSaved`; `initialize` seeds categories only when the settings row
  is absent.
- **`app/storage`:** persisted / at-risk / unknown, memoized `persist()`
  request, visibility re-read hook. `app/pwa` now exports only `registerPwa`.
- **`app/saveBackupFile`:** picker → share → anchor ladder, error
  classification by `error.name`, local declarations, no dependency.
- **UI:** `#/backup` route, backup screen (last backup, storage, save,
  restore), home warning and Backup action, accounts restore entry,
  zero-account gate allowing `#/backup`, and `pendingRestore` landing.
- **Unchanged:** `SCHEMA_VERSION` and `BACKUP_SCHEMA_VERSION` both `1`;
  `src/data/db.ts` unchanged; no dependency added.

## Verification limits
- A confirmed save through the real OS file dialog is not observable in
  headless Chromium; the native picker auto-dismisses as `AbortError`. The
  confirmed path is covered by the stubbed-picker UI test; the cancelled
  real-picker path was observed in the browser.
- Physical-phone share sheet, install, offline behaviour of the new route,
  and a real permission revoke were not exercised. Browser checks used the
  dev server in headless Chromium at 390×844.
- Screen-reader announcement quality and visual layout beyond the text
  checks were not re-verified.
- `vi.resetModules()`-based memoization tests run under jsdom, not a second
  real browser tab; cross-tab `visibilitychange` was not exercised.

## Merge and deployment
- Close-out commit is on `slice-03`; `master` is unchanged.
- Not merged, not deployed, no tag. Next step is the usual `--no-ff` merge
  into `master`, push, deploy, tag `slice-03-complete`, and verify the
  deployed asset.

## Next gate
Slice 4 — Manage categories. Read, in order:

1. `docs/product/backlog.md`
2. `docs/product/slices/slice-04-scope.md` (to be written)
3. `docs/architecture/north-star.md`
4. `docs/architecture/slices/slice-03-architecture.md`
5. `docs/program-design/slices/slice-03-spec.md`

Start with the scope gate (`wayfinder`), not the build. Category management
adds no backup-schema change: `Category` already has `archived`, and no
stored field needs to change.

## Open items carried forward
- Slice 3 is not deployed yet; merge and deploy remain.
- The physical-phone manual checks listed above remain unexercised.
- No runtime React error boundary; only boot failure is handled.
- Single-tab assumption; no cross-tab coordination.
- The `isObject` review exception is accepted; future rule passes should
  treat it as resolved, not re-open it.
- North-star still says `fromAccountId` while the built entry type uses
  `accountId` as the transfer source; slice 8 must keep that field or migrate.
