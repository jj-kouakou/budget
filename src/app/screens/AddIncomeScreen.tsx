import { useRef, useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Account, Category, Settings } from '../../domain/types';
import { isValidLocalDate, todayLocalDate } from '../../domain/calendar';
import { parseAmount } from '../../domain/money';
import type { Ledger } from '../../data/ledger';
import { LedgerError } from '../../data/ledger';
import {
  CategorizedEntryFields,
  categorizedEntryFieldErrors,
  type CategorizedEntryFieldErrors,
} from '../categorizedEntryForm';
import { navigate } from '../router';

export function AddIncomeScreen({ ledger }: { ledger: Ledger }) {
  const accounts = useLiveQuery(() => ledger.listAccounts(), [ledger]);
  const categories = useLiveQuery(() => ledger.listCategories(), [ledger]);
  const settings = useLiveQuery(() => ledger.getSettings(), [ledger]);

  if (
    accounts === undefined ||
    categories === undefined ||
    settings === undefined
  ) {
    return <p>Loading…</p>;
  }

  const activeCategories = categories.filter(
    (category) => !category.archived,
  );

  if (activeCategories.length === 0) {
    return (
      <section>
        <h1>Add income</h1>
        <p>
          There is no category to file income under. Add or unarchive one in
          Categories.
        </p>
        <button
          type="button"
          className="button-primary"
          onClick={() => navigate({ name: 'categories' })}
        >
          Categories
        </button>
      </section>
    );
  }

  return (
    <AddIncomeForm
      ledger={ledger}
      accounts={accounts}
      categories={activeCategories}
      settings={settings}
    />
  );
}

function AddIncomeForm({
  ledger,
  accounts,
  categories,
  settings,
}: {
  ledger: Ledger;
  accounts: Account[];
  categories: Category[];
  settings: Settings;
}) {
  const [amountText, setAmountText] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(() => {
    const lastAccountId = settings.lastAccountId;
    return lastAccountId !== undefined &&
      accounts.some((account) => account.id === lastAccountId)
      ? lastAccountId
      : (accounts[0]?.id ?? null);
  });
  const [date, setDate] = useState(() => todayLocalDate());
  const [errors, setErrors] = useState<CategorizedEntryFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

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
      await ledger.addIncome({
        amountMinor,
        categoryId,
        accountId,
        date,
      });
      navigate({ name: 'income' }, { replace: true });
    } catch (error) {
      if (error instanceof LedgerError) {
        setErrors(
          categorizedEntryFieldErrors(error.code) ?? {
            form: 'Could not save the income. Try again.',
          },
        );
      } else {
        setErrors({ form: 'Could not save the income. Try again.' });
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <section>
      <h1>Add income</h1>
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
          categories={categories}
          errors={errors}
          onClearError={clearError}
        />

        {errors.form ? (
          <p role="alert" className="form-error">
            {errors.form}
          </p>
        ) : null}

        <div className="actions">
          <button type="submit" className="button-primary" disabled={submitting}>
            Save
          </button>
          <button
            type="button"
            onClick={() => navigate({ name: 'income' }, { replace: true })}
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
