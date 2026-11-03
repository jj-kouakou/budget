export function BootError({ error }: { error: unknown }) {
  void error;
  return (
    <section className="error-screen">
      <h1>Budget</h1>
      <p>Budget couldn&apos;t open its local data.</p>
      <button
        type="button"
        className="button-primary"
        onClick={() => window.location.reload()}
      >
        Reload
      </button>
    </section>
  );
}
