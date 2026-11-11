# Slice 03 Program Design Spec — Keep a backup

- **Gate:** Slice Program Design (workflow step 5)
- **Sources:** `docs/product/slices/slice-03-scope.md`,
  `docs/architecture/north-star.md`,
  `docs/architecture/slices/slice-03-architecture.md`, ADRs 0001/0005,
  `CONTEXT.md`, and the slice-1/2 implementation in `src/`
- **Implementation state:** slices 1 and 2 are built and deployed. Slice 3 is
  built on branch `slice-03` and closed out on 2026-11-10; this spec is its
  implementation contract.
- **Endpoints:** none. The app is static files plus IndexedDB (ADR 0001);
  `Ledger` is the whole application API.

> **Provenance note.** This spec was written during the ticket-breakdown
> session because no slice-3 spec existed. It is derived strictly from the
> slice-3 architecture and scope; it adds no architectural decision. The one
> durable contract flagged by the architecture (the backup file shape) is
> restated in §6 and was **confirmed by the build** as v1.

---

## 1. Problem Statement

The ledger holds real history on one phone, in one browser's IndexedDB. If
that phone is lost, reset, or its storage is cleared, every account, category,
and entry is gone, and there is no copy. The app also never tells the user
whether the browser has agreed to keep the data, so loss looks like it will
never happen.

## 2. Solution

One screen, reached from home and from the accounts screen, that:

1. saves the whole ledger as one JSON file through the phone's own save or
   share flow, and records the time only when a save is confirmed;
2. shows when the last backup was made;
3. restores a chosen file — preview first, then an all-or-nothing replacement —
   and refuses files that are not backups, are damaged, or are newer than the
   app;
4. states whether the browser has agreed to keep the ledger, with a
   persistent home-screen warning when it has not.

No network, no new table, no Dexie version bump, no new dependency.

## 3. User Stories

### Making a backup

1. As a user, I want a Backup action on the home screen, so that making a
   backup is one tap away from where I look at my ledger.
2. As a user, I want the backup to hold every account, category, entry, and
   the currency setting, so that a restore reproduces the whole ledger.
3. As a user, I want the phone's save or share screen, so that I can put the
   file in Files, a cloud drive, or send it to myself.
4. As a user, I want the file named with its date, so that I can tell my
   backups apart.
5. As a user, I want the app to record a backup only when a file was actually
   saved, so that the date it shows means something.
6. As a user, I want making a backup to work offline, so that safety does not
   depend on a connection.

### Knowing when the last backup was made

7. As a user, I want the backup screen to show the date and time of the most
   recent backup, so that I know how stale my copy is.
8. As a user, I want it to say plainly when no backup has been made, so that
   an empty state is not mistaken for a success.
9. As a user, I want the time shown to be the backup's time, not the time I
   opened the screen, so that the number is trustworthy.

### Restoring a backup

10. As a user, I want to choose a backup file from the phone, so that I can
    restore one I saved earlier.
11. As a user, I want to see the file's date and how many accounts and entries
    it holds before anything changes, so that I can check I picked the right
    file.
12. As a user, I want to be told plainly that restoring replaces everything,
    so that the confirmation is informed.
13. As a user, I want Cancel to change nothing, so that opening the preview is
    safe.
14. As a user, I want confirming to replace the ledger completely, so that the
    restored state is exactly the file.
15. As a user, I want to land on the current month's home after a restore, so
    that I immediately see the restored ledger.
16. As a user, I want a file that is not a backup, is damaged, or comes from a
    newer app version refused with a plain message, so that I know why nothing
    happened.
17. As a user, I want an older-version backup to restore and be brought up to
    date, so that old files do not become useless.
18. As a user, I want a failed restore to leave the current ledger exactly as
    it was, so that a bad file cannot destroy what I have.
19. As a user, I want to restore on a phone with no accounts, so that a
    replacement phone can be set up from a backup.
20. As a user, I want adding, correcting, and removing entries to work after a
    restore, so that the restored ledger is a normal ledger.

### Knowing whether the phone might discard the ledger

21. As a user, I want the app to say whether the browser has agreed to keep the
    ledger, so that I know how much the backup matters.
22. As a user, I want a visible warning on home when the browser might discard
    the data, so that I do not have to go looking for it.
23. As a user, I want the warning to link to the backup screen, so that acting
    on it is one tap.
24. As a screen-reader user, I want labelled controls and status text, so that
    backup and restore work without sight.

