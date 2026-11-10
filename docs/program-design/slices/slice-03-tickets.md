# Slice 03 Tickets — Keep a backup

- **Gate:** Ticket Breakdown (workflow step 6)
- **Sources:** `docs/program-design/slices/slice-03-spec.md` (the contract;
  sections are cited per ticket), `docs/architecture/slices/slice-03-architecture.md`,
  `docs/product/slices/slice-03-scope.md`, `docs/standards.md`
- **Branch:** `slice-03`
- **Status:** ready for build. 7 tickets, 3 of which can start immediately.

Each ticket is one build session, test-first, and one commit when its tests
pass. Tickets are ordered by dependency, not by spec order. Tickets 1–4 add no
UI; they ship green and are verified at their module seam, as slice 2 did for
its read and write tickets.

---

## Ticket order at a glance

| # | Ticket | Blocked by |
|---|---|---|
| 1 | Backup file format module | — |
| 2 | Ledger backup operations and first-run seeding | 1 |
| 3 | Storage status module and boot wiring | — |
| 4 | Save-backup browser adapter | — |
| 5 | Backup screen, route, and save path | 1, 2, 3, 4 |
| 6 | Restore path, zero-account gate, and first-run entry | 1, 2, 5 |
| 7 | Home storage warning | 3, 5 |

Frontier: 1, 3, and 4 start immediately and in any order. After 1, ticket 2 is
unblocked. Ticket 5 is the integration point and needs all four. Ticket 6 is
the tail that makes restore reachable on a phone with no ledger. Ticket 7 is a
small independent tail.

Why not spec order: the spec's order (format → ledger → storage → adapter →
screen → restore → warning) is the right *conceptual* order, but the storage
module and the save adapter are independent of the backup format and the
ledger. Running them in parallel with tickets 1–2 shortens the critical path.

---

## Standing rules for every ticket

- Failing test first, then the minimum implementation, same session. A ticket
  that changes a runnable surface is not done on tests alone — run it.
- Assert `BackupError.code` and `LedgerError.code`, never message text.
  Assert user-facing copy at the UI seam.
- Known-good literals; never recompute the expected value the way the
  implementation does.
- Real `BudgetDatabase` per ledger test
  (`budget-test-${crypto.randomUUID()}`), deleted in `afterEach`;
  `fake-indexeddb` is the only boundary.
- Browser adapters are tested by stubbing browser globals
  (`window.showSaveFilePicker`, `navigator.share`, `navigator.storage`), never
  by mocking `domain/backup`, `data/ledger`, or Dexie.
- `waitFor` for live-query updates; no sleeps, no fake timers.
- No new dependency, no schema change, no new test seam, no mocked ledger.
- Module direction holds: no UI import of `data/db` or `dexie`; no domain
  import of `data/` or `app/`.
- If the build contradicts the spec, fix the spec in the same commit. Do not
  diverge silently.

---

## Boundary decisions

These are the calls the spec and architecture leave open, or where this
breakdown had to pick a shape. Challenge them before building.

1. **The spec was written during this gate.** No `slice-03-spec.md` existed
   when the breakdown started; it has been authored from the architecture and
   scope and is marked as such. The durable file contract (§6 of the spec) is
   still **unconfirmed**. Confirm it before ticket 1, or accept the
   architecture's shape and treat tickets 1–2 as the point of no return.
2. **The home warning is its own ticket (7), not part of 5.** It depends only
   on the storage hook and the backup route, and it has distinct acceptance
   criteria (never shows while the status is `undefined`). If ticket 5 runs
   short, merge 7 into it; if 7 feels too thin to review, that is the merge.
3. **`opening` amounts accept any safe integer, including zero and negative.**
   The architecture says "signed for opening" while the other three kinds are
   "positive". This reading lets a credit-card opening balance be negative and
   avoids inventing a third rule. If you want strictly non-zero openings, that
   is a spec change, not a silent implementation choice.
