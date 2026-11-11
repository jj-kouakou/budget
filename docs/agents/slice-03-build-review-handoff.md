# Handoff — Slice 03 Build and Review

## Gate
Combined build + review (workflow steps 7–8) — complete. Close-out (step 9)
is deliberately left for its own pass.

## Branch and commits
- Gate docs committed to `master` as `73bc765`; branch `slice-03` cut from it.
- `b9f52af` ticket 1: backup file format module
- `b862a25` ticket 2: ledger backup operations and first-run seeding
- `41551f9` ticket 3: storage status module and boot wiring
- `187e939` ticket 4: save-backup browser adapter
- `54894f7` ticket 5: backup screen, route, and save path
- `333f0f8` ticket 6: restore path, zero-account gate, and first-run entry
- `a356b79` ticket 7: home storage warning
- `3023178` review fixes: share id comparator, assert status/alert roles,
  cover timestamp-record failure

## Baseline and final verification
- Baseline before any change: `npm test` — 245 tests across 11 files, all
  passing; `npm run typecheck` clean.
- Final: `npm test` — 352 tests across 15 files, all passing;
  `npm run typecheck` clean; `npm run build` clean (PWA precache 12 entries).
- Slice-1/2 tests were not edited; all still pass.
- `SCHEMA_VERSION` and `BACKUP_SCHEMA_VERSION` are both still `1`;
  `src/data/db.ts` is unchanged; no dependency added.

## What landed
- `domain/backup`: envelope, deterministic build/serialize, ordered
  parse/refusal, empty migration registry, row validation, preview, filename;
  exports a shared code-unit `byCodeUnitId` used by the ledger snapshot.
- `data/ledger`: `readBackupData`, `restoreBackup` (one `rw` transaction,
  `clear` + `bulkAdd`, preserves `lastBackupAt`, drops `lastAccountId`),
  `markBackupSaved`; `initialize` seeds categories only when the settings row
  is absent.
- `app/storage`: persisted / at-risk / unknown, memoized `persist()` request,
  visibility re-read hook; `app/pwa` now exports only `registerPwa`.
- `app/saveBackupFile`: picker → share → anchor ladder, error classification
  by `error.name`, local declarations, no dependency.
- UI: `#/backup` route, backup screen (last backup, storage, save, restore),
  home warning and Backup action, accounts restore entry, zero-account gate
  allowing `#/backup` with `pendingRestore` landing behaviour.
- `calendar.formatLocalDateTime`, `Settings.lastBackupAt`.

## Browser checks (dev server, headless Chromium, 390×844)
1. Fresh IndexedDB (`indexedDB.deleteDatabase('budget')`) → accounts screen
   with zero accounts shows `Restore from backup`.
2. Clicking it reaches `#/backup`; the zero-account gate does not bounce it.
3. Uploading a valid backup previews “1 account and 1 entry”, the file date as
   a `<time>`, and the replacement warning.
4. Confirming lands on `#/?m=2026-11`, heading “November 2026”, and
   “Spent CA$43.21” — the restored total — with no account created first.
5. Uploading `{ broken` shows “That file isn't a Budget backup.”; returning to
   home still shows CA$43.21, so the ledger was untouched.
6. Home with `navigator.storage.persisted() === false` shows “This phone may
   discard your ledger.” and `Back up now` opens `#/backup`.
7. Save backup in headless Chromium invokes the real
   `showSaveFilePicker`; the dialog auto-dismisses as `AbortError`, the screen
   shows “No file was saved.”, and `settings.lastBackupAt` remains absent.

## Review
Two fresh `reviewer` subagents on `deepseek-ai/DeepSeek-V4-Pro` (the
configured reviewer override; build ran on DeepSeek V4.1 Flash). They saw only
`git diff master...HEAD` plus `docs/standards.md`, the slice spec,
architecture, tickets, and the slice-02 close-out. No build transcript.

### Axis A — standards
- **P3 duplicate code-unit comparator** in `domain/backup.ts` and
  `data/ledger.ts`. Fixed: exported `byCodeUnitId` from `domain/backup` and
  imported it in `data/ledger`, so snapshot ordering and file ordering cannot
  diverge.
- **P3 `isObject` guard** flagged for `rule://ts-no-local-is-record`.
  Reviewed and accepted: it is a narrowing type guard used only at the JSON
  boundary, with every field validated immediately after; the rule's allowed
  type-guard exception applies. No change.
- No other findings across Fowler smells, tdd/domain/design prose rules, or
  `rule://ts-*`; module direction and real-DB test conventions held.

### Axis B — spec and acceptance
- **P3 missing test for `markBackupSaved` failure copy** (spec §12.1). Fixed:
  a new test starts a real save, closes the real database with
  `disableAutoOpen`, resolves the picker, and observes both “Backup saved.”
  (`role="status"`) and “The backup was saved, but the app couldn't record
  when.” (`role="alert"`). No ledger mock.
- **P3 save status/error ARIA roles unasserted** (spec §13.4). Fixed: save
  success, cancelled, unconfirmed, thrown-error, and timestamp-failure tests
  now query `role="status"` / `role="alert"` and assert their text.
- All ticket acceptance criteria and cited sections otherwise verified:
  copy, error mapping by code, save-recording rules, zero-account gate,
  `pendingRestore`, deterministic files, atomic restore, and unchanged
  schema/indexes.

## Could not verify
- A confirmed save through the real OS file dialog: headless Chromium
  auto-dismisses the native picker as `AbortError`. The confirmed path is
  covered by the UI test through a stubbed picker; the cancelled real-picker
  path was observed in the browser.
- Physical-phone share sheet, install, and offline behaviour of the new
  route; only the dev server in headless Chromium was exercised.
- Screen-reader announcement quality and visual layout beyond the 390×844
  text checks.
- `vi.resetModules()`-based memoization tests run under jsdom, not a second
  real browser tab; cross-tab `visibilitychange` was not exercised.

## Notes for close-out
- No spec/architecture drift was found; neither doc required edits.
- `docs/product/backlog.md` still marks slice 3 “In progress”; slice close-out
  owns flipping it to Done and confirming slice 4.
- The home warning copy and the backup-screen storage copy intentionally
  differ per §13.1/§13.2.