## 4. System Shape

### 4.1 Module map

| Module | Responsibility | Change |
|---|---|---|
| `src/domain/types.ts` | `Settings` gains `lastBackupAt?` | **Change** |
| `src/domain/calendar.ts` | Local dates, month keys | **Add** `formatLocalDateTime` |
| `src/domain/backup.ts` | Envelope, version gate, migration, validation, preview, filename | **New** |
| `src/data/db.ts` | Dexie schema v1 | Unchanged |
| `src/data/ledger.ts` | Backup reads/writes, seeding gate | **Extend** |
| `src/app/storage.ts` | Persistence status, one-time request, hook | **New** |
| `src/app/saveBackupFile.ts` | Picker / share / download adapter | **New** |
| `src/app/pwa.ts` | Service-worker registration only | **Narrow** |
| `src/app/router.ts` | Hash routes | **Extend** with `backup` |
| `src/app/App.tsx` | Route switch, zero-account gate, restore landing | **Extend** |
| `src/app/screens/BackupScreen.tsx` | Backup and restore screen | **New** |
| `src/app/screens/HomeScreen.tsx` | Backup action, storage warning | **Change** |
| `src/app/screens/AccountsScreen.tsx` | Restore link | **Change** |
| `src/main.tsx` | Boot wiring for the persistence request | **Change** |
| `src/styles.css` | Warning and preview styles | **Extend** |

Dependency direction is unchanged:

```text
app/ui  ->  data/ledger  ->  data/db
   |             |
   +---------->  domain/backup, domain/calendar, domain/types
```

- No UI module imports `data/db` or `dexie` directly.
- `domain/` imports only `domain/types` and other `domain/` modules.
- No repository interface, no fake adapter, no new dependency.

### 4.2 Endpoints

None. `Ledger` is the application API. Nothing in this slice touches the
network.

### 4.3 Test seams

The slice uses the three established seams and adds one adapter boundary:

1. **Domain pure functions** — `backup.ts`, `calendar.ts` unit tests.
2. **Ledger integration** — `createLedger` over a real `BudgetDatabase` on
   `fake-indexeddb`, a unique database per test.
3. **UI integration** — screens rendered with a real ledger.
4. **Browser adapters** — `saveBackupFile` and `storage` with stubbed browser
   globals; no real files, pickers, or permissions.

No test mocks `ledger` or Dexie internals.

## 5. Types and Constants

### 5.1 Settings

```ts
// src/domain/types.ts
export interface Settings {
  id: 'app';
  currency: string;
  currencyExponent: number;
  lastAccountId?: string;
  lastBackupAt?: string; // ISO instant; device state, never in a backup
}
```

`SCHEMA_VERSION` stays `1`. No store, key, index, or upgrade function changes.

### 5.2 `domain/backup`

```ts
export const BACKUP_FORMAT = 'budget-backup';
export const BACKUP_SCHEMA_VERSION = 1;

export interface BackupSettings {
  currency: string;
  currencyExponent: number;
}

export interface BackupData {
  accounts: Account[];
  categories: Category[];
  entries: Entry[];
  settings: BackupSettings;
}

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  schemaVersion: number;
  exportedAt: string; // ISO instant
  data: BackupData;
}

export interface BackupPreview {
  exportedAt: string;
  accountCount: number;
  entryCount: number;
}

export type BackupErrorCode = 'not-a-backup' | 'newer-version' | 'damaged';

export class BackupError extends Error {
  readonly name = 'BackupError';
  constructor(
    readonly code: BackupErrorCode,
    message: string,
  );
}

export function byCodeUnitId(
  left: { id: string },
  right: { id: string },
): number; // shared with data/ledger so snapshot and file ordering cannot diverge

export function createBackupFile(data: BackupData, exportedAt: Date): BackupFile;
export function serializeBackup(file: BackupFile): string;
export function parseBackupFile(text: string): BackupFile;
export function previewBackup(file: BackupFile): BackupPreview;
export function backupFileName(at: Date): string;
```

Developer-facing `BackupError` messages (never asserted in tests):

| Code | Message |
|---|---|
| `not-a-backup` | `This file is not a Budget backup.` |
| `newer-version` | `This backup was made by a newer version of Budget.` |
| `damaged` | `This backup is damaged.` |

### 5.3 Routes