4. **Sorting uses code-unit comparison, not `localeCompare`.** `localeCompare`
   varies by locale and would break the byte-identical-file promise. Tests
   assert order with ids chosen so both comparators agree, plus one pair where
   they differ.
5. **The anchor-download blob URL is revoked on the next macrotask.** The
   click has already started the download; revoking synchronously is flaky in
   some browsers. The adapter test uses `waitFor`, not fake timers.
6. **`requestPersistentStorage` memoizes at module level.** Tests that need a
   fresh memo use `vi.resetModules()` plus a dynamic import. Do not add a
   test-only reset export.
7. **`onRestored(0)` suppresses nothing.** Only a restore with at least one
   account needs the landing guard; a zero-account restore goes to accounts,
   which is already the correct gate outcome. `App` therefore only sets
   `pendingRestore` for a positive count.
8. **The restore section is added to `BackupScreen` in ticket 6.** Ticket 5
   ships a screen with last-backup, storage, and save only; the same file is
   extended in 6. This keeps ticket 5 under a session and keeps the accounts
   restore link from pointing at a screen with no restore UI.
9. **`formatLocalDateTime` tests do not pin ICU output.** They assert the
   result is non-empty, contains the year, and differs from the ISO input. UI
   tests assert the `<time dateTime>` attribute and non-empty text. Pinning
   "Nov 10, 2026, 7:42 PM" would fail across Node/ICU versions.
10. **Save-outcome UI tests drive the real adapter through stubbed globals.**
    No module mock of `saveBackupFile`; a stubbed picker or a missing picker
    and share API is the control surface.

---

## 1. Backup file format module

**Goal:** the app can turn ledger data into one deterministic file, read that
file back, refuse anything that is not a current-compatible backup, and name
and preview it — all without Dexie or the DOM.

**Blocked by:** none. Confirm boundary decision 1 first.

**Spec:** §5.2, §6 (all), §14.1.

**Files:** `src/domain/backup.ts` (new), `src/domain/backup.test.ts` (new).

**Build**

- Export `BACKUP_FORMAT`, `BACKUP_SCHEMA_VERSION`, `BackupSettings`,
  `BackupData`, `BackupFile`, `BackupPreview`, `BackupErrorCode`,
  `BackupError`, and the five functions from §5.2.
- `createBackupFile`: copy and sort each array by `id` with code-unit
  comparison; project settings to `{ currency, currencyExponent }`; set
  `schemaVersion` and `exportedAt.toISOString()`.
- `serializeBackup`: `JSON.stringify(file, null, 2) + '\n'`.
- `backupFileName`: local date parts, zero-padded, `budget-backup-` prefix.
- `parseBackupFile`: ordered checks from §6.5, then the empty `MIGRATIONS`
  registry loop, then §6.6 validation. Rebuild each row from known fields so
  unknown extras are dropped and absent optionals are omitted.
- `previewBackup`: counts from §6.8.

**Tests** (§14.1)

- Round-trip: every row and the currency pair survive
  create → serialize → parse; arrays come back sorted by `id`; settings carry
  only the currency pair.
- Two exports of the same data produce identical text; text ends with a
  newline and is indented.
- Each refusal in §6.5 and each malformed row field in §6.6, asserting
  `error.code`.
- Unknown extra fields parse and are absent from the result.
- `previewBackup` counts; `backupFileName` uses local parts and the prefix.

**Acceptance criteria**

- [ ] `npm run test` and `npm run typecheck` pass.
- [ ] `domain/backup.ts` imports only `domain/types` and `domain/calendar`;
      no Dexie, no DOM.
- [ ] `createBackupFile` output is byte-identical for the same input on two
      runs, including when input arrays are shuffled.

---

## 2. Ledger backup operations and first-run seeding

**Goal:** the ledger can produce a consistent snapshot, replace itself
atomically from a snapshot, record a confirmed backup time, and never re-seed
starter categories after a restore.

