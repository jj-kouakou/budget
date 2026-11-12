import { useLiveQuery } from 'dexie-react-hooks';
import type { Account, Settings } from '../../domain/types';
import { monthOf, todayLocalDate } from '../../domain/calendar';
import { formatAmount } from '../../domain/money';
import type { Ledger, TransferListItem } from '../../data/ledger';
import { accountWithTypeLabel } from '../labels';
import { navigate } from '../router';

type TransfersListState =
  | { kind: 'loading' }
  | { kind: 'needs-accounts'; rows: TransferListItem[] }
  | { kind: 'empty' }
  | { kind: 'list'; rows: TransferListItem[] };

function transfersListState(
  transfers: TransferListItem[] | undefined,
  accounts: Account[] | undefined,
): TransfersListState {
  if (transfers === undefined || accounts === undefined) {
    return { kind: 'loading' };
  }
  if (accounts.length < 2) {
    return { kind: 'needs-accounts', rows: transfers };
  }
  if (transfers.length === 0) {
    return { kind: 'empty' };
  }
  return { kind: 'list', rows: transfers };
}

function TransferRows({
  rows,
  settings,
}: {
  rows: TransferListItem[];
  settings: Settings;
}) {
  return (
    <ul className="transfer-list">
      {rows.map((row) => {
        const sourceLabel = accountWithTypeLabel(
          row.accountName,
          row.accountType,
        );
        const destinationLabel = accountWithTypeLabel(
          row.toAccountName,
          row.toAccountType,
        );
        const amount = formatAmount(
          row.amountMinor,
          settings.currency,
          settings.currencyExponent,
        );

        return (
          <li key={row.id}>
            <button
              type="button"
              aria-label={`Transfer from ${sourceLabel} to ${destinationLabel}, ${amount}, ${row.date}`}
              onClick={() =>
                navigate({ name: 'transfer', entryId: row.id })
              }
            >
              <span className="transfer-route">
                {sourceLabel} → {destinationLabel}
              </span>
              <span className="transfer-amount">{amount}</span>
              <span className="transfer-date">{row.date}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function TransfersScreen({ ledger }: { ledger: Ledger }) {
  const transfers = useLiveQuery(() => ledger.listTransfers(), [ledger]);
  const accounts = useLiveQuery(() => ledger.listAccounts(), [ledger]);
  const settings = useLiveQuery(() => ledger.getSettings(), [ledger]);
  const state = transfersListState(transfers, accounts);

  if (state.kind === 'loading' || settings === undefined) {
    return <p>Loading…</p>;
  }

  return (
    <section>
      <h1>Transfers</h1>

      {state.kind === 'needs-accounts' ? (
        <>
          <p>You need two accounts to record a transfer.</p>
          <div className="actions">
            <button
              type="button"
              className="button-primary"
              onClick={() => navigate({ name: 'accounts' })}
            >
              Accounts
            </button>
          </div>
        </>
      ) : null}

      {state.kind === 'empty' ? (
        <div className="empty-state">
          <p>No transfers yet.</p>
          <button
            type="button"
            className="button-primary"
            onClick={() => navigate({ name: 'add-transfer' })}
          >
            Add your first transfer
          </button>
        </div>
      ) : null}

      {state.kind === 'list' || state.kind === 'needs-accounts'
        ? state.rows.length > 0
          ? <TransferRows rows={state.rows} settings={settings} />
          : null
        : null}

      {state.kind === 'list' ? (
        <div className="actions">
          <button
            type="button"
            className="button-primary"
            onClick={() => navigate({ name: 'add-transfer' })}
          >
            Add transfer
          </button>
        </div>
      ) : null}

      <div className="actions">
        <button
          type="button"
          onClick={() =>
            navigate({ name: 'home', month: monthOf(todayLocalDate()) })
          }
        >
          Back
        </button>
      </div>
    </section>
  );
}
