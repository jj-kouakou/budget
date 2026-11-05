import { useLiveQuery } from 'dexie-react-hooks';
import type { MonthKey } from '../../domain/types';
import { formatMonth } from '../../domain/calendar';
import { formatAmount } from '../../domain/money';
import type { EntryListItem, Ledger } from '../../data/ledger';
import { ACCOUNT_TYPE_LABELS } from '../labels';
import { navigate } from '../router';

function accountLabel(row: EntryListItem, ambiguousNames: Set<string>): string {
  if (row.accountType !== null && ambiguousNames.has(row.accountName)) {
    return `${row.accountName} · ${ACCOUNT_TYPE_LABELS[row.accountType]}`;
  }
  return row.accountName;
}

function duplicateAccountNames(rows: EntryListItem[]): Set<string> {
  const idsByName = new Map<string, Set<string>>();
  for (const row of rows) {
    if (row.accountType === null) {
      continue;
    }
    const ids = idsByName.get(row.accountName) ?? new Set<string>();
    ids.add(row.accountId);
    idsByName.set(row.accountName, ids);
  }
  return new Set(
    [...idsByName].filter(([, ids]) => ids.size > 1).map(([name]) => name),
  );
}

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
  const ambiguousNames = duplicateAccountNames(entries.rows);

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
            const label = accountLabel(row, ambiguousNames);
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
