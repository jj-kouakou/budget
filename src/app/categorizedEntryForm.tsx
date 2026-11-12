import type { Account, Category } from '../domain/types';
import type { LedgerErrorCode } from '../data/ledger';
import { ChoiceGroup } from './choiceGroup';
import { accountWithTypeLabel } from './labels';

export interface CategorizedEntryFieldErrors {
  amount?: string;
  category?: string;
  account?: string;
  date?: string;
  form?: string;
}

export function categorizedEntryFieldErrors(
  code: LedgerErrorCode,
): CategorizedEntryFieldErrors | null {
  switch (code) {
    case 'invalid-amount':
      return { amount: 'Enter an amount greater than zero.' };
    case 'invalid-date':
      return { date: 'Choose a valid date.' };
    case 'unknown-account':
      return { account: 'That account no longer exists. Choose another.' };
    case 'unknown-category':
      return { category: 'That category no longer exists. Choose another.' };
    case 'archived-category':
      return { category: 'That category is archived. Choose another.' };
    default:
      return null;
  }
}

export function CategorizedEntryFields({
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
  archivedCategoryId,
  errors,
  onClearError,
}: {
  idPrefix: 'expense' | 'entry' | 'income';
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
  archivedCategoryId?: string;
  errors: CategorizedEntryFieldErrors;
  onClearError: (field: keyof CategorizedEntryFieldErrors) => void;
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
          label:
            category.archived && category.id === archivedCategoryId
              ? `${category.name} (archived)`
              : category.name,
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
          label: accountWithTypeLabel(account.name, account.type),
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