```ts
export type Route =
  | { name: 'home'; month: MonthKey }
  | { name: 'add' }
  | { name: 'accounts' }
  | { name: 'backup' }
  | { name: 'category'; month: MonthKey; categoryId: string }
  | { name: 'entry'; entryId: string };
```

## 6. Backup File Contract

> **The one durable contract.** Confirm before build. Once v1 files exist,
> changing the envelope costs a compatibility reader.

### 6.1 Envelope

```json
{
  "format": "budget-backup",
  "schemaVersion": 1,
  "exportedAt": "2026-11-10T19:42:11.000Z",
  "data": {
    "accounts": [],
    "categories": [],
    "entries": [],
    "settings": { "currency": "CAD", "currencyExponent": 2 }
  }
}
```

- `format` identifies this app's file.
- `schemaVersion` is the **data-model** version, not the app or Dexie version.
- `exportedAt` is the instant the snapshot was read, ISO 8601 UTC.
- `data` holds ledger data only. `lastAccountId` and `lastBackupAt` never
  enter a file.

### 6.2 `createBackupFile(data, exportedAt)`

- Copies each array, sorts it by `id` using code-unit comparison
  (`left.id < right.id ? -1 : left.id > right.id ? 1 : 0`) — **not**
  `localeCompare`, so two runs produce byte-identical files.
- Copies `settings` as `{ currency, currencyExponent }` only.
- Sets `exportedAt` to `exportedAt.toISOString()` and `schemaVersion` to
  `BACKUP_SCHEMA_VERSION`.
- Performs no validation. The ledger produced the data.

### 6.3 `serializeBackup(file)`

`JSON.stringify(file, null, 2) + '\n'` — pretty-printed, trailing newline.

### 6.4 `backupFileName(at)`

`budget-backup-YYYY-MM-DD-HHmmss.json`, using **local** date parts
(`getFullYear`, `getMonth() + 1`, `getDate`, `getHours`, `getMinutes`,
`getSeconds`), each zero-padded to its width.

### 6.5 `parseBackupFile(text)`

The only reader. No Dexie, no DOM. Checks run in this order; the first failure
throws:

| Step | Failure | Code |
|---|---|---|
| 1 | `JSON.parse` throws | `not-a-backup` |
| 2 | Not a plain object, or `Array.isArray` | `not-a-backup` |
| 3 | `format !== BACKUP_FORMAT` | `not-a-backup` |
| 4 | `schemaVersion` not a positive safe integer | `damaged` |
| 5 | `schemaVersion > BACKUP_SCHEMA_VERSION` | `newer-version` |
| 6 | `exportedAt` not a string, or `Date.parse` is `NaN` | `damaged` |
| 7 | `data` not a plain object, or `accounts` / `categories` / `entries` not arrays, or `settings` not an object | `damaged` |
| 8 | A migration is missing for a lower version | `damaged` |
| 9 | Any row or settings field fails §6.6 | `damaged` |

A `schemaVersion` below `1` is not a positive safe integer, so step 4 makes
it `damaged`; the migration registry is empty today.

### 6.6 Validation and normalization

Validation runs **after** migration. Parsing rebuilds every row from its known
fields, so unknown extra fields are dropped, not stored.

- Account: non-empty string `id`, non-empty string `name`, `type` one of
  `checking | savings | credit`, string `createdAt`.
- Category: non-empty string `id`, non-empty string `name`, boolean
  `archived`.
- Entry: non-empty string `id`; `kind` one of
  `expense | income | transfer | opening`; `date` passes
  `isValidLocalDate`; `amountMinor` is a safe integer and is **strictly
  positive** for `expense`, `income`, and `transfer`, and **any safe integer**
  (including zero and negative) for `opening`; `accountId` is a non-empty
  string; `toAccountId` is required and non-empty for `transfer`; optional
  `categoryId` and `toAccountId` must be non-empty strings when present.
- Settings: non-empty string `currency`; non-negative safe integer
  `currencyExponent`.
- Missing `categoryId` / `toAccountId` are omitted from the rebuilt row, never
  set to `undefined`.

Deliberately not validated:

- **Referential integrity.** An entry whose account or category is missing
  restores; reads degrade to `Unknown account` / `Uncategorized`.
- **Duplicate ids.** `restoreBackup` uses `bulkAdd`; a duplicate aborts the
  transaction and the previous ledger survives.

### 6.7 Migrations

```ts
type BackupMigration = (data: unknown) => unknown;
const MIGRATIONS: Record<number, BackupMigration> = {};
```

