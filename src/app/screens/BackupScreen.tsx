import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { formatLocalDateTime } from '../../domain/calendar';
import { backupFileName, createBackupFile, serializeBackup } from '../../domain/backup';
import type { Ledger } from '../../data/ledger';
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

const SAVE_COPY: Record<SaveOutcome, string> = {
  saved: 'Backup saved.',
  cancelled: 'No file was saved.',
  unconfirmed:
    'Your browser has taken the file. It is a backup only if you saved it.',
};

export function BackupScreen({ ledger }: { ledger: Ledger }) {
  const settings = useLiveQuery(() => ledger.getSettings(), [ledger]);
  const storageStatus = useStorageStatus();
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

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
    </section>
  );
}
