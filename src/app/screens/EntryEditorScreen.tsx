import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Account, Category, Entry, Settings } from '../../domain/types';
import {
  isValidLocalDate,
  monthOf,
  todayLocalDate,
} from '../../domain/calendar';
import { formatAmount, formatAmountInput, parseAmount } from '../../domain/money';
import type { Ledger } from '../../data/ledger';
import { LedgerError, UNCATEGORIZED_CATEGORY_ID } from '../../data/ledger';
import {
  ExpenseFields,
  expenseFieldErrors,
  type ExpenseFieldErrors,
} from '../expenseForm';
import { navigate } from '../router';

function EntryNotFound() {
  return (
    <section>
      <h1>Entry not found</h1>
      <p>This entry no longer exists.</p>
      <div className="actions">
        <button
          type="button"
          onClick={() =>
            navigate(
              { name: 'home', month: monthOf(todayLocalDate()) },
              { replace: true },
            )
          }
        >
          Go home
        </button>
      </div>
    </section>
  );
}

export function EntryEditorScreen({
  ledger,
  entryId,
}: {
  ledger: Ledger;
  entryId: string;
}) {
  const entry = useLiveQuery(
    () => ledger.getEntry(entryId),
    [ledger, entryId],
  );
  const accounts = useLiveQuery(() => ledger.listAccounts(), [ledger]);
  const categories = useLiveQuery(() => ledger.listCategories(), [ledger]);
  const settings = useLiveQuery(() => ledger.getSettings(), [ledger]);

  if (
    entry === undefined ||
    accounts === undefined ||
    categories === undefined ||
    settings === undefined
  ) {
    return <p>Loading…</p>;
  }

  if (entry === null || entry.kind !== 'expense') {
    return <EntryNotFound />;
  }

  return (
    <EntryForm
      key={entry.id}
      ledger={ledger}
      entry={entry}
      accounts={accounts}
      categories={categories}
      settings={settings}
    />
  );
}