Applied in ascending order from the file's `schemaVersion` to
`BACKUP_SCHEMA_VERSION - 1`, each to the previous step's output, before
validation. Empty today. The first data-model change ships its migration and a
fixture test.

### 6.8 `previewBackup(file)`

`{ exportedAt, accountCount: data.accounts.length, entryCount:
data.entries.length }`. Categories are counted but not shown; the scope asks
for accounts and entries.

### 6.9 Versioning rules

- Stored field added, removed, renamed, or changed meaning → bump
  `BACKUP_SCHEMA_VERSION`, add a migration, keep any Dexie upgrade.
- Only an index or store changes, same data shape → bump `SCHEMA_VERSION`
  only.
- New entry `kind` or account type → bump `BACKUP_SCHEMA_VERSION`.
- Same-schema backup from an older app build restores directly.

## 7. Calendar Contract

```ts
export function formatLocalDateTime(iso: string, locale?: string): string;
```

`new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' })
.format(new Date(iso))`. Invalid input throws the platform `RangeError`; every
caller passes a value already validated by `parseBackupFile` or written by
`markBackupSaved`.

## 8. Storage Contract

```ts
export type StorageStatus = 'persisted' | 'at-risk' | 'unknown';

export function readStorageStatus(): Promise<StorageStatus>;
export function requestPersistentStorage(): Promise<void>; // memoized
export function useStorageStatus(): StorageStatus | undefined;
```

- `readStorageStatus`: `navigator.storage?.persisted` absent → `'unknown'`;
  otherwise `await persisted()` → `'persisted'` / `'at-risk'`; any throw →
  `'unknown'`. Always a fresh read.
- `requestPersistentStorage`: module-level memoized promise around
  `navigator.storage?.persist?.()`; swallows rejection. Called by `boot` after
  render and by the hook, so mounting two screens prompts at most once.
- `useStorageStatus`: `undefined` until the first read resolves; awaits the
  memoized request, then reads; re-reads on `visibilitychange` while the
  document is visible; removes the listener on unmount.
- Status is never stored in Dexie.

`app/pwa.ts` keeps only `registerPwa`; `main.tsx` imports
`requestPersistentStorage` from `app/storage`.

## 9. Ledger Contract

### 9.1 API additions

```ts
export interface Ledger {
  // unchanged: initialize, listAccounts, addAccount, renameAccount,
  // listCategories, addExpense, updateExpense, deleteExpense, getEntry,
  // categoryEntries, monthSummary, getSettings

  readBackupData(): Promise<BackupData>;
  restoreBackup(data: BackupData): Promise<void>;
  markBackupSaved(at: string): Promise<void>;
}
```

### 9.2 `readBackupData()`

One `r` transaction over `accounts`, `categories`, `entries`, `settings`.

1. `settings.get('app')`; missing → `Error('Ledger not initialized')`.
2. Read all three tables; sort each by `id` with code-unit comparison.
3. Return `{ accounts, categories, entries, settings: { currency,
   currencyExponent } }`.

### 9.3 `markBackupSaved(at)`

One `rw` transaction on `settings`: `settings.update('app', { lastBackupAt:
at })`; zero rows → `Error('Ledger not initialized')`. Writes nothing else.

### 9.4 `restoreBackup(data)`

One `rw` transaction over all four tables:

1. Read the current settings row; remember `lastBackupAt`.
2. `clear()` accounts, categories, entries, settings.
3. `bulkAdd` the backup's accounts, categories, entries (not `bulkPut`).
4. `add` `{ id: 'app', currency, currencyExponent }`, plus the remembered
   `lastBackupAt` when present. `lastAccountId` is dropped.

No validation. Any throw rolls the transaction back; duplicate ids fail
`bulkAdd` and leave the previous ledger intact.

### 9.5 `initialize()` seeding gate

```ts
const settings = await db.settings.get('app');
if (!settings) {
  await db.settings.add({ id: 'app', currency: 'CAD', currencyExponent: 2 });
  for (const category of STARTER_CATEGORIES) {
    if (!(await db.categories.get(category.id))) {
      await db.categories.add(category);
    }
  }
}
```

Seeding happens only when the settings row is absent. A boot after a restore
never re-adds a category the restored ledger does not contain. Idempotency and
"never overwrite existing rows" are unchanged.

### 9.6 Concurrency

