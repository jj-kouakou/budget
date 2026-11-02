# AGENTS.md

## Stack
TypeScript + React + Vite, Dexie (IndexedDB), `vite-plugin-pwa`, Vitest +
React Testing Library. Pinned by `docs/adr/0001` and `0005`.

## Project doc layout
- `docs/standards.md` — scoped index of applicable coding-convention rules
  (plugin v1.2.0 + OMP `rule://ts-*` corpus)
- `docs/product/` — `vision.md`, `backlog.md`, `slices/`
- `docs/architecture/` — `north-star.md` (whole-product, light), `slices/` (per-slice, extends north-star)
- `docs/program-design/` — `slices/` (spec + tickets per slice)
- `docs/adr/` — one file per decision, numbered
- `docs/external/` — env vars, test accounts, non-code facts
- `CONTEXT.md` — ubiquitous-language glossary (created at first resolved term)

## Workflow
Follow `docs/workflow.md`. Before starting any gate, read the most recent file
in the relevant `docs/` subfolder — and for architecture, read `north-star.md`
first, then the latest slice architecture doc — before doing anything else.
Read `docs/standards.md` before any code review.

## Standing rules
- One gate per session; close every gate with a `handoff` written to `docs/`.
- Product vision and slice scopes stay user-facing. No tables, endpoints, or
  architecture language in `docs/product/`.
- Build sessions: test-first (`implement` + `tdd`). Use `grilling` for small
  in-session decisions; `diagnosing-bugs` when something breaks unexpectedly;
  read-only `scout` subagents for mid-build exploration instead of working inline.
- Review runs in a fresh session on a different model from the build.
- Skills resolve via `skill://<name>` (plugin `mattpocock-skills` v1.2.0).