function EntryForm({
  ledger,
  entry,
  accounts,
  categories,
  settings,
}: {
  ledger: Ledger;
  entry: Entry;
  accounts: Account[];
  categories: Category[];
  settings: Settings;
}) {
  const storedCategoryId =
    entry.categoryId !== undefined &&
    categories.some((category) => category.id === entry.categoryId)
      ? entry.categoryId
      : null;
  const storedAccountId = accounts.some(
    (account) => account.id === entry.accountId,
  )
    ? entry.accountId
    : null;

  const [amountText, setAmountText] = useState(() =>
    formatAmountInput(entry.amountMinor, settings.currencyExponent),
  );
  const [categoryId, setCategoryId] = useState<string | null>(storedCategoryId);
  const [accountId, setAccountId] = useState<string | null>(storedAccountId);
  const [date, setDate] = useState(entry.date);
  const [errors, setErrors] = useState<ExpenseFieldErrors>(() => {
    const initial: ExpenseFieldErrors = {};
    if (storedCategoryId === null) {
      initial.category = 'That category no longer exists. Choose another.';
    }
    if (storedAccountId === null) {
      initial.account = 'That account no longer exists. Choose another.';
    }
    return initial;
  });
  const [submitting, setSubmitting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [gone, setGone] = useState(false);
  const submittingRef = useRef(false);
  const deletingRef = useRef(false);
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirmingDelete) {
      cancelDeleteRef.current?.focus();
    }
  }, [confirmingDelete]);

  function clearError(field: keyof ExpenseFieldErrors) {
    setErrors((current) =>
      current[field] === undefined
        ? current
        : { ...current, [field]: undefined },
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) {
      return;
    }

    const amountMinor = parseAmount(amountText, settings.currencyExponent);
    const nextErrors: ExpenseFieldErrors = {};
    if (amountMinor === null || amountMinor <= 0) {
      nextErrors.amount = 'Enter an amount greater than zero.';
    }
    if (categoryId === null) {
      nextErrors.category = 'Choose a category.';
    }
    if (accountId === null) {
      nextErrors.account = 'Choose an account.';
    }
    if (!isValidLocalDate(date)) {
      nextErrors.date = 'Choose a valid date.';
    }

    if (
      amountMinor === null ||
      categoryId === null ||
      accountId === null ||
      Object.keys(nextErrors).length > 0
    ) {
      setErrors(nextErrors);
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setErrors({});
    try {
      const updated = await ledger.updateExpense(entry.id, {
        amountMinor,
        categoryId,
        accountId,
        date,
      });
      navigate(
        {
          name: 'category',
          month: monthOf(updated.date),
          categoryId,
        },
        { replace: true },
      );
    } catch (error) {
      if (
        error instanceof LedgerError &&
        (error.code === 'unknown-entry' ||
          error.code === 'unsupported-entry-kind')
      ) {
        setGone(true);
      } else if (error instanceof LedgerError) {
        setErrors(
          expenseFieldErrors(error.code) ?? {
            form: 'Could not save the changes. Try again.',
          },
        );
      } else {
        setErrors({ form: 'Could not save the changes. Try again.' });
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  async function confirmRemove() {
    if (deletingRef.current) {
      return;
    }
    deletingRef.current = true;
    setDeleting(true);
    setErrors({});
    try {
      const removed = await ledger.deleteExpense(entry.id);
      const month = monthOf(removed.date);
      const categoryId =
        removed.categoryId ?? UNCATEGORIZED_CATEGORY_ID;
      const remaining = await ledger.categoryEntries(month, categoryId);
      if (remaining.rows.length === 0) {
        navigate({ name: 'home', month }, { replace: true });
      } else {
        navigate(
          { name: 'category', month, categoryId },
          { replace: true },
        );
      }
    } catch (error) {
      if (
        error instanceof LedgerError &&
        (error.code === 'unknown-entry' ||
          error.code === 'unsupported-entry-kind')
      ) {
        setGone(true);
      } else {
        setErrors({ form: 'Could not remove the entry. Try again.' });
      }
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  }

  if (gone) {
    return <EntryNotFound />;
  }

  const storedAmount = formatAmount(
    entry.amountMinor,
    settings.currency,
    settings.currencyExponent,
  );
  const storedAccountName =
    accounts.find((account) => account.id === entry.accountId)?.name ??
    'Unknown account';

  return (
    <section>
      <h1>Correct expense</h1>
      <form onSubmit={submit}>
        <ExpenseFields
          idPrefix="entry"
          amountText={amountText}
          onAmountChange={setAmountText}
          categoryId={categoryId}
          onCategoryChange={setCategoryId}
          accountId={accountId}
          onAccountChange={setAccountId}
          date={date}
          onDateChange={setDate}
          accounts={accounts}
          categories={categories}
          errors={errors}
          onClearError={clearError}
        />

        {errors.form ? (
          <p role="alert" className="form-error">
            {errors.form}
          </p>
        ) : null}

        {confirmingDelete ? (
          <div role="group" aria-label="Confirm removal">
            <p>
              Remove {storedAmount} on {entry.date} from{' '}
              {storedAccountName}? This cannot be undone.
            </p>
            <div className="actions">
              <button
                type="button"
                ref={cancelDeleteRef}
                onClick={() => setConfirmingDelete(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmRemove}
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="actions">
            <button
              type="submit"
              className="button-primary"
              disabled={submitting}
            >
              Save changes
            </button>
            <button
              type="button"
              disabled={submitting || deleting}
              onClick={() =>
                navigate({
                  name: 'category',
                  month: monthOf(entry.date),
                  categoryId:
                    entry.categoryId ?? UNCATEGORIZED_CATEGORY_ID,
                })
              }
            >
              Back
            </button>
            <button
              type="button"
              disabled={submitting || deleting}
              onClick={() => setConfirmingDelete(true)}
            >
              Remove entry
            </button>
          </div>
        )}
      </form>
    </section>
  );
}