**Blocked by:** 1 (`BackupData`).

**Spec:** §5.1, §9 (all), §14.2.

**Files:** `src/domain/types.ts`, `src/data/ledger.ts`,
`src/data/ledger.test.ts`.

**Build**

- Add `lastBackupAt?: string` to `Settings`. No Dexie change.
- `readBackupData()`: one `r` transaction over four tables; missing settings →
  `Error('Ledger not initialized')`; read all rows, sort by `id` with
  code-unit comparison, project the currency pair.
- `markBackupSaved(at)`: one `rw` transaction on `settings`; zero rows updated
  → `Error('Ledger not initialized')`.
- `restoreBackup(data)`: one `rw` transaction over four tables; remember
  `lastBackupAt`; `clear`; `bulkAdd`; `add` the settings row with the
  remembered timestamp and no `lastAccountId`.
- `initialize()`: move category seeding inside the `if (!settings)` branch
  per §9.5.

**Tests** (§14.2)

- `readBackupData` returns every row sorted by `id`, drops `lastAccountId` and
  `lastBackupAt`, and throws before `initialize`.
- `restoreBackup` replaces all four tables; preserves `lastBackupAt`; drops
  `lastAccountId`; tolerates missing account/category references.
- Duplicate entry ids throw and leave the previous ledger byte-for-byte
  intact (the atomicity proof).
- `markBackupSaved` writes only `lastBackupAt`; throws before `initialize`.
- After restoring a reduced category set, `initialize` does not re-add starter
  categories; the existing idempotency test still passes unchanged.

**Acceptance criteria**

- [ ] Every existing slice-1/2 ledger test passes with no edits.
- [ ] `SCHEMA_VERSION` is still `1`; `db.ts` is unchanged.
- [ ] No UI file changed.

---

## 3. Storage status module and boot wiring

**Goal:** the app can answer "has this browser agreed to keep the ledger?" as
persisted, at-risk, or unknown, asks for persistence at most once, and
re-reads the answer when the tab becomes visible.

**Blocked by:** none.

**Spec:** §8, §14.3.

**Files:** `src/app/storage.ts` (new), `src/app/storage.test.ts` (new),
`src/app/pwa.ts`, `src/main.tsx`.

**Build**

- `readStorageStatus()`: missing or throwing API → `'unknown'`; otherwise
  `persisted()` → `'persisted'` / `'at-risk'`.
- `requestPersistentStorage()`: module-level memoized promise around
  `persist?.()`; swallow rejection.
- `useStorageStatus()`: `undefined` until the first read; await the memoized
  request, then read; re-read on `visibilitychange` while visible; clean up.
- Remove `requestPersistentStorage` from `app/pwa.ts`; keep `registerPwa`
  only. Update `main.tsx` to import from `app/storage`.

**Tests** (§14.3)

- `readStorageStatus`: true / false / missing / throwing.
- Two `requestPersistentStorage()` calls trigger one `persist()`.
- Hook: `undefined` before resolution, value after, fresh value after a
  `visibilitychange`; listener removed on unmount.
- Use `vi.resetModules()` + dynamic import where the memo must be fresh.

**Acceptance criteria**

- [ ] `app/pwa.ts` exports only `registerPwa`.
- [ ] `storage.ts` imports no Dexie and no ledger.
- [ ] `boot` still renders and registers the service worker; the persistence
      request happens after render and never blocks it.

---

## 4. Save-backup browser adapter

**Goal:** one file object can be handed to the phone — picker, share sheet, or
download — and the caller learns whether the save was confirmed, cancelled, or
merely handed off.

**Blocked by:** none.

**Spec:** §10, §14.3.

**Files:** `src/app/saveBackupFile.ts` (new),
`src/app/saveBackupFile.test.ts` (new).

**Build**

