import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { AccountType, Settings } from '../../domain/types';
import { monthOf, todayLocalDate } from '../../domain/calendar';
import { formatAmount } from '../../domain/money';
import type {
  AccountBalanceListItem,
  Ledger,
  LedgerErrorCode,
} from '../../data/ledger';
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

function balanceText(
  row: AccountBalanceListItem,
  settings: Settings,
): string {
  const formatted = (amountMinor: number) =>
    formatAmount(
      amountMinor,
      settings.currency,
      settings.currencyExponent,
    );

  if (row.type === 'credit') {
    if (row.balanceMinor < 0) {
      return `${formatted(-row.balanceMinor)} owed`;
    }
    if (row.balanceMinor === 0) {
      return `${formatted(0)} owed`;
    }
    return `${formatted(row.balanceMinor)} in credit`;
  }

  if (row.balanceMinor < 0) {
    return `${formatted(row.balanceMinor)} overdrawn`;
  }
  return formatted(row.balanceMinor);
}

type RowEditor =
  | {
      kind: 'rename';
      accountId: string;
      accountName: string;
      draft: string;
    }
  | {
      kind: 'opening';
      accountId: string;
      draft: string;
    };

export function AccountsScreen({ ledger }: { ledger: Ledger }) {
  const balances = useLiveQuery(
    () => ledger.listAccountBalances(),
    [ledger],
  );
  const settings = useLiveQuery(() => ledger.getSettings(), [ledger]);
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('checking');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const [rowEditor, setRowEditor] = useState<RowEditor | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [rowBusy, setRowBusy] = useState(false);
  const rowBusyRef = useRef(false);

  if (balances === undefined || settings === undefined) {
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
    setRowEditor({
      kind: 'rename',
      accountId: id,
      accountName: currentName,
      draft: currentName,
    });
    setRowError(null);
  }

  function cancelRowEditor() {
    setRowEditor(null);
    setRowError(null);
  }

  async function saveRename(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (rowEditor?.kind !== 'rename' || rowBusyRef.current) {
      return;
    }
    const accountId = rowEditor.accountId;
    const draft = rowEditor.draft;
    rowBusyRef.current = true;
    setRowBusy(true);
    setRowError(null);
    try {
      await ledger.renameAccount(accountId, draft);
      setRowEditor(null);
    } catch (error) {
      if (error instanceof LedgerError) {
        setRowError(accountErrorMessage(error.code));
      } else {
        setRowError('Could not save the account. Try again.');
      }
    } finally {
      rowBusyRef.current = false;
      setRowBusy(false);
    }
  }

  return (
    <section>
      <h1>Accounts</h1>

      {balances.length === 0 ? (
        <p className="hint">
          Add the accounts you spend from. You can start without a balance.
        </p>
      ) : null}

      {rowError ? (
        <p role="alert" className="form-error">
          {rowError}
        </p>
      ) : null}

      {rowEditor?.kind === 'rename' &&
      !balances.some((account) => account.id === rowEditor.accountId) ? (
        <form
          onSubmit={saveRename}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !rowBusy) {
              cancelRowEditor();
            }
          }}
        >
          <div className="field">
            <label htmlFor="stale-rename">Rename {rowEditor.accountName}</label>
            <input
              id="stale-rename"
              value={rowEditor.draft}
              maxLength={60}
              onChange={(event) => {
                const draft = event.target.value;
                setRowEditor((current) =>
                  current?.kind === 'rename'
                    ? { ...current, draft }
                    : current,
                );
                setRowError(null);
              }}
            />
          </div>
          <div className="actions">
            <button type="submit" disabled={rowBusy}>
              Save
            </button>
            <button type="button" onClick={cancelRowEditor}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <ul className="account-list">
        {balances.map((row) => (
          <li key={row.id}>
            {rowEditor?.kind === 'rename' &&
            rowEditor.accountId === row.id ? (
              <form
                onSubmit={saveRename}
                onKeyDown={(event) => {
                  if (event.key === 'Escape' && !rowBusy) {
                    cancelRowEditor();
                  }
                }}
              >
                <input
                  aria-label={`Rename ${row.name}`}
                  value={rowEditor.draft}
                  maxLength={60}
                  onChange={(event) => {
                    const draft = event.target.value;
                    setRowEditor((current) =>
                      current?.kind === 'rename'
                        ? { ...current, draft }
                        : current,
                    );
                    setRowError(null);
                  }}
                />
                <div className="actions">
                  <button type="submit" disabled={rowBusy}>
                    Save
                  </button>
                  <button type="button" onClick={cancelRowEditor}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <span className="account-name">{row.name}</span>
                <span className="account-type">
                  {ACCOUNT_TYPE_LABELS[row.type]}
                </span>
                <span className="account-balance">
                  {balanceText(row, settings)}
                </span>
                <button
                  type="button"
                  onClick={() => startRename(row.id, row.name)}
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

      {balances.length > 0 ? (
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
