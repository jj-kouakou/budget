import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { AccountType, Settings } from '../../domain/types';
import { monthOf, todayLocalDate } from '../../domain/calendar';
import {
  formatAmount,
  formatAmountInput,
  parseSignedAmount,
} from '../../domain/money';
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
    case 'invalid-opening-amount':
      return 'Enter a valid starting amount.';
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

function ledgerSignedAmount(
  type: AccountType,
  presented: number,
): number {
  const value = type === 'credit' ? -presented : presented;
  return value === 0 ? 0 : value;
}

function presentedAmount(
  type: AccountType,
  ledgerSigned: number,
): number {
  const value = type === 'credit' ? -ledgerSigned : ledgerSigned;
  return value === 0 ? 0 : value;
}

function openingHint(type: AccountType): string {
  return type === 'credit'
    ? 'What the card owed before you started logging. Use a minus if it was in credit.'
    : 'What the account held before you started logging. Use a minus if it was overdrawn.';
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
  const [openingText, setOpeningText] = useState('');
  const [openingError, setOpeningError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const [rowEditor, setRowEditor] = useState<RowEditor | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [rowBusy, setRowBusy] = useState(false);
  const rowBusyRef = useRef(false);

  useEffect(() => {
    if (
      rowBusy ||
      rowEditor?.kind !== 'opening' ||
      balances === undefined
    ) {
      return;
    }
    if (!balances.some((row) => row.id === rowEditor.accountId)) {
      setRowEditor(null);
    }
  }, [balances, rowBusy, rowEditor]);

  if (balances === undefined || settings === undefined) {
    return <p>Loading…</p>;
  }

  const currencyExponent = settings.currencyExponent;

  async function addAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyRef.current) {
      return;
    }
    setFormError(null);
    setOpeningError(null);

    let openingBalanceMinor: number | undefined;
    if (openingText.trim() !== '') {
      const parsed = parseSignedAmount(openingText, currencyExponent);
      if (parsed === null) {
        setOpeningError('Enter a valid starting amount.');
        return;
      }
      openingBalanceMinor = ledgerSignedAmount(type, parsed);
    }

    busyRef.current = true;
    setSubmitting(true);
    try {
      await ledger.addAccount(
        openingBalanceMinor === undefined
          ? { name, type }
          : { name, type, openingBalanceMinor },
      );
      setName('');
      setType('checking');
      setOpeningText('');
    } catch (error) {
      if (error instanceof LedgerError) {
        if (error.code === 'invalid-opening-amount') {
          setOpeningError(accountErrorMessage(error.code));
        } else {
          setFormError(accountErrorMessage(error.code));
        }
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

  function startOpening(row: AccountBalanceListItem) {
    setRowEditor({
      kind: 'opening',
      accountId: row.id,
      draft: formatAmountInput(
        presentedAmount(row.type, row.openingBalanceMinor),
        currencyExponent,
      ),
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

  async function saveOpening(
    event: React.FormEvent<HTMLFormElement>,
    row: AccountBalanceListItem,
  ) {
    event.preventDefault();
    if (rowEditor?.kind !== 'opening' || rowBusyRef.current) {
      return;
    }
    if (rowEditor.draft.trim() === '') {
      setRowError(
        row.hasOpeningBalance
          ? 'Enter a starting amount, or clear it.'
          : 'Enter a starting amount.',
      );
      return;
    }

    const parsed = parseSignedAmount(
      rowEditor.draft,
      currencyExponent,
    );
    if (parsed === null) {
      setRowError('Enter a valid starting amount.');
      return;
    }

    rowBusyRef.current = true;
    setRowBusy(true);
    setRowError(null);
    try {
      await ledger.setOpeningBalance(
        row.id,
        ledgerSignedAmount(row.type, parsed),
      );
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

  async function clearOpening(row: AccountBalanceListItem) {
    if (rowEditor?.kind !== 'opening' || rowBusyRef.current) {
      return;
    }
    rowBusyRef.current = true;
    setRowBusy(true);
    setRowError(null);
    try {
      await ledger.setOpeningBalance(row.id, null);
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
          Add the accounts you spend from. You can set a starting point now or
          later.
        </p>
      ) : null}

      {rowError ? (
        <p id="row-error" role="alert" className="form-error">
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
            {rowEditor?.kind === 'opening' &&
            rowEditor.accountId === row.id ? (
              <form
                onSubmit={(event) => saveOpening(event, row)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape' && !rowBusy) {
                    cancelRowEditor();
                  }
                }}
              >
                <div className="field">
                  <label htmlFor={`opening-${row.id}`}>
                    Starting point for {row.name}
                  </label>
                  <p id={`opening-hint-${row.id}`} className="hint">
                    {openingHint(row.type)}
                  </p>
                  <input
                    id={`opening-${row.id}`}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={rowEditor.draft}
                    aria-describedby={
                      rowError
                        ? `opening-hint-${row.id} row-error`
                        : `opening-hint-${row.id}`
                    }
                    onChange={(event) => {
                      const draft = event.target.value;
                      setRowEditor((current) =>
                        current?.kind === 'opening'
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
                  {row.hasOpeningBalance ? (
                    <button
                      type="button"
                      disabled={rowBusy}
                      aria-label={`Clear starting point for ${row.name}`}
                      onClick={() => clearOpening(row)}
                    >
                      Clear
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={rowBusy}
                    onClick={cancelRowEditor}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : rowEditor?.kind === 'rename' &&
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
                  disabled={rowBusy}
                  onClick={() => startRename(row.id, row.name)}
                >
                  Rename
                </button>
                <button
                  type="button"
                  disabled={rowBusy}
                  onClick={() => startOpening(row)}
                >
                  {row.hasOpeningBalance
                    ? `Edit starting point for ${row.name}`
                    : `Set starting point for ${row.name}`}
                </button>
                {!row.hasOpeningBalance ? (
                  <p className="hint account-hint">
                    No starting point set. The balance is the sum of recorded
                    movements.
                  </p>
                ) : null}
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
        <div className="field">
          <label htmlFor="account-opening">Starting point (optional)</label>
          <p id="account-opening-hint" className="hint">
            {openingHint(type)}
          </p>
          <input
            id="account-opening"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={openingText}
            aria-describedby={
              openingError
                ? 'account-opening-hint account-opening-error'
                : 'account-opening-hint'
            }
            onChange={(event) => {
              setOpeningText(event.target.value);
              setOpeningError(null);
            }}
          />
          {openingError ? (
            <p
              id="account-opening-error"
              role="alert"
              className="field-error"
            >
              {openingError}
            </p>
          ) : null}
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