- `SaveOutcome` and `saveBackupFile(file)` with the §10 ladder.
- Local minimal declarations for `showSaveFilePicker`,
  `FileSystemFileHandle`, `FileSystemWritableFileStream`; no dependency.
- Error classification by `error.name` (`AbortError`, `NotAllowedError`,
  `SecurityError`), not `instanceof`.
- Anchor path: blob URL, temporary `<a download>`, click, remove, revoke on
  `setTimeout(…, 0)`.

**Tests** (§14.3)

- Picker: close → `saved`; `AbortError` → `cancelled`; `NotAllowedError` and
  `SecurityError` fall through to the next capability; other errors rethrow.
- Share: resolve → `saved`; `AbortError` → `cancelled`; other failure falls
  through.
- No picker/share → anchor → `unconfirmed`; the blob URL is created and
  revoked; the anchor is removed.
- Order: picker is tried before share before anchor.

**Acceptance criteria**

- [ ] `saveBackupFile.ts` imports no ledger and no `domain/backup`.
- [ ] No real file, picker, or permission prompt is opened in tests.
- [ ] `npm run typecheck` passes without adding DOM types or a dependency.

---

## 5. Backup screen, route, and save path

**Goal:** from home, the user opens `#/backup`, sees whether the phone will
keep the ledger and when the last backup was made, and saves a backup through
the phone's own save flow; a confirmed save updates the shown time.

**Blocked by:** 1, 2, 3, 4.

**Spec:** §7, §11.1, §12.1, §12.3, §13.1 (last backup, storage, save),
§13.5, §14.4, §14.5.

**Files:** `src/app/router.ts`, `src/app/router.test.ts`, `src/app/App.tsx`,
`src/app/App.test.tsx`, `src/app/screens/HomeScreen.tsx`,
`src/app/screens/HomeScreen.test.tsx`, `src/app/screens/BackupScreen.tsx`
(new), `src/app/screens/BackupScreen.test.tsx` (new),
`src/domain/calendar.ts`, `src/domain/calendar.test.ts`, `src/styles.css`.

**Build**

- Add `formatLocalDateTime` per §7 with tests that do not pin ICU output.
- Add the `backup` route variant, its `parseHash` / `routeToHash` cases, and
  the `App` case rendering `BackupScreen`. Variant, case, and screen land
  together.
- `BackupScreen` with three blocks: last backup (live settings query), storage
  status (`useStorageStatus`), save backup. Save follows §12.1: read →
  create → serialize → `File` → `saveBackupFile`; only `saved` calls
  `markBackupSaved`; each outcome and the `markBackupSaved` failure get their
  copy from §12.1. Busy guard prevents a double save.
- Home: add the `Backup` button to the bottom actions row.
- Styles: `.backup-section` plus any spacing the warning ticket will reuse.

**Tests** (§14.4, §14.5)

- Router: `#/backup` round-trips; existing routes unchanged.
- Screen: "No backup yet." before any backup; the three storage copies plus
  the checking state.
- Confirmed save (stub `showSaveFilePicker` resolving a writable) writes
  `lastBackupAt` and shows the time; cancelled and unconfirmed saves write
  nothing and show their copy; a thrown save shows the error copy.
- Home: `Backup` navigates to the screen.
- Existing App/Home tests pass unchanged.

**Acceptance criteria**

- [ ] In `npm run dev`, home → Backup → Save opens the browser's save flow and
      the screen shows the backup time after a confirmed save.
- [ ] A cancelled picker leaves `lastBackupAt` absent and shows "No file was
      saved."
- [ ] No restore UI is rendered yet; `BackupScreen` has no dead controls.

---

## 6. Restore path, zero-account gate, and first-run entry

**Goal:** the user can choose a backup, see its date and counts, cancel
safely, or confirm a complete replacement that lands on the restored home —
including on a phone with no accounts.

**Blocked by:** 1, 2, 5.

