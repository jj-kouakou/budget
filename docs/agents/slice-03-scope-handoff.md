# Handoff — Slice 03 Scope

## Gate
Slice scoping (workflow step 3) for slice 3 — complete.

## Artifacts
- `docs/product/slices/slice-03-scope.md` — new, user-facing scope only.
- `docs/product/backlog.md` — slice 3 moved to `In progress`; the order
  rationale records the post-slice-2 priority re-check.

## Priority check (wayfinder)

**Destination:** the user can use the app as their only ledger — log in
seconds, see this month by category, trust the number, and keep the ledger
safe.

**Next slice on the backlog:** 3 — Keep a backup.

**Confirmed as still the smallest path to real user value. No priority shift,
so no wait was needed.** Evidence:

- The destination's "keep the ledger safe" clause is the only one still
  unmet. Slice 2 closed "trust the number"; slices 1–2 delivered the logging
  and headline loop.
- The vision is explicit that the exported file is the only backup, because
  the ledger lives in one browser on one phone. The app has been deployed and
  accumulating real history since 2026-11-02, so loss risk is now concrete.
- Slice 1 explicitly deferred the storage warning to backup. Slice 2's
  close-out recorded that no schema migration exists yet and that slice 3
  pairs the first upgrade with the backup version. Both point at this slice.
- Last-month comparison (slice 5) is still premature: the app was first
  deployed on 2026-11-02, so as of 2026-11-10 there is no full prior month to
  compare. It becomes meaningful only after a full month has accrued.
- Category management (slice 4) has a usable starter list and, since slice 2,
  a correction path. No prior-slice evidence shows category fit is blocking
  logging. Loss is irreversible; category fit is adjustable.
- Income, balances, and transfers are supporting context by the vision's own
  wording and depend on the ledger already being safe to keep.

## Scope decisions made

- **Backup is one whole-ledger file** containing every account, category,
  entry, and the one-currency setting. No partial backups.
- **The backup leaves the app through the phone's usual save or share flow**,
  so it can be stored off-device. The app does not claim success when no file
  was saved.
- **The last-backup date and time are shown on the backup screen**, with an
  explicit "no backup yet" state.
- **Restore replaces, never merges.** The app shows the file's date and
  contents before changing anything, and cancelling leaves the ledger
  untouched.
- **Restore is all-or-nothing.** Invalid, damaged, or newer-version files are
  refused with the current ledger unchanged; older-version backups restore
  and are brought up to date.
- **Restore works on a phone with no ledger**, so a replacement phone can be
  set up from a backup.
- **Storage status is visible without asking.** When the phone might discard
  the data, the home screen warns and the backup screen explains that a
  backup file is the only protection.
- **Manual backups only.** No scheduling, background copying, cloud account,
  sync, encryption, CSV export, reminders, or multi-device use.
- **No undo after restore.** The confirmation is the safeguard.

## Deliberately out of this slice

- Automatic, scheduled, or background backups.
- Cloud account, sync, or server copy; partial backups; merging.
- Spreadsheet/CSV export; encryption or password protection.
- Reminder schedules; multi-device use; undo after restore.
- Bank sync, budgets, multi-currency, sharing, laptop view (product-wide out
  of scope).

## Next gate
Slice 3 Architecture — read, in order:

1. `docs/architecture/north-star.md`
2. `docs/architecture/slices/slice-02-architecture.md`
3. `docs/product/slices/slice-03-scope.md`

## Open questions for architecture

- What the backup file contains beyond the scope's user-visible list, and how
  its version is recorded so newer files are refused and older ones upgraded.
- How restore achieves all-or-nothing replacement, including failure partway
  through.
- How the app learns that a backup file was actually saved through the
  phone's save/share flow, and what timestamp "last backup" records.
- Where the last-backup timestamp lives so it is not lost by the restore it
  describes, and how it behaves after restoring an older backup.
- How the phone's keep-or-discard status is read and surfaced on both the
  home and backup screens, including the not-yet-known state.
- How restore is reached on first run before any account exists.
- Whether `settings` gains a backup timestamp and whether the first schema
  upgrade ships in this slice, paired with the backup version.
- Vocabulary: settle "backup" vs "export" and add both to `CONTEXT.md` if the
  architecture gate confirms them.
