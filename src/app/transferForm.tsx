import type { Account } from '../domain/types';
import type { LedgerErrorCode } from '../data/ledger';
import { ChoiceGroup } from './choiceGroup';
import { accountWithTypeLabel } from './labels';

export interface TransferFieldErrors {
  amount?: string;
  account?: string;
  toAccount?: string;
  date?: string;
  form?: string;
}

export function transferFieldErrors(
  code: LedgerErrorCode,
): TransferFieldErrors | null {
  switch (code) {
    case 'invalid-amount':
      return { amount: 'Enter an amount greater than zero.' };
    case 'invalid-date':
      return { date: 'Choose a valid date.' };
    case 'unknown-account':
      return { account: 'That account no longer exists. Choose another.' };
    case 'unknown-to-account':
      return { toAccount: 'That account no longer exists. Choose another.' };
    case 'same-transfer-account':
      return { form: 'Choose two different accounts.' };
    default:
      return null;
  }
}

export function TransferFields({
  idPrefix,
  amountText,
  onAmountChange,
  accountId,
  onAccountChange,
  toAccountId,
  onToAccountChange,
  date,
  onDateChange,
  accounts,
  errors,
  onClearError,
}: {
  idPrefix: 'transfer-add' | 'transfer-edit';
  amountText: string;
  onAmountChange: (value: string) => void;
  accountId: string | null;
  onAccountChange: (id: string) => void;
  toAccountId: string | null;
  onToAccountChange: (id: string) => void;
  date: string;
  onDateChange: (value: string) => void;
  accounts: Account[];
  errors: TransferFieldErrors;
  onClearError: (field: keyof TransferFieldErrors) => void;
}) {
  const accountOptions = accounts.map((account) => ({
    id: account.id,
    label: accountWithTypeLabel(account.name, account.type),
  }));

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
        legend="From account"
        options={accountOptions}
        selectedId={accountId}
        errorId={errors.account ? `${idPrefix}-account-error` : undefined}
        error={errors.account}
        onSelect={(id) => {
          onAccountChange(id);
          onClearError('account');
        }}
      />

      <ChoiceGroup
        legend="To account"
        options={accountOptions}
        selectedId={toAccountId}
        errorId={
          errors.toAccount ? `${idPrefix}-to-account-error` : undefined
        }
        error={errors.toAccount}
        onSelect={(id) => {
          onToAccountChange(id);
          onClearError('toAccount');
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