Live queries are notified after the transaction commits. `readBackupData`'s
single read transaction is a consistent snapshot; no write can land between
table reads.

## 10. Save Adapter Contract

```ts
export type SaveOutcome = 'saved' | 'cancelled' | 'unconfirmed';

export function saveBackupFile(file: File): Promise<SaveOutcome>;
```

Tries capabilities in order:

1. **File System Access** — `window.showSaveFilePicker` present:
   `showSaveFilePicker({ suggestedName: file.name, types: [{ description:
   'Budget backup', accept: { 'application/json': ['.json'] } }] })`, then
   `createWritable()`, `write(file)`, `close()` → `'saved'`.
   - `AbortError` → `'cancelled'`.
   - `NotAllowedError` or `SecurityError` → fall through.
   - Anything else → rethrow.
2. **Web Share** — `navigator.canShare?.({ files: [file] })` true and
   `navigator.share` present: `share({ files: [file], title: file.name })`
   → `'saved'`; `AbortError` → `'cancelled'`; any other failure → fall
   through.
3. **Anchor download** — create a blob URL, click a temporary
   `<a download={file.name}>`, remove it, revoke the URL on the next
   macrotask (`setTimeout(…, 0)`) → `'unconfirmed'`.

Error detection is by `error.name`, not `instanceof DOMException`, so stubbed
globals in tests behave like browsers.

`showSaveFilePicker`, `FileSystemFileHandle`, and
`FileSystemWritableFileStream` are not in the project's DOM lib; declare their
minimal shapes locally in `saveBackupFile.ts`. Do not add a dependency.

## 11. Routing Contract

### 11.1 Hash grammar

| Hash | Route |
|---|---|
| `#/backup` | `{ name: 'backup' }` |

`parseHash` returns the backup route for `path === '/backup'` before month
parsing; `routeToHash({ name: 'backup' })` returns `#/backup`. No query
parameters.

### 11.2 Zero-account gate and restore landing

`App` currently redirects to `#/accounts` whenever there are no accounts, in
both the redirect effect and the loading guard. Both now allow `'accounts'`
**and** `'backup'`.

A successful restore must land on home, not bounce back to accounts while the
live accounts query catches up:

- `App` passes `onRestored: (accountCount: number) => void` to the backup
  screen.
- `BackupScreen` calls it after a successful restore and then navigates:
  `accountCount > 0` → `{ name: 'home', month: monthOf(todayLocalDate()) }`
  with `replace: true`; `accountCount === 0` → `{ name: 'accounts' }` with
  `replace: true`.
- `App` keeps `pendingRestore` set when `accountCount > 0`, skips the
  zero-account redirect while it is set, and clears it once the live accounts
  query is non-empty.
- While `pendingRestore` is set, both the zero-account redirect and the
  loading guard are skipped, so the restored home renders from the committed
  ledger; the guard never flashes the accounts screen before the live
  accounts query catches up.

## 12. Call Stacks

### 12.1 Save backup

`Save backup` → busy guard → `readBackupData()` → `createBackupFile(data, now)`
→ `serializeBackup(file)` → `new File([text], backupFileName(now), { type:
'application/json' })` → `saveBackupFile(file)`:

| Outcome | Screen | Records `lastBackupAt` |
|---|---|---|
| `saved` | "Backup saved." | `markBackupSaved(now.toISOString())` |
| `cancelled` | "No file was saved." | no |
| `unconfirmed` | "Your browser has taken the file. It is a backup only if you saved it." | no |
| throws | "Couldn't make the backup. Try again." | no |

If `markBackupSaved` throws after a confirmed save: "The backup was saved, but
the app couldn't record when." The live settings query updates the displayed
time.

The ledger read happens before the picker/share call; both want transient user
activation.

### 12.2 Restore

`Choose file` → `file.text()` → `parseBackupFile(text)` → `previewBackup(file)`
→ inline preview. A `BackupError` shows the mapped message and writes nothing;
the input value is reset.

`Cancel` → clear preview, reset input, write nothing.

`Restore backup` → busy guard → `restoreBackup(preview.data)` →
`onRestored(data.accounts.length)` → navigate per §11.2. On throw: "Couldn't
restore the backup. Your ledger is unchanged."; keep the preview so the user
can retry or cancel; reset the input value after every attempt.

### 12.3 Storage status

