import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { AccountType } from '../../domain/types';
import { monthOf, todayLocalDate } from '../../domain/calendar';
import type { Ledger, LedgerErrorCode } from '../../data/ledger';
import { LedgerError } from '../../data/ledger';
import { ACCOUNT_TYPE_LABELS } from '../labels';
import { navigate } from '../router';

function accountErrorMessage(code: LedgerErrorCode): string {
  switch (code) {
    case 'invalid-name':
      return 'Enter an account name of 60 characters or fewer.';
    case 'invalid-account-type':
      return 'Choose a valid account type.';
    case 'unknown-account':
      return 'That account no longer exists.';
    default:
      return 'Could not save the account. Try again.';
  }
}

export function AccountsScreen({ ledger }: { ledger: Ledger }) {
  const accounts = useLiveQuery(() => ledger.listAccounts(), [ledger]);
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('checking');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [draftName, setDraftName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const renamingRef = useRef(false);

  if (accounts === undefined) {
    return <p>Loading…</p>;
  }

  async function addAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyRef.current) {
      return;
    }
    busyRef.current = true;
    setSubmitting(true);
    setFormError(null);
    try {
      await ledger.addAccount({ name, type });
      setName('');
      setType('checking');
    } catch (error) {
      if (error instanceof LedgerError) {
        setFormError(accountErrorMessage(error.code));
      } else {
        setFormError('Could not save the account. Try again.');
      }
    } finally {
      busyRef.current = false;
      setSubmitting(false);
    }
  }

  function startRename(id: string, currentName: string) {
    setEditingId(id);
    setEditingName(currentName);
    setDraftName(currentName);
    setRenameError(null);
  }

  function cancelRename() {
    setEditingId(null);
    setRenameError(null);
  }

  async function saveRename(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editingId === null || renamingRef.current) {
      return;
    }
    renamingRef.current = true;
    setRenaming(true);
    setRenameError(null);
    try {
      await ledger.renameAccount(editingId, draftName);
      setEditingId(null);
    } catch (error) {
      if (error instanceof LedgerError) {
        setRenameError(accountErrorMessage(error.code));
      } else {
        setRenameError('Could not save the account. Try again.');
      }
    } finally {
      renamingRef.current = false;
      setRenaming(false);
    }
  }

  return (
    <section>
      <h1>Accounts</h1>

      {accounts.length === 0 ? (
        <p className="hint">
          Add the accounts you spend from. You can start without a balance.
        </p>
      ) : null}

      {renameError ? (
        <p role="alert" className="form-error">
          {renameError}
        </p>
      ) : null}

      {editingId !== null &&
      !accounts.some((account) => account.id === editingId) ? (
        <form
          onSubmit={saveRename}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              cancelRename();
            }
          }}
        >
          <div className="field">
            <label htmlFor="stale-rename">Rename {editingName}</label>
            <input
              id="stale-rename"
              value={draftName}
              maxLength={60}
              onChange={(event) => {
                setDraftName(event.target.value);
                setRenameError(null);
              }}
            />
          </div>
          <div className="actions">
            <button type="submit" disabled={renaming}>
              Save
            </button>
            <button type="button" onClick={cancelRename}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <ul className="account-list">
        {accounts.map((account) => (
          <li key={account.id}>
            {editingId === account.id ? (
              <form
                onSubmit={saveRename}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    cancelRename();
                  }
                }}
              >
                <input
                  aria-label={`Rename ${account.name}`}
                  value={draftName}
                  maxLength={60}
                  onChange={(event) => {
                    setDraftName(event.target.value);
                    setRenameError(null);
                  }}
                />
                <div className="actions">
                  <button type="submit" disabled={renaming}>
                    Save
                  </button>
                  <button type="button" onClick={cancelRename}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <span className="account-name">{account.name}</span>
                <span className="account-type">
                  {ACCOUNT_TYPE_LABELS[account.type]}
                </span>
                <button
                  type="button"
                  onClick={() => startRename(account.id, account.name)}
                >
                  Rename
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={addAccount}>
        <div className="field">
          <label htmlFor="account-name">Account name</label>
          <input
            id="account-name"
            value={name}
            maxLength={60}
            onChange={(event) => {
              setName(event.target.value);
              setFormError(null);
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="account-type">Account type</label>
          <select
            id="account-type"
            value={type}
            onChange={(event) => setType(event.target.value as AccountType)}
          >
            <option value="checking">Checking</option>
            <option value="savings">Savings</option>
            <option value="credit">Credit card</option>
          </select>
        </div>
        {formError ? (
          <p role="alert" className="form-error">
            {formError}
          </p>
        ) : null}
        <button type="submit" className="button-primary" disabled={submitting}>
          Add account
        </button>
      </form>

      {accounts.length > 0 ? (
        <div className="actions">
          <button
            type="button"
            className="button-primary"
            onClick={() =>
              navigate({
                name: 'home',
                month: monthOf(todayLocalDate()),
              })
            }
          >
            Start logging
          </button>
        </div>
      ) : null}

      <div className="actions">
        <button type="button" onClick={() => navigate({ name: 'backup' })}>
          Restore from backup
        </button>
      </div>
    </section>
  );
}
