import { useLiveQuery } from 'dexie-react-hooks';
import type { Settings } from '../../domain/types';
import { monthOf, todayLocalDate } from '../../domain/calendar';
import { formatAmount } from '../../domain/money';
import type { IncomeListItem, Ledger } from '../../data/ledger';
import { accountWithTypeLabel } from '../labels';
import { navigate } from '../router';

function IncomeRows({
  rows,
  settings,
}: {
  rows: IncomeListItem[];
  settings: Settings;
}) {
  return (
    <ul className="income-list">
      {rows.map((row) => {
        const amount = formatAmount(
          row.amountMinor,
          settings.currency,
          settings.currencyExponent,
        );
        const accountLabel = accountWithTypeLabel(
          row.accountName,
          row.accountType,
        );

        return (
          <li key={row.id}>
            <button
              type="button"
              aria-label={`Income: ${row.categoryName}, ${amount}, ${accountLabel}, ${row.date}`}
              onClick={() =>
                navigate({ name: 'income-entry', entryId: row.id })
              }
            >
              <span className="income-category">{row.categoryName}</span>
              <span className="income-amount">{amount}</span>
              <span className="income-account">{accountLabel}</span>
              <span className="income-date">{row.date}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function IncomeScreen({ ledger }: { ledger: Ledger }) {
  const incomes = useLiveQuery(() => ledger.listIncome(), [ledger]);
  const settings = useLiveQuery(() => ledger.getSettings(), [ledger]);

  if (incomes === undefined || settings === undefined) {
    return <p>Loading…</p>;
  }

  return (
    <section>
      <h1>Income</h1>

      {incomes.length === 0 ? (
        <div className="empty-state">
          <p>No income yet.</p>
          <button
            type="button"
            className="button-primary"
            onClick={() => navigate({ name: 'add-income' })}
          >
            Add your first income
          </button>
        </div>
      ) : (
        <>
          <IncomeRows rows={incomes} settings={settings} />
          <div className="actions">
            <button
              type="button"
              className="button-primary"
              onClick={() => navigate({ name: 'add-income' })}
            >
              Add income
            </button>
          </div>
        </>
      )}

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
