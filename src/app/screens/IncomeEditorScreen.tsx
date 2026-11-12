import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Account, Category, Entry, Settings } from '../../domain/types';
import { isValidLocalDate } from '../../domain/calendar';
import { formatAmount, formatAmountInput, parseAmount } from '../../domain/money';
import type { Ledger } from '../../data/ledger';
import { LedgerError, UNCATEGORIZED_LABEL } from '../../data/ledger';
import {
  CategorizedEntryFields,
  categorizedEntryFieldErrors,
  type CategorizedEntryFieldErrors,
} from '../categorizedEntryForm';
import { accountWithTypeLabel } from '../labels';
import { navigate } from '../router';

function IncomeNotFound() {
  return (
    <section>
      <h1>Income not found</h1>
      <p>This income no longer exists.</p>
      <div className="actions">
        <button
          type="button"
          onClick={() => navigate({ name: 'income' }, { replace: true })}
        >
          Back to income
        </button>
      </div>
    </section>
  );
}

export function IncomeEditorScreen({
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

  if (entry === null || entry.kind !== 'income') {
    return <IncomeNotFound />;
  }

  return (
    <IncomeEditorForm
      key={entry.id}
      ledger={ledger}
      entry={entry}
      accounts={accounts}
      categories={categories}
      settings={settings}
    />
  );
}

function IncomeEditorForm({
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
  const categoryOptions = categories.filter(
    (category) =>
      !category.archived || category.id === entry.categoryId,
  );
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
  const [errors, setErrors] = useState<CategorizedEntryFieldErrors>(() => {
    const initial: CategorizedEntryFieldErrors = {};
    if (storedCategoryId === null) {
      initial.category = 'That category no longer exists. Choose another.';
    }
    if (storedAccountId === null) {
      initial.account = 'That account no longer exists. Choose another.';
    }
    return initial;
  });
  const [submitting, setSubmitting] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [gone, setGone] = useState(false);
  const submittingRef = useRef(false);
  const deletingRef = useRef(false);
  const cancelRemoveRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirmingRemove) {
      cancelRemoveRef.current?.focus();
    }
  }, [confirmingRemove]);

  function clearError(field: keyof CategorizedEntryFieldErrors) {
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
    const nextErrors: CategorizedEntryFieldErrors = {};
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
      await ledger.updateIncome(entry.id, {
        amountMinor,
        categoryId,
        accountId,
        date,
      });
      navigate({ name: 'income' }, { replace: true });
    } catch (error) {
      if (
        error instanceof LedgerError &&
        (error.code === 'unknown-entry' ||
          error.code === 'unsupported-entry-kind')
      ) {
        setGone(true);
      } else if (error instanceof LedgerError) {
        setErrors(
          categorizedEntryFieldErrors(error.code) ?? {
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
      await ledger.deleteIncome(entry.id);
      navigate({ name: 'income' }, { replace: true });
    } catch (error) {
      if (
        error instanceof LedgerError &&
        (error.code === 'unknown-entry' ||
          error.code === 'unsupported-entry-kind')
      ) {
        setGone(true);
      } else {
        setErrors({ form: 'Could not remove the income. Try again.' });
      }
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  }

  if (gone) {
    return <IncomeNotFound />;
  }

  const storedAmount = formatAmount(
    entry.amountMinor,
    settings.currency,
    settings.currencyExponent,
  );
  const storedCategoryName =
    categories.find((category) => category.id === entry.categoryId)?.name ??
    UNCATEGORIZED_LABEL;
  const storedAccount = accounts.find(
    (account) => account.id === entry.accountId,
  );
  const storedAccountLabel = accountWithTypeLabel(
    storedAccount?.name ?? 'Unknown account',
    storedAccount?.type ?? null,
  );

  return (
    <section>
      <h1>Correct income</h1>
      <form onSubmit={submit}>
        <CategorizedEntryFields
          idPrefix="income"
          amountText={amountText}
          onAmountChange={setAmountText}
          categoryId={categoryId}
          onCategoryChange={setCategoryId}
          accountId={accountId}
          onAccountChange={setAccountId}
          date={date}
          onDateChange={setDate}
          accounts={accounts}
          categories={categoryOptions}
          archivedCategoryId={entry.categoryId}
          errors={errors}
          onClearError={clearError}
        />

        {errors.form ? (
          <p role="alert" className="form-error">
            {errors.form}
          </p>
        ) : null}

        {confirmingRemove ? (
          <div role="group" aria-label="Confirm removal">
            <p>
              Remove {storedAmount} on {entry.date} for {storedCategoryName} in{' '}
              {storedAccountLabel}? This cannot be undone.
            </p>
            <div className="actions">
              <button
                type="button"
                ref={cancelRemoveRef}
                onClick={() => setConfirmingRemove(false)}
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
              onClick={() => navigate({ name: 'income' }, { replace: true })}
            >
              Back
            </button>
            <button
              type="button"
              disabled={submitting || deleting}
              onClick={() => setConfirmingRemove(true)}
            >
              Remove income
            </button>
          </div>
        )}
      </form>
    </section>
  );
}
