import { useLiveQuery } from 'dexie-react-hooks';
import type { MonthKey } from '../../domain/types';
import {
  MAX_MONTH,
  MIN_MONTH,
  addMonths,
  formatMonth,
} from '../../domain/calendar';
import { formatAmount } from '../../domain/money';
import type { Ledger, MonthSummary } from '../../data/ledger';
import { navigate } from '../router';
import { useStorageStatus } from '../storage';

type HomeBreakdown =
  | { kind: 'empty' }
  | { kind: 'current-only'; note: string | null }
  | { kind: 'comparison'; previousMonth: MonthKey };

function homeBreakdown(summary: MonthSummary): HomeBreakdown {
  if (summary.rows.length === 0) {
    return { kind: 'empty' };
  }
  if (summary.previousMonth === null) {
    return { kind: 'current-only', note: null };
  }
  if (!summary.previousMonthHasSpending) {
    return {
      kind: 'current-only',
      note: `No spending recorded in ${formatMonth(summary.previousMonth)}.`,
    };
  }
  return { kind: 'comparison', previousMonth: summary.previousMonth };
}

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
  const storageStatus = useStorageStatus();

  if (summary === undefined || settings === undefined) {
    return <p>Loading…</p>;
  }

  const total = formatAmount(
    summary.totalMinor,
    settings.currency,
    settings.currencyExponent,
  );
  const breakdown = homeBreakdown(summary);

  return (
    <section>
      <h1>{formatMonth(month)}</h1>

      {storageStatus === 'at-risk' || storageStatus === 'unknown' ? (
        <p className="storage-warning">
          {storageStatus === 'at-risk'
            ? 'This phone may discard your ledger.'
            : "This browser can't confirm it will keep your ledger."}{' '}
          <button type="button" onClick={() => navigate({ name: 'backup' })}>
            Back up now
          </button>
        </p>
      ) : null}

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

      {breakdown.kind === 'empty' ? (
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
      ) : breakdown.kind === 'comparison' ? (
        <div className="home-comparison">
          <div className="comparison-header">
            <span />
            <span>{formatMonth(month)}</span>
            <span>{formatMonth(breakdown.previousMonth)}</span>
          </div>
          <ul className="category-list">
            {summary.rows.map((row) => {
              const current = formatAmount(
                row.amountMinor,
                settings.currency,
                settings.currencyExponent,
              );
              const previous = formatAmount(
                row.previousAmountMinor,
                settings.currency,
                settings.currencyExponent,
              );
              const tappable = row.amountMinor > 0;
              return (
                <li key={row.categoryId}>
                  <button
                    type="button"
                    disabled={!tappable}
                    aria-label={`${row.name}, ${formatMonth(month)}: ${current}, ${formatMonth(breakdown.previousMonth)}: ${previous}`}
                    onClick={
                      tappable
                        ? () =>
                            navigate({
                              name: 'category',
                              month,
                              categoryId: row.categoryId,
                            })
                        : undefined
                    }
                  >
                    <span className="comparison-name">{row.name}</span>
                    <span className="comparison-amount">{current}</span>
                    <span className="comparison-amount">{previous}</span>
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
        </div>
      ) : (
        <>
          {breakdown.note === null ? null : (
            <p className="comparison-note">{breakdown.note}</p>
          )}
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
        <button type="button" onClick={() => navigate({ name: 'income' })}>
          Income
        </button>
        <button type="button" onClick={() => navigate({ name: 'transfers' })}>
          Transfers
        </button>
        <button type="button" onClick={() => navigate({ name: 'accounts' })}>
          Accounts
        </button>
        <button type="button" onClick={() => navigate({ name: 'categories' })}>
          Categories
        </button>
        <button type="button" onClick={() => navigate({ name: 'backup' })}>
          Backup
        </button>
      </div>
    </section>
  );
}
