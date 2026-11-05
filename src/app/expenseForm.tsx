import type { Account, Category } from '../domain/types';
import type { LedgerErrorCode } from '../data/ledger';
import { ACCOUNT_TYPE_LABELS } from './labels';

export interface ExpenseFieldErrors {
  amount?: string;
  category?: string;
  account?: string;
  date?: string;
  form?: string;
}

export function expenseFieldErrors(
  code: LedgerErrorCode,
): ExpenseFieldErrors | null {
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
      return null;
  }
}

export function ChoiceGroup({
  legend,
  options,
  selectedId,
  errorId,
  error,
  onSelect,
}: {
  legend: string;
  options: { id: string; label: string }[];
  selectedId: string | null;
  errorId?: string;
  error?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <fieldset className="field" aria-describedby={errorId}>
      <legend>{legend}</legend>
      <div className="chip-group">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={selectedId === option.id}
            onClick={() => onSelect(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {error ? (
        <p id={errorId} className="field-error">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

export function ExpenseFields({
  idPrefix,
  amountText,
  onAmountChange,
  categoryId,
  onCategoryChange,
  accountId,
  onAccountChange,
  date,
  onDateChange,
  accounts,
  categories,
  errors,
  onClearError,
}: {
  idPrefix: 'expense' | 'entry';
  amountText: string;
  onAmountChange: (value: string) => void;
  categoryId: string | null;
  onCategoryChange: (id: string) => void;
  accountId: string | null;
  onAccountChange: (id: string) => void;
  date: string;
  onDateChange: (value: string) => void;
  accounts: Account[];
  categories: Category[];
  errors: ExpenseFieldErrors;
  onClearError: (field: keyof ExpenseFieldErrors) => void;
}) {
  return (
    <>
      <div className="field">
        <label htmlFor={`${idPrefix}-amount`}>Amount</label>
        <input
          id={`${idPrefix}-amount`}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={amountText}
          aria-describedby={
            errors.amount ? `${idPrefix}-amount-error` : undefined
          }
          onChange={(event) => {
            onAmountChange(event.target.value);
            onClearError('amount');
          }}
        />
        {errors.amount ? (
          <p id={`${idPrefix}-amount-error`} className="field-error">
            {errors.amount}
          </p>
        ) : null}
      </div>

      <ChoiceGroup
        legend="Category"
        options={categories.map((category) => ({
          id: category.id,
          label: category.name,
        }))}
        selectedId={categoryId}
        errorId={errors.category ? `${idPrefix}-category-error` : undefined}
        error={errors.category}
        onSelect={(id) => {
          onCategoryChange(id);
          onClearError('category');
        }}
      />

      <ChoiceGroup
        legend="Account"
        options={accounts.map((account) => ({
          id: account.id,
          label: `${account.name} · ${ACCOUNT_TYPE_LABELS[account.type]}`,
        }))}
        selectedId={accountId}
        errorId={errors.account ? `${idPrefix}-account-error` : undefined}
        error={errors.account}
        onSelect={(id) => {
          onAccountChange(id);
          onClearError('account');
        }}
      />

      <div className="field">
        <label htmlFor={`${idPrefix}-date`}>Date</label>
        <input
          id={`${idPrefix}-date`}
          type="date"
          value={date}
          aria-describedby={
            errors.date ? `${idPrefix}-date-error` : undefined
          }
          onChange={(event) => {
            onDateChange(event.target.value);
            onClearError('date');
          }}
        />
        {errors.date ? (
          <p id={`${idPrefix}-date-error`} className="field-error">
            {errors.date}
          </p>
        ) : null}
      </div>
    </>
  );
}
