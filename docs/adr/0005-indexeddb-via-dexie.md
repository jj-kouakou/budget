# IndexedDB via Dexie is the store

Context: the vision requires a local-first PWA on one phone with no backend.
The candidate stores were IndexedDB (directly or via Dexie) and SQLite compiled
to WASM over OPFS. SQLite gives real SQL and is the more familiar mental model,
but it needs a worker, careful cross-origin-isolation and Safari caveats, and a
larger bundle — all to query a dataset of a few thousand rows. We chose
IndexedDB through Dexie: universally supported on the target browser, no worker
or special headers, and Dexie provides schema versioning and transactions,
which are the two things the ledger actually needs.

Consequences: queries are expressed through Dexie's API rather than SQL; schema
changes go through Dexie version upgrades and must be paired with a
`schemaVersion` bump in the JSON export; complex ad-hoc reporting is computed
in TypeScript over indexed reads rather than in SQL.

Status: accepted
