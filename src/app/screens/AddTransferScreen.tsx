import { useRef, useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Account, Settings } from '../../domain/types';
import { isValidLocalDate, todayLocalDate } from '../../domain/calendar';
import { parseAmount } from '../../domain/money';
import type { Ledger } from '../../data/ledger';
import { LedgerError } from '../../data/ledger';
import {
  TransferFields,
  transferFieldErrors,
  type TransferFieldErrors,
} from '../transferForm';
import { navigate } from '../router';

export function AddTransferScreen({ ledger }: { ledger: Ledger }) {
  const accounts = useLiveQuery(() => ledger.listAccounts(), [ledger]);
  const settings = useLiveQuery(() => ledger.getSettings(), [ledger]);

  if (accounts === undefined || settings === undefined) {
    return <p>Loading…</p>;
  }

  if (accounts.length < 2) {
    return (
      <section>
        <h1>Add transfer</h1>
        <p>You need two accounts to record a transfer.</p>
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

  return (
    <AddTransferForm
      ledger={ledger}
      accounts={accounts}
      settings={settings}
    />
  );
}

function AddTransferForm({
  ledger,
  accounts,
  settings,
}: {
  ledger: Ledger;
  accounts: Account[];
  settings: Settings;
}) {
  const initialSourceId =
    settings.lastAccountId !== undefined &&
    accounts.some((account) => account.id === settings.lastAccountId)
      ? settings.lastAccountId
      : (accounts[0]?.id ?? null);

  const initialToAccountId =
    initialSourceId === null
      ? null
      : (accounts.find((account) => account.id !== initialSourceId)?.id ??
        null);

  const [amountText, setAmountText] = useState('');
  const [accountId, setAccountId] = useState<string | null>(initialSourceId);
  const [toAccountId, setToAccountId] =
    useState<string | null>(initialToAccountId);
  const [date, setDate] = useState(() => todayLocalDate());
  const [errors, setErrors] = useState<TransferFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  function clearError(field: keyof TransferFieldErrors) {
    setErrors((current) =>
      current[field] === undefined && current.form === undefined
        ? current
        : { ...current, [field]: undefined, form: undefined },
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) {
      return;
    }

    const amountMinor = parseAmount(amountText, settings.currencyExponent);
    const nextErrors: TransferFieldErrors = {};

    if (amountMinor === null || amountMinor <= 0) {
      nextErrors.amount = 'Enter an amount greater than zero.';
    }
    if (accountId === null) {
      nextErrors.account = 'Choose an account.';
    }
    if (toAccountId === null) {
      nextErrors.toAccount = 'Choose an account.';
    }
    if (
      accountId !== null &&
      toAccountId !== null &&
      accountId === toAccountId
    ) {
      nextErrors.form = 'Choose two different accounts.';
    }
    if (!isValidLocalDate(date)) {
      nextErrors.date = 'Choose a valid date.';
    }

    if (
      amountMinor === null ||
      accountId === null ||
      toAccountId === null ||
      Object.keys(nextErrors).length > 0
    ) {
      setErrors(nextErrors);
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setErrors({});

    try {
      await ledger.addTransfer({
        amountMinor,
        accountId,
        toAccountId,
        date,
      });
      navigate({ name: 'transfers' }, { replace: true });
    } catch (error) {
      if (error instanceof LedgerError) {
        setErrors(
          transferFieldErrors(error.code) ?? {
            form: 'Could not save the transfer. Try again.',
          },
        );
      } else {
        setErrors({
          form: 'Could not save the transfer. Try again.',
        });
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <section>
      <h1>Add transfer</h1>
      <form onSubmit={submit}>
        <TransferFields
          idPrefix="transfer-add"
          amountText={amountText}
          onAmountChange={setAmountText}
          accountId={accountId}
          onAccountChange={setAccountId}
          toAccountId={toAccountId}
          onToAccountChange={setToAccountId}
          date={date}
          onDateChange={setDate}
          accounts={accounts}
          errors={errors}
          onClearError={clearError}
        />

        {errors.form ? (
          <p role="alert" className="form-error">
            {errors.form}
          </p>
        ) : null}

        <div className="actions">
          <button
            type="submit"
            className="button-primary"
            disabled={submitting}
          >
            Save
          </button>
          <button
            type="button"
            onClick={() =>
              navigate({ name: 'transfers' }, { replace: true })
            }
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
