# Manual entry only, no bank sync

Context: a ledger is only useful if it is complete, and completeness usually
comes from automatic ingestion. We rejected bank/API sync anyway: it requires a
provider, OAuth, a backend, and a data-privacy surface that would replace the
entire architecture of a single-user local app. We chose manual entry and
accepted the real risk that logging discipline decays. This decision is what
makes entry speed a product requirement rather than a UI preference: if adding
an entry is not fast enough to do at the counter, the product fails on its own
success metric.

Considered options: CSV import was the strongest alternative and is deferred,
not rejected forever — it preserves the no-backend architecture. Bank sync was
rejected outright.

Status: accepted
