import { useLiveQuery } from 'dexie-react-hooks';
import type { Ledger } from '../../data/ledger';
import { UNCATEGORIZED_CATEGORY_ID } from '../../data/ledger';
import { monthOf, todayLocalDate } from '../../domain/calendar';
import { EntryEditor } from '../entryEditor';
import { navigate } from '../router';

function EntryGone({
  copy,
  onBack,
}: {
  copy: string;
  onBack: () => void;
}) {
  return (
    <section>
      <h1>Entry not found</h1>
      <p>{copy}</p>
      <div className="actions">
        <button type="button" onClick={onBack}>
          Go home
        </button>
      </div>
    </section>
  );
}

export function EntryEditorScreen({
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

  const goHome = () =>
    navigate({ name: 'home', month: monthOf(todayLocalDate()) });

  if (entry === undefined) {
    return <p>Loading…</p>;
  }
  if (entry === null) {
    return <EntryGone copy="This entry no longer exists." onBack={goHome} />;
  }
  if (entry.kind === 'opening') {
    return (
      <EntryGone copy="This entry can't be edited." onBack={goHome} />
    );
  }

  if (entry.kind === 'expense') {
    return (
      <EntryEditor
        ledger={ledger}
        kind="expense"
        mode="edit"
        entryId={entryId}
        onSaved={(saved) =>
          navigate(
            {
              name: 'category',
              month: monthOf(saved.date),
              categoryId:
                saved.categoryId ?? UNCATEGORIZED_CATEGORY_ID,
            },
            { replace: true },
          )
        }
        onRemoved={async (removed) => {
          const month = monthOf(removed.date);
          const categoryId =
            removed.categoryId ?? UNCATEGORIZED_CATEGORY_ID;
          const remaining = await ledger.categoryEntries(
            month,
            categoryId,
          );
          navigate(
            remaining.rows.length === 0
              ? { name: 'home', month }
              : { name: 'category', month, categoryId },
            { replace: true },
          );
        }}
        onCancel={(current) => {
          if (current === null) {
            return;
          }
          navigate({
            name: 'category',
            month: monthOf(current.date),
            categoryId:
              current.categoryId ?? UNCATEGORIZED_CATEGORY_ID,
          });
        }}
        onNotFoundBack={goHome}
      />
    );
  }

  if (entry.kind === 'income') {
    return (
      <EntryEditor
        ledger={ledger}
        kind="income"
        mode="edit"
        entryId={entryId}
        onSaved={() => navigate({ name: 'income' }, { replace: true })}
        onRemoved={() => navigate({ name: 'income' }, { replace: true })}
        onCancel={() => navigate({ name: 'income' }, { replace: true })}
        onNotFoundBack={() =>
          navigate({ name: 'income' }, { replace: true })
        }
      />
    );
  }

  return (
    <EntryEditor
      ledger={ledger}
      kind="transfer"
      mode="edit"
      entryId={entryId}
      onSaved={() => navigate({ name: 'transfers' }, { replace: true })}
      onRemoved={() => navigate({ name: 'transfers' }, { replace: true })}
      onCancel={() => navigate({ name: 'transfers' }, { replace: true })}
      onNotFoundBack={() =>
        navigate({ name: 'transfers' }, { replace: true })
      }
    />
  );
}
