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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [draftName, setDraftName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const renamingRef = useRef(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const archivingRef = useRef(false);

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

  function startRename(id: string, currentName: string) {
    setEditingId(id);
    setEditingName(currentName);
    setDraftName(currentName);
    setRenameError(null);
  }

  function cancelRename() {
    setEditingId(null);
    setRenameError(null);
  }

  async function saveRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editingId === null || renamingRef.current) {
      return;
    }
    renamingRef.current = true;
    setRenaming(true);
    setRenameError(null);
    try {
      await ledger.renameCategory(editingId, draftName);
      setEditingId(null);
    } catch (error) {
      if (error instanceof LedgerError) {
        setRenameError(
          categoryErrorMessage(error.code, error.existingCategoryName),
        );
      } else {
        setRenameError('Could not save the category. Try again.');
      }
    } finally {
      renamingRef.current = false;
      setRenaming(false);
    }
  }

  async function toggleArchived(id: string, archived: boolean) {
    if (archivingRef.current) {
      return;
    }
    archivingRef.current = true;
    setArchivingId(id);
    setArchiveError(null);
    try {
      await ledger.setCategoryArchived(id, archived);
    } catch (error) {
      if (error instanceof LedgerError) {
        setArchiveError(
          categoryErrorMessage(error.code, error.existingCategoryName),
        );
      } else {
        setArchiveError('Could not save the category. Try again.');
      }
    } finally {
      archivingRef.current = false;
      setArchivingId(null);
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

      {renameError ? (
        <p role="alert" className="form-error">
          {renameError}
        </p>
      ) : null}

      {archiveError ? (
        <p role="alert" className="form-error">
          {archiveError}
        </p>
      ) : null}

      {editingId !== null &&
      !categories.some((category) => category.id === editingId) ? (
        <form
          onSubmit={saveRename}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              cancelRename();
            }
          }}
        >
          <div className="field">
            <label htmlFor="stale-category-rename">
              Rename {editingName}
            </label>
            <input
              id="stale-category-rename"
              value={draftName}
              maxLength={60}
              onChange={(event) => {
                setDraftName(event.target.value);
                setRenameError(null);
              }}
            />
          </div>
          <div className="actions">
            <button type="submit" disabled={renaming}>
              Save
            </button>
            <button type="button" onClick={cancelRename}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {groups.map((group) =>
        group.rows.length === 0 ? null : (
          <div key={group.title}>
            <h2>{group.title}</h2>
            <ul className="category-manager-list">
              {group.rows.map((category) => (
                <li key={category.id}>
                  {editingId === category.id ? (
                    <form
                      onSubmit={saveRename}
                      onKeyDown={(event) => {
                        if (event.key === 'Escape') {
                          cancelRename();
                        }
                      }}
                    >
                      <input
                        aria-label={`Rename ${category.name}`}
                        value={draftName}
                        maxLength={60}
                        onChange={(event) => {
                          setDraftName(event.target.value);
                          setRenameError(null);
                        }}
                      />
                      <div className="actions">
                        <button type="submit" disabled={renaming}>
                          Save
                        </button>
                        <button type="button" onClick={cancelRename}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <span className="category-name">{category.name}</span>
                      {category.archived ? (
                        <span className="category-state">Archived</span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() =>
                          startRename(category.id, category.name)
                        }
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        disabled={archivingId === category.id}
                        onClick={() =>
                          toggleArchived(category.id, !category.archived)
                        }
                      >
                        {category.archived ? 'Unarchive' : 'Archive'}
                      </button>
                    </>
                  )}
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