**Spec:** §11.2, §12.2, §13.1 (restore), §13.3, §14.5.

**Files:** `src/app/screens/BackupScreen.tsx`,
`src/app/screens/BackupScreen.test.tsx`, `src/app/App.tsx`,
`src/app/App.test.tsx`, `src/app/screens/AccountsScreen.tsx`,
`src/app/screens/AccountsScreen.test.tsx`.

**Build**

- Extend `BackupScreen` with the restore block: labelled file input,
  `file.text()` → `parseBackupFile` → `previewBackup`, inline preview, Cancel,
  confirm, error mapping, input reset after every attempt, busy guard.
- On confirm: `restoreBackup(preview.data)` → `onRestored(accountCount)` →
  navigate per §11.2. A write error keeps the preview and shows "Couldn't
  restore the backup. Your ledger is unchanged."
- `App`: pass `onRestored`; allow `backup` in both the redirect effect and the
  loading guard; hold `pendingRestore` for a positive count and clear it when
  the live accounts query is non-empty.
- `AccountsScreen`: add the always-visible `Restore from backup` button.

**Tests** (§14.5)

- Preview shows the file's date, account and entry counts (singular and
  plural), and the replacement warning; Cancel clears the preview and leaves
  every table unchanged.
- Confirm replaces the ledger and lands on home with the restored total.
- `not-a-backup`, `damaged`, and `newer-version` files show the mapped copy
  and leave the ledger unchanged; the same file can be chosen again after an
  attempt.
- First run: with zero accounts, the accounts screen reaches `#/backup` and
  the gate does not bounce it; confirming a backup with accounts lands on
  home; a backup with zero accounts lands on accounts.
- After a restore, `addExpense` / `updateExpense` / `deleteExpense` still work
  at the ledger seam (one smoke assertion through the UI or ledger).

**Acceptance criteria**

- [ ] A fresh browser profile restores a file with no account created first.
- [ ] A corrupt file leaves the current ledger byte-for-byte unchanged.
- [ ] The restored home shows the current month and the restored totals.

---

## 7. Home storage warning

**Goal:** when the browser might discard the ledger, home says so persistently
and links to the backup screen; when it has agreed, or while the check is
still running, home says nothing.

**Blocked by:** 3, 5.

**Spec:** §13.2, §14.5.

**Files:** `src/app/screens/HomeScreen.tsx`,
`src/app/screens/HomeScreen.test.tsx`, `src/styles.css`.

**Build**

- `useStorageStatus()` in `HomeScreen`.
- `'at-risk'` and `'unknown'` render the §13.2 paragraph directly after the
  `<h1>`, with a `Back up now` button navigating to `{ name: 'backup' }`.
- `'persisted'` and `undefined` render nothing. No `role="alert"`.
- `.storage-warning` style.

**Tests** (§14.5)

- `persisted()` false → at-risk copy and a working `Back up now`.
- API missing or throwing → unknown copy.
- `persisted()` true → no warning.
- Status still unresolved → no warning (assert absence before the promise
  settles).
- The warning does not replace the summary, month controls, or actions.

**Acceptance criteria**

- [ ] In `npm run dev`, revoking storage permission shows the warning on home
      and the link opens `#/backup`.
- [ ] The warning never flashes while the status is `undefined`.
- [ ] Existing Home tests pass unchanged.

---

## Slice close-out

- [ ] All seven tickets pass their tests; `npm run test` and
      `npm run typecheck` are green on `slice-03`.
- [ ] `code-review` approved against `docs/standards.md` and this spec.
- [ ] The spec and tickets reflect what was built; any divergence was fixed in
      the same commit.
- [ ] `docs/product/backlog.md` marks slice 3 complete and confirms the next
      slice.
- [ ] Manual check: build, preview, go offline, save through the phone's share
      sheet, restore in a fresh profile, corrupt a file, revoke storage
      permission.
- [ ] Slice handoff written to `docs/agents/`.
