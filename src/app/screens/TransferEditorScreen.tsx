import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Account, Entry, Settings } from '../../domain/types';
import { isValidLocalDate } from '../../domain/calendar';
import { formatAmount, formatAmountInput, parseAmount } from '../../domain/money';
import type { Ledger } from '../../data/ledger';
import { LedgerError } from '../../data/ledger';
import {
  TransferFields,
  transferFieldErrors,
  type TransferFieldErrors,
} from '../transferForm';
import { accountWithTypeLabel } from '../labels';
import { navigate } from '../router';

function TransferNotFound() {
  return (
    <section>
      <h1>Transfer not found</h1>
      <p>This transfer no longer exists.</p>
      <div className="actions">
        <button
          type="button"
          onClick={() =>
            navigate({ name: 'transfers' }, { replace: true })
          }
        >
          Back to transfers
        </button>
      </div>
    </section>
  );
}

export function TransferEditorScreen({
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
  const settings = useLiveQuery(() => ledger.getSettings(), [ledger]);

  if (
    entry === undefined ||
    accounts === undefined ||
    settings === undefined
  ) {
    return <p>Loading…</p>;
  }

  if (entry === null || entry.kind !== 'transfer') {
    return <TransferNotFound />;
  }

  return (
    <TransferEditorForm
      key={entry.id}
      ledger={ledger}
      entry={entry}
      accounts={accounts}
      settings={settings}
    />
  );
}

function TransferEditorForm({
  ledger,
  entry,
  accounts,
  settings,
}: {
  ledger: Ledger;
  entry: Entry;
  accounts: Account[];
  settings: Settings;
}) {
  const storedSourceId = accounts.some(
    (account) => account.id === entry.accountId,
  )
    ? entry.accountId
    : null;

  const storedToAccountIdValue = entry.toAccountId;
  const storedToAccountId =
    storedToAccountIdValue !== undefined &&
    accounts.some((account) => account.id === storedToAccountIdValue)
      ? storedToAccountIdValue
      : null;

  const [amountText, setAmountText] = useState(() =>
    formatAmountInput(entry.amountMinor, settings.currencyExponent),
  );
  const [accountId, setAccountId] =
    useState<string | null>(storedSourceId);
  const [toAccountId, setToAccountId] =
    useState<string | null>(storedToAccountId);
  const [date, setDate] = useState(entry.date);
  const [errors, setErrors] = useState<TransferFieldErrors>(() => {
    const initial: TransferFieldErrors = {};

    if (storedSourceId === null) {
      initial.account =
        'That account no longer exists. Choose another.';
    }
    if (storedToAccountId === null) {
      initial.toAccount =
        'That account no longer exists. Choose another.';
    }
    if (
      storedSourceId !== null &&
      storedToAccountId !== null &&
      storedSourceId === storedToAccountId
    ) {
      initial.form = 'Choose two different accounts.';
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
      await ledger.updateTransfer(entry.id, {
        amountMinor,
        accountId,
        toAccountId,
        date,
      });
      navigate({ name: 'transfers' }, { replace: true });
    } catch (error) {
      if (
        error instanceof LedgerError &&
        (error.code === 'unknown-entry' ||
          error.code === 'unsupported-entry-kind')
      ) {
        setGone(true);
      } else if (error instanceof LedgerError) {
        setErrors(
          transferFieldErrors(error.code) ?? {
            form: 'Could not save the changes. Try again.',
          },
        );
      } else {
        setErrors({
          form: 'Could not save the changes. Try again.',
        });
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
      await ledger.deleteTransfer(entry.id);
      navigate({ name: 'transfers' }, { replace: true });
    } catch (error) {
      if (
        error instanceof LedgerError &&
        (error.code === 'unknown-entry' ||
          error.code === 'unsupported-entry-kind')
      ) {
        setGone(true);
      } else {
        setErrors({
          form: 'Could not remove the transfer. Try again.',
        });
      }
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  }

  if (gone) {
    return <TransferNotFound />;
  }

  const storedAmount = formatAmount(
    entry.amountMinor,
    settings.currency,
    settings.currencyExponent,
  );
  const sourceAccount = accounts.find(
    (account) => account.id === entry.accountId,
  );
  const destinationAccount =
    storedToAccountIdValue === undefined
      ? undefined
      : accounts.find(
          (account) => account.id === storedToAccountIdValue,
        );
  const storedSourceLabel = accountWithTypeLabel(
    sourceAccount?.name ?? 'Unknown account',
    sourceAccount?.type ?? null,
  );
  const storedDestinationLabel = accountWithTypeLabel(
    destinationAccount?.name ?? 'Unknown account',
    destinationAccount?.type ?? null,
  );

  return (
    <section>
      <h1>Correct transfer</h1>
      <form onSubmit={submit}>
        <TransferFields
          idPrefix="transfer-edit"
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

        {confirmingDelete ? (
          <div role="group" aria-label="Confirm removal">
            <p>
              Remove {storedAmount} on {entry.date} from{' '}
              {storedSourceLabel} to {storedDestinationLabel}? This cannot
              be undone.
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
                navigate({ name: 'transfers' }, { replace: true })
              }
            >
              Back
            </button>
            <button
              type="button"
              disabled={submitting || deleting}
              onClick={() => setConfirmingDelete(true)}
            >
              Remove transfer
            </button>
          </div>
        )}
      </form>
    </section>
  );
}
