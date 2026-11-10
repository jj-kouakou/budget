import { useLiveQuery } from 'dexie-react-hooks';
import type { MonthKey } from '../../domain/types';
import {
  MAX_MONTH,
  MIN_MONTH,
  addMonths,
  formatMonth,
} from '../../domain/calendar';
import { formatAmount } from '../../domain/money';
import type { Ledger } from '../../data/ledger';
import { navigate } from '../router';

export function HomeScreen({
  ledger,
  month,
}: {
  ledger: Ledger;
  month: MonthKey;
}) {
  const summary = useLiveQuery(
    () => ledger.monthSummary(month),
    [ledger, month],
  );
  const settings = useLiveQuery(() => ledger.getSettings(), [ledger]);

  if (summary === undefined || settings === undefined) {
    return <p>Loading…</p>;
  }

  const total = formatAmount(
    summary.totalMinor,
    settings.currency,
    settings.currencyExponent,
  );

  return (
    <section>
      <h1>{formatMonth(month)}</h1>

      <div className="month-controls">
        <button
          type="button"
          aria-label="Previous month"
          disabled={month === MIN_MONTH}
          onClick={() =>
            navigate({ name: 'home', month: addMonths(month, -1) })
          }
        >
          ←
        </button>
        <button
          type="button"
          aria-label="Next month"
          disabled={month === MAX_MONTH}
          onClick={() =>
            navigate({ name: 'home', month: addMonths(month, 1) })
          }
        >
          →
        </button>
      </div>

      <p className="spent">
        Spent <strong>{total}</strong>
      </p>

      {summary.rows.length === 0 ? (
        <div className="empty-state">
          <p>No spending yet this month.</p>
          <button
            type="button"
            className="button-primary"
            onClick={() => navigate({ name: 'add' })}
          >
            Add your first expense
          </button>
        </div>
      ) : (
        <>
          <ul className="category-list">
            {summary.rows.map((row) => {
              const formattedAmount = formatAmount(
                row.amountMinor,
                settings.currency,
                settings.currencyExponent,
              );
              return (
                <li key={row.categoryId}>
                  <button
                    type="button"
                    aria-label={`${row.name}, ${formattedAmount}`}
                    onClick={() =>
                      navigate({
                        name: 'category',
                        month,
                        categoryId: row.categoryId,
                      })
                    }
                  >
                    <span>{row.name}</span>
                    <span>{formattedAmount}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="actions">
            <button
              type="button"
              className="button-primary"
              onClick={() => navigate({ name: 'add' })}
            >
              Add expense
            </button>
          </div>
        </>
      )}

      <div className="actions">
        <button type="button" onClick={() => navigate({ name: 'accounts' })}>
          Accounts
        </button>
        <button type="button" onClick={() => navigate({ name: 'backup' })}>
          Backup
        </button>
      </div>
    </section>
  );
}
