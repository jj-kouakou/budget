import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Account, Category, Entry, Settings } from '../domain/types';
import { isValidLocalDate, todayLocalDate } from '../domain/calendar';
import {
  formatAmount,
  formatAmountInput,
  parseAmount,
} from '../domain/money';
import type { Ledger } from '../data/ledger';
import { LedgerError, UNCATEGORIZED_LABEL } from '../data/ledger';
import { CategorizedEntryFields } from './categorizedEntryForm';
import { TransferFields } from './transferForm';
import { entryFieldErrors } from './entryFieldErrors';
import type { EntryFieldErrors } from './entryFieldErrors';
import { accountWithTypeLabel } from './labels';
import { navigate } from './router';

export type EditableEntryKind = 'expense' | 'income' | 'transfer';

export interface EntryEditorProps {
  ledger: Ledger;
  kind: EditableEntryKind;
  mode: 'add' | 'edit';
  entryId?: string;
  onSaved: (entry: Entry) => void;
  onRemoved?: (entry: Entry) => void | Promise<void>;
  onCancel: (entry: Entry | null) => void;
  onNotFoundBack: () => void;
}

function titleFor(
  kind: EditableEntryKind,
  mode: 'add' | 'edit',
): string {
  return mode === 'add' ? `Add ${kind}` : `Correct ${kind}`;
}

function removeLabelFor(kind: EditableEntryKind): string {
  return kind === 'expense' ? 'Remove entry' : `Remove ${kind}`;
}

function removalCopy(
  kind: EditableEntryKind,
  entry: Entry,
  accounts: Account[],
  categories: Category[],
  settings: Settings,
): string {
  const amount = formatAmount(
    entry.amountMinor,
    settings.currency,
    settings.currencyExponent,
  );

  if (kind === 'expense') {
    const accountName =
      accounts.find((account) => account.id === entry.accountId)?.name ??
      'Unknown account';
    return `Remove ${amount} on ${entry.date} from ${accountName}? This cannot be undone.`;
  }

  if (kind === 'income') {
    const categoryName =
      categories.find((category) => category.id === entry.categoryId)
        ?.name ?? UNCATEGORIZED_LABEL;
    const account = accounts.find(
      (candidate) => candidate.id === entry.accountId,
    );
    const accountLabel = accountWithTypeLabel(
      account?.name ?? 'Unknown account',
      account?.type ?? null,
    );
    return `Remove ${amount} on ${entry.date} for ${categoryName} in ${accountLabel}? This cannot be undone.`;
  }

  const source = accounts.find(
    (account) => account.id === entry.accountId,
  );
  const destination =
    entry.toAccountId === undefined
      ? undefined
      : accounts.find(
          (account) => account.id === entry.toAccountId,
        );
  const sourceLabel = accountWithTypeLabel(
    source?.name ?? 'Unknown account',
    source?.type ?? null,
  );
  const destinationLabel = accountWithTypeLabel(
    destination?.name ?? 'Unknown account',
    destination?.type ?? null,
  );
  return `Remove ${amount} on ${entry.date} from ${sourceLabel} to ${destinationLabel}? This cannot be undone.`;
}

function NotFound({
  kind,
  onBack,
}: {
  kind: EditableEntryKind;
  onBack: () => void;
}) {
  const heading = kind === 'expense' ? 'Entry' : kind === 'income' ? 'Income' : 'Transfer';
  return (
    <section>
      <h1>{heading} not found</h1>
      <p>
        This {kind === 'expense' ? 'entry' : kind} no longer exists.
      </p>
      <div className="actions">
        <button type="button" onClick={onBack}>
          {kind === 'expense'
            ? 'Go home'
            : kind === 'income'
              ? 'Back to income'
              : 'Back to transfers'}
        </button>
      </div>
    </section>
  );
}

