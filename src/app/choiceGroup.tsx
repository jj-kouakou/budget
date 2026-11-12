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
