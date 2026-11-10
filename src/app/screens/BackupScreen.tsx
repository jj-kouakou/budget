import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  formatLocalDateTime,
  monthOf,
  todayLocalDate,
} from '../../domain/calendar';
import {
  BackupError,
  backupFileName,
  createBackupFile,
  parseBackupFile,
  previewBackup,
  serializeBackup,
} from '../../domain/backup';
import type { BackupErrorCode, BackupFile } from '../../domain/backup';
import type { Ledger } from '../../data/ledger';
import { navigate } from '../router';
import { saveBackupFile } from '../saveBackupFile';
import type { SaveOutcome } from '../saveBackupFile';
import { useStorageStatus } from '../storage';
import type { StorageStatus } from '../storage';

const STORAGE_COPY: Record<StorageStatus, string> = {
  persisted: 'This phone has agreed to keep your ledger.',
  'at-risk':
    'This phone may discard your ledger. A backup file is the only protection.',
  unknown:
    "This browser can't confirm it will keep your ledger. Keep a backup.",
};

const RESTORE_ERROR_COPY: Record<BackupErrorCode, string> = {
  'not-a-backup': "That file isn't a Budget backup.",
  'newer-version':
    'That backup was made by a newer version of Budget. Update the app and try again.',
  damaged: "That backup is damaged and can't be restored.",
};

const SAVE_COPY: Record<SaveOutcome, string> = {
  saved: 'Backup saved.',
  cancelled: 'No file was saved.',
  unconfirmed:
    'Your browser has taken the file. It is a backup only if you saved it.',
};

export function BackupScreen({
  ledger,
  onRestored,
}: {
  ledger: Ledger;
  onRestored: (accountCount: number) => void;
}) {
  const settings = useLiveQuery(() => ledger.getSettings(), [ledger]);
  const storageStatus = useStorageStatus();
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [parsed, setParsed] = useState<BackupFile | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const restoringRef = useRef(false);

  if (settings === undefined) {
    return <p>Loading…</p>;
  }

  async function saveBackup(): Promise<void> {
    if (savingRef.current) {
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setSaveStatus(null);
    setSaveError(null);

    try {
      const now = new Date();
      const data = await ledger.readBackupData();
      const file = createBackupFile(data, now);
      const text = serializeBackup(file);
      const blob = new File([text], backupFileName(now), {
        type: 'application/json',
      });
      const outcome = await saveBackupFile(blob);
      setSaveStatus(SAVE_COPY[outcome]);

      if (outcome === 'saved') {
        try {
          await ledger.markBackupSaved(now.toISOString());
        } catch {
          setSaveError(
            "The backup was saved, but the app couldn't record when.",
          );
        }
      }
    } catch {
      setSaveError("Couldn't make the backup. Try again.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function chooseFile(
    event: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    try {
      const next = parseBackupFile(await file.text());
      setParsed(next);
      setRestoreError(null);
    } catch (error) {
      setParsed(null);
      setRestoreError(
        error instanceof BackupError
          ? RESTORE_ERROR_COPY[error.code]
          : RESTORE_ERROR_COPY.damaged,
      );
    } finally {
      input.value = '';
    }
  }

  function cancelRestore(): void {
    setParsed(null);
    setRestoreError(null);
  }

  async function confirmRestore(): Promise<void> {
    if (parsed === null || restoringRef.current) {
      return;
    }
    restoringRef.current = true;
    setRestoring(true);
    setRestoreError(null);

    try {
      await ledger.restoreBackup(parsed.data);
      const accountCount = parsed.data.accounts.length;
      onRestored(accountCount);
      if (accountCount > 0) {
        navigate(
          { name: 'home', month: monthOf(todayLocalDate()) },
          { replace: true },
        );
      } else {
        navigate({ name: 'accounts' }, { replace: true });
      }
    } catch {
      setRestoreError(
        "Couldn't restore the backup. Your ledger is unchanged.",
      );
    } finally {
      restoringRef.current = false;
      setRestoring(false);
    }
  }

  const preview = parsed === null ? null : previewBackup(parsed);

  return (
    <section>
      <h1>Backup</h1>

      <section className="backup-section">
        <h2>Last backup</h2>
        {settings.lastBackupAt === undefined ? (
          <p>No backup yet.</p>
        ) : (
          <p>
            Last backup{' '}
            <time dateTime={settings.lastBackupAt}>
              {formatLocalDateTime(settings.lastBackupAt)}
            </time>
          </p>
        )}
      </section>

      <section className="backup-section">
        <h2>Storage</h2>
        <p>
          {storageStatus === undefined
            ? 'Checking whether this phone will keep your ledger…'
            : STORAGE_COPY[storageStatus]}
        </p>
      </section>

      <section className="backup-section">
        <h2>Save backup</h2>
        <div className="actions">
          <button
            type="button"
            className="button-primary"
            disabled={saving}
            onClick={() => void saveBackup()}
          >
            Save backup
          </button>
        </div>
        {saveStatus !== null ? <p role="status">{saveStatus}</p> : null}
        {saveError !== null ? <p role="alert">{saveError}</p> : null}
      </section>

      <section className="backup-section">
        <h2>Restore from backup</h2>
        <div className="field">
          <label htmlFor="backup-file">Restore from backup</label>
          <input
            id="backup-file"
            type="file"
            accept=".json,application/json"
            onChange={(event) => void chooseFile(event)}
          />
        </div>
        {restoreError !== null && preview === null ? (
          <p role="alert">{restoreError}</p>
        ) : null}

        {preview !== null ? (
          <div className="backup-preview">
            <h2>Restore this backup?</h2>
            <p>
              This backup was made on{' '}
              <time dateTime={preview.exportedAt}>
                {formatLocalDateTime(preview.exportedAt)}
              </time>
              . It contains {preview.accountCount}{' '}
              {preview.accountCount === 1 ? 'account' : 'accounts'} and{' '}
              {preview.entryCount}{' '}
              {preview.entryCount === 1 ? 'entry' : 'entries'}.
            </p>
            <p>Restoring replaces everything currently in the app.</p>
            <div className="actions">
              <button
                type="button"
                className="button-primary"
                disabled={restoring}
                onClick={() => void confirmRestore()}
              >
                Restore backup
              </button>
              <button type="button" onClick={cancelRestore}>
                Cancel
              </button>
            </div>
            {restoreError !== null ? (
              <p role="alert">{restoreError}</p>
            ) : null}
          </div>
        ) : null}
      </section>
    </section>
  );
}