`boot` → `requestPersistentStorage()` (fire-and-forget). `useStorageStatus`
mount → await the memoized request → `readStorageStatus()` → state.
`visibilitychange` while visible → fresh read.

## 13. UI Contract

### 13.1 Backup screen

`<h1>Backup</h1>`, one `<section>` per block, in this order.

**Last backup**

- Settings absent `lastBackupAt` → `<p>No backup yet.</p>`
- Present → `<p>Last backup <time dateTime={iso}>{formatLocalDateTime(iso)}</time></p>`

**Storage status**

| Status | Copy |
|---|---|
| `persisted` | "This phone has agreed to keep your ledger." |
| `at-risk` | "This phone may discard your ledger. A backup file is the only protection." |
| `unknown` | "This browser can't confirm it will keep your ledger. Keep a backup." |
| `undefined` | "Checking whether this phone will keep your ledger…" |

**Save backup**

- Button: "Save backup"; disabled while saving.
- Status line for each outcome from §12.1, `role="status"`.
- Failure line, `role="alert"`.

**Restore from backup**

- `<label htmlFor="backup-file">Restore from backup</label>`
  `<input id="backup-file" type="file" accept=".json,application/json" />`
- Preview block after a valid file:
  - `<h2>Restore this backup?</h2>`
  - `<p>This backup was made on <time dateTime={iso}>{formatLocalDateTime(iso)}</time>. It contains {n} account(s) and {m} entry/entries.</p>`
    (`1 account`, `2 accounts`; same rule for entries)
  - `<p>Restoring replaces everything currently in the app.</p>`
  - Buttons: "Restore backup" (confirm, disabled while restoring) and
    "Cancel".
- Error lines, `role="alert"`, mapped from `BackupError.code`:

| Code | Copy |
|---|---|
| `not-a-backup` | "That file isn't a Budget backup." |
| `newer-version` | "That backup was made by a newer version of Budget. Update the app and try again." |
| `damaged` | "That backup is damaged and can't be restored." |

- A write failure shows "Couldn't restore the backup. Your ledger is
  unchanged."

Preview and confirmation are inline; no modal, no route.

### 13.2 Home screen delta

- The bottom actions row gains `<button>Backup</button>` next to `Accounts`.
- When `useStorageStatus()` is `'at-risk'` or `'unknown'`, a persistent
  paragraph directly after the `<h1>`:
  - `'at-risk'`: "This phone may discard your ledger."
  - `'unknown'`: "This browser can't confirm it will keep your ledger."
  - Both end with a `<button>Back up now</button>` navigating to
    `{ name: 'backup' }`.
  - `undefined` and `'persisted'` render nothing. No `role="alert"`; this is a
    state, not an event.

### 13.3 Accounts screen delta

- A `Restore from backup` button navigating to `{ name: 'backup' }`, rendered
  whether or not accounts exist, in the bottom actions area.

### 13.4 Accessibility

- The file input has a visible `<label>`; all buttons are real `<button>`s.
- Status messages use `role="status"`; errors use `role="alert"`.
- The home warning is plain text plus a button; it is not an alert and is not
  dismissed.

### 13.5 Styling scope

Add `.storage-warning` (spacing and emphasis), `.backup-section` (block
spacing), and `.backup-preview` (bordered inline panel). Reuse `.actions`,
`.field`, `.hint`, `.form-error`, `.button-primary`.

## 14. Testing Decisions

### 14.1 `domain/backup` (no Dexie, no DOM)

- `createBackupFile` → `serializeBackup` → `parseBackupFile` round-trips all
  rows and the currency pair; arrays are sorted by `id`; settings carry only
  the currency pair.
- Two exports of the same data produce identical text; the text is
  pretty-printed with a trailing newline.
- `parseBackupFile` rejects: invalid JSON; a non-object; a wrong/missing
  `format`; a missing/non-integer `schemaVersion`; a higher
  `schemaVersion`; a bad `exportedAt`; a missing `data`; non-array tables; each
  malformed account, category, entry, and settings field — with the matching
  code.
- A same-schema file with unknown extra fields parses and the extra fields are
  absent from the result.
- `previewBackup` counts accounts and entries.
- `backupFileName` uses local date parts and the `budget-backup-` prefix.

### 14.2 Ledger (real `BudgetDatabase`, unique name per test)

- `readBackupData` returns every row, sorted by `id`, and only `currency` /
  `currencyExponent` from settings; before `initialize` it throws `Ledger not
  initialized`.
