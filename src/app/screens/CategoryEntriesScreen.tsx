import { useLiveQuery } from 'dexie-react-hooks';
import type { MonthKey } from '../../domain/types';
import { formatMonth } from '../../domain/calendar';
import { formatAmount } from '../../domain/money';
import type { EntryListItem, Ledger } from '../../data/ledger';
import { accountWithTypeLabel } from '../labels';
import { navigate } from '../router';

export function CategoryEntriesScreen({
  ledger,
  month,
  categoryId,
}: {
  ledger: Ledger;
  month: MonthKey;
  categoryId: string;
}) {
  const entries = useLiveQuery(
    () => ledger.categoryEntries(month, categoryId),
    [ledger, month, categoryId],
  );
  const settings = useLiveQuery(() => ledger.getSettings(), [ledger]);

  if (entries === undefined || settings === undefined) {
    return <p>Loading…</p>;
  }

  const total = formatAmount(
    entries.totalMinor,
    settings.currency,
    settings.currencyExponent,
  );

  return (
    <section>
      <h1>
        {entries.categoryName} · {formatMonth(month)}
      </h1>

      <p className="spent">
        Spent <strong>{total}</strong>
      </p>

      {entries.rows.length === 0 ? (
        <p className="empty-state">No entries in this category this month.</p>
      ) : (
        <ul className="entry-list">
          {entries.rows.map((row) => {
            const formattedAmount = formatAmount(
              row.amountMinor,
              settings.currency,
              settings.currencyExponent,
            );
            const label = accountWithTypeLabel(
              row.accountName,
              row.accountType,
            );
            return (
              <li key={row.id}>
                <button
                  type="button"
                  aria-label={`${formattedAmount} on ${row.date}, ${label}`}
                  onClick={() =>
                    navigate({ name: 'entry', entryId: row.id })
                  }
                >
                  <span>{formattedAmount}</span>
                  <span>{row.date}</span>
                  <span>{label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="actions">
        <button
          type="button"
          onClick={() => navigate({ name: 'home', month })}
        >
          Back
        </button>
      </div>
    </section>
  );
}
