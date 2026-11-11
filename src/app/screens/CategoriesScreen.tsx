import { useRef, useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { monthOf, todayLocalDate } from '../../domain/calendar';
import type { Ledger, LedgerErrorCode } from '../../data/ledger';
import { LedgerError } from '../../data/ledger';
import { navigate } from '../router';

function categoryErrorMessage(
  code: LedgerErrorCode,
  existingCategoryName?: string,
): string {
  switch (code) {
    case 'invalid-name':
      return 'Enter a category name of 60 characters or fewer.';
    case 'duplicate-category-name':
      return `A category named “${existingCategoryName ?? ''}” already exists.`;
    case 'unknown-category':
      return 'That category no longer exists.';
    default:
      return 'Could not save the category. Try again.';
  }
}

export function CategoriesScreen({ ledger }: { ledger: Ledger }) {
  const categories = useLiveQuery(() => ledger.listCategories(), [ledger]);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const busyRef = useRef(false);

  if (categories === undefined) {
    return <p>Loading…</p>;
  }

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyRef.current) {
      return;
    }
    busyRef.current = true;
    setSubmitting(true);
    setFormError(null);
    try {
      await ledger.addCategory(name);
      setName('');
    } catch (error) {
      if (error instanceof LedgerError) {
        setFormError(
          categoryErrorMessage(error.code, error.existingCategoryName),
        );
      } else {
        setFormError('Could not save the category. Try again.');
      }
    } finally {
      busyRef.current = false;
      setSubmitting(false);
    }
  }

  const groups = [
    {
      title: 'Active',
      rows: categories.filter((category) => !category.archived),
    },
    {
      title: 'Archived',
      rows: categories.filter((category) => category.archived),
    },
  ];

  return (
    <section>
      <h1>Categories</h1>

      {groups.map((group) =>
        group.rows.length === 0 ? null : (
          <div key={group.title}>
            <h2>{group.title}</h2>
            <ul className="category-manager-list">
              {group.rows.map((category) => (
                <li key={category.id}>
                  <span className="category-name">{category.name}</span>
                  {category.archived ? (
                    <span className="category-state">Archived</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ),
      )}

      <form onSubmit={addCategory}>
        <div className="field">
          <label htmlFor="category-name">Category name</label>
          <input
            id="category-name"
            value={name}
            maxLength={60}
            onChange={(event) => {
              setName(event.target.value);
              setFormError(null);
            }}
          />
        </div>
        {formError ? (
          <p role="alert" className="form-error">
            {formError}
          </p>
        ) : null}
        <button type="submit" className="button-primary" disabled={submitting}>
          Add category
        </button>
      </form>

      <div className="actions">
        <button
          type="button"
          onClick={() =>
            navigate({
              name: 'home',
              month: monthOf(todayLocalDate()),
            })
          }
        >
          Back
        </button>
      </div>
    </section>
  );
}