- `restoreBackup` replaces all three tables and the settings row; preserves
  `lastBackupAt`; drops `lastAccountId`.
- `restoreBackup` with duplicate entry ids throws and leaves the previous
  ledger byte-for-byte intact.
- `restoreBackup` accepts rows whose account or category is missing.
- `markBackupSaved` sets `lastBackupAt` and changes nothing else; before
  `initialize` it throws.
- After restoring a ledger with a reduced category set, `initialize` does not
  re-seed starter categories.
- Every existing slice-1/2 ledger test passes unchanged, including
  `initialize` idempotency.

### 14.3 Adapters (stubbed globals)

- `saveBackupFile`: picker close → `saved`; picker `AbortError` → `cancelled`;
  picker `NotAllowedError` → falls through; share resolve → `saved`; share
  `AbortError` → `cancelled`; no picker/share → anchor → `unconfirmed`, with
  the blob URL created and revoked.
- `readStorageStatus`: true → `persisted`; false → `at-risk`; missing or
  throwing API → `unknown`.
- `useStorageStatus`: `undefined` before the read resolves; `persisted` after;
  re-reads on `visibilitychange`.

### 14.4 Router

- `#/backup` parses to `{ name: 'backup' }`; the route serializes back to
  `#/backup`.

### 14.5 UI (RTL, real ledger on `fake-indexeddb`)

- Backup screen says no backup yet; a confirmed save records and displays a
  timestamp; cancelled and unconfirmed saves do not.
- Choose a valid file → preview shows its date, counts, and replacement
  warning; Cancel leaves the ledger unchanged; confirm replaces it and lands
  on home with the restored total.
- Invalid, damaged, and newer-version files show the mapped message and leave
  the ledger unchanged.
- First run: the accounts screen reaches `#/backup`, and the zero-account gate
  does not bounce it.
- A confirmed restore lands on home with the restored ledger, not on accounts;
  a restore with zero accounts lands on accounts.
- Home warns when `persisted()` is false or the API is missing, and not when
  true or still checking; the backup screen explains all three states.
- Existing tests pass unchanged; storage APIs are stubbed where a test needs a
  status.

### 14.6 Not tested

- Real save pickers, share sheets, and downloads (manual only).
- `Intl` output formatting beyond a year/non-empty assertion.
- Migration application (no migrations exist).

## 15. Open Questions Resolved

| Question | Resolution |
|---|---|
| File shape and versioning | Envelope `format` + `schemaVersion` + `exportedAt` + `data`; `schemaVersion` is the data-model version; lower migrates, higher is refused. |
| All-or-nothing restore | One `rw` transaction over four tables; `clear` then `bulkAdd`; rollback on any throw. |
| When a backup counts as saved | Picker `close()` or share resolve; anchor download is unconfirmed and records nothing. The file's `exportedAt` is recorded. |
| Where the last-backup time lives | `settings.lastBackupAt`; device state; preserved across restore; never in a file. |
| Storage status | `navigator.storage.persisted()` → persisted / at-risk / unknown; home warns on at-risk and unknown; backup screen explains all three. |
| First-run restore | `#/backup` allowed with zero accounts; accounts screen links to it; a restore with accounts lands on home. |
| Does `settings` gain a field, does Dexie bump | Yes to `lastBackupAt`, non-indexed; no bump; both version constants stay `1`. |
| Backup vs export | Backup and Restore are canonical; export/import describe the mechanism. |

## 16. Out of Scope

Automatic, scheduled, or background backups; reminders; multiple slots; cloud
accounts; sync; multi-device; merging; partial backups; CSV; encryption;
compression; checksums; an app-version field; undo after restore; backup
history; backing up device state; storage quota display; category management;
balances; income; transfers; last-month comparison.

## 17. Implementation Notes — Close-out 2026-11-10

Built as specified. The close-out audit found three implementation facts that
were not visible in the original plan and are recorded here:

- `domain/backup` also exports `byCodeUnitId`; `data/ledger` imports it so the
  snapshot and the file share one comparator (review fix `3023178`).
- `tsconfig.json` raises `lib` from `ES2022` to `ES2024` so tests can use
  `Promise.withResolvers`. No dependency, DOM type, schema, or store change.
- Review added explicit `role="status"` / `role="alert"` assertions and a
  `markBackupSaved`-failure UI test. Behaviour is unchanged.

No behavioural, interface, storage, navigation, or copy drift remains.
