# Slice 3 — Keep a backup

## Why this slice

The ledger now holds a history the user can trust and correct, but it lives in
one place on one phone. If the phone is lost, reset, or its browser clears the
data, every account, category, and entry is gone. The vision calls the backup
file the only backup, and the app has been collecting real history since it was
deployed. This slice makes the ledger safe to keep using: the user can take a
copy, put it back, and see whether the phone is likely to keep the data.

## The core moment

The user has been logging for a few weeks. They open the app, tap Backup, and
the phone offers to save a file. They put it in their cloud drive. The app now
says the last backup was made today and that the phone has agreed to keep the
ledger. A month later they replace the phone, install the app, choose Restore,
pick that file, confirm, and their accounts, categories, and entries are back —
with the same totals as before.

## What the user can do

### Make a backup

The home screen has a Backup action. Tapping it prepares one file that holds
the whole ledger: every account, every category, every entry, and the app's
one-currency setting.

The phone's usual save or share screen lets the user put the file somewhere
other than the app — the phone's files, a cloud drive, or send it to
themselves. Making a backup does not need a connection. The file is named so
the user can tell when it was made.

When the user saves the file, the app records that a backup was made. The app
does not claim a backup succeeded when no file was saved.

### See when the last backup was made

The backup screen shows the date and time of the most recent backup, or says
plainly that no backup has been made yet. The time shown is the time of the
backup, not the time the screen was opened.

### Restore a backup

The user can choose a backup file from the phone. Before anything changes, the
app shows when the file was made and what it contains — how many accounts and
entries it holds — and says plainly that restoring replaces everything
currently in the app.

Cancelling leaves the current ledger exactly as it was. Confirming replaces the
current ledger with the backup's accounts, categories, entries, and currency
setting. The home screen then shows the restored ledger for the current month.

A restore is all-or-nothing: either the backup is restored completely or the
current ledger is unchanged. A file that is not a backup from this app, a
damaged backup, or a backup made by a newer version of the app is refused with
a plain message, and the current ledger is untouched. A backup made by an
earlier version of the app can still be restored; the app brings it up to date
as part of restoring.

Restore is available on a phone with no ledger yet, so a replacement phone can
be set up from a backup instead of starting over.

### Know whether the phone might discard the data

The app says plainly whether the phone has agreed to keep the ledger, or might
discard it. When the phone might discard it, the home screen shows a warning,
and the backup screen explains that a backup file is the only protection. This
status is shown without the user having to ask for it.

## What is deliberately not in this slice

- **No automatic, scheduled, or background backups.** The user makes each
  backup.
- **No cloud account, sync, or server copy.** The file goes wherever the phone
  can save it.
- **No partial backups.** Not one account, one category, one month, or a date
  range.
- **No merging a backup into the current ledger.** Restoring replaces.
- **No spreadsheet or CSV export.** The backup file is for this app to
  restore.
- **No encryption or password on the backup file.**
- **No reminder schedule or nagging.** The last-backup time and the storage
  warning are the signals.
- **No multi-device use.** A backup can set up a replacement phone; it is not
  a second live copy.
- **No undo after a restore.** The confirmation is the safeguard.
- **No bank sync, budgets, multi-currency, sharing, or laptop view.** These are
  outside the product vision.

## How we'll know it works

- From the home screen, the user can make a backup and save it somewhere
  outside the app.
- The backup contains every account, category, entry, and the currency
  setting; restoring it on a phone with no ledger reproduces the same
  accounts, entries, and month totals.
- After a backup, the app shows the date and time it was made; before any
  backup, it says none has been made.
- The app states whether the phone has agreed to keep the ledger or might
  discard it; when at risk, the warning is visible from the home screen.
- Choosing a backup shows when it was made and how many accounts and entries
  it holds, and warns that the current ledger will be replaced.
- Cancelling a restore changes nothing.
- Confirming a restore replaces the ledger and shows the restored home screen
  for the current month.
- A file that is not a backup, a damaged backup, or a backup from a newer
  version is refused with a plain message, and the current ledger is
  unchanged.
- A backup from an earlier version restores and is brought up to date.
- A failed restore leaves the current ledger exactly as it was.
- Making and restoring a backup work without a connection.
- After a restore, adding, correcting, and removing entries work as before.
- Restoring on a phone with no accounts is possible without first creating an
  account.
