import { useRef, useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Account, Category, Settings } from '../../domain/types';
import {
  isValidLocalDate,
  monthOf,
  todayLocalDate,
} from '../../domain/calendar';
import { parseAmount } from '../../domain/money';
import type { Ledger, LedgerErrorCode } from '../../data/ledger';
import { LedgerError } from '../../data/ledger';
import { ACCOUNT_TYPE_LABELS } from '../labels';
import { navigate } from '../router';

interface FieldErrors {
  amount?: string;
  category?: string;
  account?: string;
  date?: string;
  form?: string;
}

function expenseErrorMessage(code: LedgerErrorCode): FieldErrors {
  switch (code) {
    case 'invalid-amount':
      return { amount: 'Enter an amount greater than zero.' };
    case 'invalid-date':
      return { date: 'Choose a valid date.' };
    case 'unknown-account':
      return { account: 'That account no longer exists. Choose another.' };
    case 'unknown-category':
      return { category: 'That category no longer exists. Choose another.' };
    default:
      return { form: 'Could not save the expense. Try again.' };
  }
}

function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function AddExpenseScreen({ ledger }: { ledger: Ledger }) {
  const accounts = useLiveQuery(() => ledger.listAccounts(), [ledger]);
  const categories = useLiveQuery(() => ledger.listCategories(), [ledger]);
  const settings = useLiveQuery(() => ledger.getSettings(), [ledger]);

  if (accounts === undefined || categories === undefined || settings === undefined) {
    return <p>Loading…</p>;
  }

  if (accounts.length === 0) {
    return (
      <section>
        <h1>Add expense</h1>
        <p>Add an account before logging an expense.</p>
        <button
          type="button"
          className="button-primary"
          onClick={() => navigate({ name: 'accounts' })}
        >
          Accounts
        </button>
      </section>
    );
  }

  if (categories.length === 0) {
    return (
      <section>
        <h1>Add expense</h1>
        <p>No categories are available.</p>
      </section>
    );
  }

  return (
    <AddExpenseForm
      ledger={ledger}
      accounts={accounts}
      categories={categories}
      settings={settings}
    />
  );
}

function AddExpenseForm({
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
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  function clearError(field: keyof FieldErrors) {
    setErrors((current) => {
      if (current[field] === undefined && current.form === undefined) {
        return current;
      }
      return { ...current, [field]: undefined, form: undefined };
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) {
      return;
    }

    const amountMinor = parseAmount(amountText, settings.currencyExponent);
    const nextErrors: FieldErrors = {};
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
      hasErrors(nextErrors) ||
      amountMinor === null ||
      categoryId === null ||
      accountId === null
    ) {
      setErrors(nextErrors);
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setErrors({});
    try {
      const entry = await ledger.addExpense({
        amountMinor,
        categoryId,
        accountId,
        date,
      });
      navigate({ name: 'home', month: monthOf(entry.date) });
    } catch (error) {
      if (error instanceof LedgerError) {
        setErrors(expenseErrorMessage(error.code));
      } else {
        setErrors({ form: 'Could not save the expense. Try again.' });
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <section>
      <h1>Add expense</h1>
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="expense-amount">Amount</label>
          <input
            id="expense-amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={amountText}
            aria-describedby={errors.amount ? 'amount-error' : undefined}
            onChange={(event) => {
              setAmountText(event.target.value);
              clearError('amount');
            }}
          />
          {errors.amount ? (
            <p id="amount-error" className="field-error">
              {errors.amount}
            </p>
          ) : null}
        </div>

        <fieldset
          className="field"
          aria-describedby={errors.category ? 'category-error' : undefined}
        >
          <legend>Category</legend>
          <div className="chip-group">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                aria-pressed={categoryId === category.id}
                onClick={() => {
                  setCategoryId(category.id);
                  clearError('category');
                }}
              >
                {category.name}
              </button>
            ))}
          </div>
          {errors.category ? (
            <p id="category-error" className="field-error">
              {errors.category}
            </p>
          ) : null}
        </fieldset>

        <fieldset
          className="field"
          aria-describedby={errors.account ? 'account-error' : undefined}
        >
          <legend>Account</legend>
          <div className="chip-group">
            {accounts.map((account) => (
              <button
                key={account.id}
                type="button"
                aria-pressed={accountId === account.id}
                onClick={() => {
                  setAccountId(account.id);
                  clearError('account');
                }}
              >
                {account.name} · {ACCOUNT_TYPE_LABELS[account.type]}
              </button>
            ))}
          </div>
          {errors.account ? (
            <p id="account-error" className="field-error">
              {errors.account}
            </p>
          ) : null}
        </fieldset>

        <div className="field">
          <label htmlFor="expense-date">Date</label>
          <input
            id="expense-date"
            type="date"
            value={date}
            aria-describedby={errors.date ? 'date-error' : undefined}
            onChange={(event) => {
              setDate(event.target.value);
              clearError('date');
            }}
          />
          {errors.date ? (
            <p id="date-error" className="field-error">
              {errors.date}
            </p>
          ) : null}
        </div>

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
            onClick={() =>
              navigate({
                name: 'home',
                month: monthOf(todayLocalDate()),
              })
            }
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
