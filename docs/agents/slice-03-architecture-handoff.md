# Handoff — Slice 03 Architecture

## Gate
Slice Architecture (workflow step 4) for slice 3 — complete.

## Artifacts
- `docs/architecture/slices/slice-03-architecture.md` — new.
- `CONTEXT.md` — `Backup`, `Restore`, `Last backup`, and `Persisted storage`
  added; "export/import" recorded as mechanism language, not a second feature.

## Decisions recorded
- **No endpoints, no new table, no new index, no Dexie version bump.**
  `SCHEMA_VERSION` stays `1`. `settings` gains the optional, non-indexed
  `lastBackupAt`.
- **Backup file:** `format` + `schemaVersion` + `exportedAt` + `data`.
  `data` holds all accounts, categories, entries, and only the currency pair.
  Device state (`lastBackupAt`, `lastAccountId`) never enters the file.
  Arrays are sorted by `id`; the file is pretty-printed; the filename is
  `budget-backup-YYYY-MM-DD-HHmmss.json`.
- **Versioning:** `BACKUP_SCHEMA_VERSION` is the data-model version, separate
  from the Dexie store version and from the app version. Same-schema backups
  from older app builds restore directly; lower versions migrate through an
  ordered registry; higher versions are refused. The registry is empty today.
- **Three `Ledger` operations:** `readBackupData()` (one `r` transaction),
  `restoreBackup(data)` (one `rw` transaction over all four tables), and
  `markBackupSaved(at)`.
- **Restore is all-or-nothing:** `clear` + `bulkAdd` inside one Dexie
  transaction; any throw rolls back. Duplicate ids abort the write, which is
  the atomicity proof. No pre-check for duplicates.
- **Restore replaces ledger data only:** preserves `lastBackupAt`, drops
  `lastAccountId`; missing account/category references are tolerated and
  degrade on read, as in slice 2.
- **Save confirmation:** File System Access `close()` or Web Share resolve =
  saved; anchor download = unconfirmed and records no timestamp. Only a
  confirmed save writes `lastBackupAt`, using the file's `exportedAt`.
- **Storage status:** `navigator.storage.persisted()` → `persisted` /
  `at-risk` / `unknown`; the home screen warns on `at-risk` / `unknown`; the
  backup screen explains all three. Status is never stored in Dexie.
- **First-run restore:** `#/backup` is allowed with zero accounts; the
  accounts screen links to it; a successful restore lands on home without the
  empty-ledger gate bouncing it.
- **`initialize` seeding gate:** starter categories seed only when the
  settings row is absent, so a boot after restore cannot re-add a category
  the restored ledger does not contain.
- **Vocabulary:** Backup and Restore are canonical; "export/import" describes
  the mechanism.

## Flag raised
**The backup file is the one durable contract in this slice.** North-star
deliberately left its shape open for this slice, so it is decided in the
architecture doc — but the envelope, the meaning of `schemaVersion`, and the
ledger/device-state split should be confirmed before build. Once v1 files
exist, changing them costs a compatibility reader. Everything else in the
slice is reversible at slice cost.

## Next gate
Slice Program Design (`to-spec`), then ticket breakdown. Read, in order:

1. `docs/architecture/north-star.md`
2. `docs/architecture/slices/slice-03-architecture.md`
3. `docs/product/slices/slice-03-scope.md`

## Suggested skills
- `to-spec` for the program design doc.
- `prototype` only if the save/share capability ladder or the restore
  preview/confirm state needs a sanity check.
- `domain-modeling` only if a term shifts; `codebase-design` for the
  `domain/backup` interface and the `Ledger` additions.

## Repo state
- Docs-only gate. No `src/` changes, no tests run, no build.
- `SCHEMA_VERSION` is still `1`; slice 3 is the first schema-aware feature but
  ships no upgrade.

## Open items
- Confirm the flagged file contract before build.
- The slice spec must decide the exact screen layout and copy; architecture
  fixes only the states, seams, and destinations.
- Do not add scheduled/automatic backups, cloud/sync, merging, partial
  backups, CSV, encryption, reminders, undo after restore, category
  management, balances, income, or transfers.