function AccountsNeeded({ kind }: { kind: EditableEntryKind }) {
  const copy =
    kind === 'transfer'
      ? 'You need two accounts to record a transfer.'
      : kind === 'expense'
        ? 'Add an account before logging an expense.'
        : 'Add an account before recording income.';
  return (
    <section>
      <h1>{titleFor(kind, 'add')}</h1>
      <p>{copy}</p>
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

function CategoriesEmpty({ kind }: { kind: EditableEntryKind }) {
  return (
    <section>
      <h1>{titleFor(kind, 'add')}</h1>
      <p>
        {kind === 'expense'
          ? 'There is no category to file this expense under. Add or unarchive one in Categories.'
          : 'There is no category to file income under. Add or unarchive one in Categories.'}
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

export function EntryEditor({
  ledger,
  kind,
  mode,
  entryId,
  onSaved,
  onRemoved,
  onCancel,
  onNotFoundBack,
}: EntryEditorProps) {
  const loadedEntry = useLiveQuery(
    () =>
      mode === 'edit' && entryId !== undefined
        ? ledger.getEntry(entryId)
        : Promise.resolve(null),
    [ledger, entryId, mode],
  );
  const accounts = useLiveQuery(() => ledger.listAccounts(), [ledger]);
  const categories = useLiveQuery(() => ledger.listCategories(), [ledger]);
  const settings = useLiveQuery(() => ledger.getSettings(), [ledger]);

  if (
    accounts === undefined ||
    categories === undefined ||
    settings === undefined ||
    (mode === 'edit' && loadedEntry === undefined)
  ) {
    return <p>Loading…</p>;
  }

  const entry: Entry | null =
    mode === 'edit' ? (loadedEntry ?? null) : null;

  if (mode === 'edit' && (entry === null || entry.kind !== kind)) {
    return <NotFound kind={kind} onBack={onNotFoundBack} />;
  }

  if (mode === 'add') {
    if (accounts.length === 0) {
      return <AccountsNeeded kind={kind} />;
    }
    if (kind === 'transfer' && accounts.length < 2) {
      return <AccountsNeeded kind={kind} />;
    }
    if (
      kind !== 'transfer' &&
      categories.every((category) => category.archived)
    ) {
      return <CategoriesEmpty kind={kind} />;
    }
  }

  return (
    <EntryEditorForm
      key={entry?.id ?? 'add'}
      ledger={ledger}
      kind={kind}
      mode={mode}
      entry={entry}
      accounts={accounts}
      categories={categories}
      settings={settings}
      onSaved={onSaved}
      onRemoved={onRemoved}
      onCancel={onCancel}
      onNotFoundBack={onNotFoundBack}
    />
  );
}

function EntryEditorForm({
  ledger,
  kind,
  mode,
  entry,
  accounts,
  categories,
  settings,
  onSaved,
  onRemoved,
  onCancel,
  onNotFoundBack,
}: {
  ledger: Ledger;
  kind: EditableEntryKind;
  mode: 'add' | 'edit';
  entry: Entry | null;
  accounts: Account[];
  categories: Category[];
  settings: Settings;
  onSaved: (entry: Entry) => void;
  onRemoved?: (entry: Entry) => void | Promise<void>;
  onCancel: (entry: Entry | null) => void;
  onNotFoundBack: () => void;
}) {
  const storedCategoryId =
    entry?.categoryId !== undefined &&
    categories.some((category) => category.id === entry.categoryId)
      ? entry.categoryId
      : null;
  const categoryOptions = categories.filter(
    (category) =>
      !category.archived ||
      (mode === 'edit' && category.id === entry?.categoryId),
  );
  const storedAccountId =
    entry !== null &&
    accounts.some((account) => account.id === entry.accountId)
      ? entry.accountId
      : null;
  const storedDestinationId =
    entry?.toAccountId !== undefined &&
    accounts.some((account) => account.id === entry.toAccountId)
      ? entry.toAccountId
      : null;

  const initialAccountId =
    mode === 'edit'
      ? storedAccountId
      : (() => {
          const lastAccountId = settings.lastAccountId;
          return lastAccountId !== undefined &&
            accounts.some((account) => account.id === lastAccountId)
            ? lastAccountId
            : (accounts[0]?.id ?? null);
        })();
  const initialDestinationId =
    mode === 'edit'
      ? storedDestinationId
      : initialAccountId === null
        ? null
        : (accounts.find((account) => account.id !== initialAccountId)
            ?.id ?? null);

  const [amountText, setAmountText] = useState(() =>
    entry === null
      ? ''
      : formatAmountInput(entry.amountMinor, settings.currencyExponent),
  );
  const [categoryId, setCategoryId] = useState<string | null>(
    storedCategoryId,
  );
  const [accountId, setAccountId] = useState<string | null>(
    initialAccountId,
  );
  const [toAccountId, setToAccountId] = useState<string | null>(
    initialDestinationId,
  );
  const [date, setDate] = useState(() =>
    entry === null ? todayLocalDate() : entry.date,
  );
  const [errors, setErrors] = useState<EntryFieldErrors>(() => {
    const initial: EntryFieldErrors = {};
    if (mode === 'edit' && kind !== 'transfer' && storedCategoryId === null) {
      initial.category = 'That category no longer exists. Choose another.';
    }
    if (mode === 'edit' && storedAccountId === null) {
      initial.account = 'That account no longer exists. Choose another.';
    }
    if (
      mode === 'edit' &&
      kind === 'transfer' &&
      storedDestinationId === null
    ) {
      initial.toAccount = 'That account no longer exists. Choose another.';
    }
    if (
      storedAccountId !== null &&
      storedDestinationId !== null &&
      storedAccountId === storedDestinationId
    ) {
      initial.form = 'Choose two different accounts.';
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

  function clearError(field: keyof EntryFieldErrors) {
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
    const nextErrors: EntryFieldErrors = {};
    if (amountMinor === null || amountMinor <= 0) {
      nextErrors.amount = 'Enter an amount greater than zero.';
    }
    if (accountId === null) {
      nextErrors.account = 'Choose an account.';
    }
    if (kind === 'transfer') {
      if (toAccountId === null) {
        nextErrors.toAccount = 'Choose an account.';
      } else if (accountId !== null && accountId === toAccountId) {
        nextErrors.form = 'Choose two different accounts.';
      }
    } else if (categoryId === null) {
      nextErrors.category = 'Choose a category.';
    }
    if (!isValidLocalDate(date)) {
      nextErrors.date = 'Choose a valid date.';
    }

    if (amountMinor === null || accountId === null) {
      setErrors(nextErrors);
      return;
    }
    if (kind === 'transfer') {
      if (toAccountId === null) {
        setErrors(nextErrors);
        return;
      }
    } else if (categoryId === null) {
      setErrors(nextErrors);
      return;
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setErrors({});
    try {
      let saved: Entry;
      if (kind === 'transfer') {
        if (toAccountId === null) {
          return;
        }
        const input = { amountMinor, accountId, toAccountId, date };
        if (mode === 'edit') {
          if (entry === null) {
            return;
          }
          saved = await ledger.updateTransfer(entry.id, input);
        } else {
          saved = await ledger.addTransfer(input);
        }
      } else {
        if (categoryId === null) {
          return;
        }
        const input = { amountMinor, categoryId, accountId, date };
        if (mode === 'edit') {
          if (entry === null) {
            return;
          }
          saved =
            kind === 'expense'
              ? await ledger.updateExpense(entry.id, input)
              : await ledger.updateIncome(entry.id, input);
        } else {
          saved =
            kind === 'expense'
              ? await ledger.addExpense(input)
              : await ledger.addIncome(input);
        }
      }
      onSaved(saved);
    } catch (error) {
      if (
        error instanceof LedgerError &&
        (error.code === 'unknown-entry' ||
          error.code === 'unsupported-entry-kind')
      ) {
        setGone(true);
      } else if (error instanceof LedgerError) {
        setErrors(
          entryFieldErrors(error.code) ?? {
            form:
              mode === 'add'
                ? `Could not save the ${kind}. Try again.`
                : 'Could not save the changes. Try again.',
          },
        );
      } else {
        setErrors({
          form:
            mode === 'add'
              ? `Could not save the ${kind}. Try again.`
              : 'Could not save the changes. Try again.',
        });
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  async function confirmRemove() {
    if (mode !== 'edit' || entry === null || deletingRef.current) {
      return;
    }
    deletingRef.current = true;
    setDeleting(true);
    setErrors({});
    try {
      const removed =
        kind === 'expense'
          ? await ledger.deleteExpense(entry.id)
          : kind === 'income'
            ? await ledger.deleteIncome(entry.id)
            : await ledger.deleteTransfer(entry.id);
      await onRemoved?.(removed);
    } catch (error) {
      if (
        error instanceof LedgerError &&
        (error.code === 'unknown-entry' ||
          error.code === 'unsupported-entry-kind')
      ) {
        setGone(true);
      } else {
        setErrors({
          form: `Could not remove the ${kind === 'expense' ? 'entry' : kind}. Try again.`,
        });
      }
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  }

  if (gone) {
    return <NotFound kind={kind} onBack={onNotFoundBack} />;
  }

  const categorizedPrefix: 'expense' | 'entry' | 'income' =
    kind === 'expense' ? (mode === 'add' ? 'expense' : 'entry') : 'income';
  const transferPrefix: 'transfer-add' | 'transfer-edit' =
    mode === 'add' ? 'transfer-add' : 'transfer-edit';

  return (
    <section>
      <h1>{titleFor(kind, mode)}</h1>
      <form onSubmit={submit}>
        {kind === 'transfer' ? (
          <TransferFields
            idPrefix={transferPrefix}
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
        ) : (
          <CategorizedEntryFields
            idPrefix={categorizedPrefix}
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
            archivedCategoryId={entry?.categoryId}
            errors={errors}
            onClearError={clearError}
          />
        )}

        {errors.form ? (
          <p role="alert" className="form-error">
            {errors.form}
          </p>
        ) : null}

        {mode === 'edit' && entry !== null ? (
          confirmingRemove ? (
            <div role="group" aria-label="Confirm removal">
              <p>
                {removalCopy(kind, entry, accounts, categories, settings)}
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
                onClick={() => onCancel(entry)}
              >
                Back
              </button>
              <button
                type="button"
                disabled={submitting || deleting}
                onClick={() => setConfirmingRemove(true)}
              >
                {removeLabelFor(kind)}
              </button>
            </div>
          )
        ) : (
          <div className="actions">
            <button
              type="submit"
              className="button-primary"
              disabled={submitting}
            >
              Save
            </button>
            <button type="button" onClick={() => onCancel(null)}>
              Cancel
            </button>
          </div>
        )}
      </form>
    </section>
  );
}
