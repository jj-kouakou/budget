import type { Account, Category } from '../domain/types';
import { ChoiceGroup } from './choiceGroup';
import type { EntryFieldErrors } from './entryFieldErrors';
import { accountWithTypeLabel } from './labels';

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
  errors: EntryFieldErrors;
  onClearError: (field: keyof EntryFieldErrors) => void;
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
