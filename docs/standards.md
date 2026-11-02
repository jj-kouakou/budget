# Coding Standards

This project uses: TypeScript + React (function components) + Vite, Dexie
(IndexedDB) for local-first persistence, `vite-plugin-pwa` for offline/service
worker concerns, Vitest + React Testing Library for tests.

No tooling config exists yet at time of writing — there is no `package.json`,
`tsconfig.json`, or ESLint config in the repo. Where a line below says what
"would enforce" a rule, it names the tool that would do so **once that config
lands**; nothing is mechanically enforced today.

Two ground rules apply to every review:

1. A documented standard overrides the baseline — where this file or any other
   repo doc endorses something a rule below would flag, suppress it.
2. All rules are judgement calls, never hard violations — skip anything tooling
   already enforces.

## Applicable rules

### Fowler code smells — `code-review/SKILL.md` (plugin v1.2.0)

Language-agnostic baseline, always carried by the Standards axis. No tooling
detects any of these; they are review heuristics only.

- `mysterious-name` — a function, variable, or type whose name doesn't reveal
  what it does or holds. Tooling: none (ESLint naming rules don't judge
  semantics).
- `duplicated-code` — the same logic shape appears in more than one hunk or file
  in the change. Tooling: none meaningful (`jscpd`-style duplication scanners
  are not in this stack).
- `feature-envy` — a method reaches into another object's data more than its
  own. Tooling: none.
- `data-clumps` — the same few fields or params keep travelling together, i.e. a
  type wanting to be born. Tooling: none.
- `primitive-obsession` — a primitive or string standing in for a domain concept
  that deserves its own type. Tooling: none (`no-restricted-syntax` could ban
  specific primitive params, but that is a hand-written config, not a stock
  rule).
- `repeated-switches` — the same `switch`/`if`-cascade on the same type recurs
  across the change. Tooling: none.
- `shotgun-surgery` — one logical change forces scattered edits across many
  files in the diff. Tooling: none.
- `divergent-change` — one file or module is edited for several unrelated
  reasons. Tooling: none.
- `speculative-generality` — abstraction, parameters, or hooks added for needs
  the spec doesn't have. Tooling: none.
- `message-chains` — long `a.b().c().d()` navigation the caller shouldn't depend
  on. Tooling: none.
- `middle-man` — a class or function that mostly just delegates onward.
  Tooling: none.
- `refused-bequest` — a subclass or implementer that ignores or overrides most of
  what it inherits. Tooling: none.

### Test conventions — `tdd/SKILL.md`, `tests.md`, `mocking.md` (plugin v1.2.0)

These are **prose conventions only**. v1.2.0 ships no `ts-test-*` rule IDs (see
"Rule provenance" below), so there is no ID to cite; the labels here are
descriptive handles for the skill's own bullets, not rule names.

- `prose:red-before-green` — write the failing test first, then only enough code
  to pass it; no anticipating future tests. Tooling: none (Vitest runs whatever
  exists, in whatever order it was written).
- `prose:one-slice-at-a-time` — one seam, one test, one minimal implementation
  per cycle. Tooling: none.
- `prose:refactoring-is-not-the-loop` — refactoring belongs to review, not the
  red → green cycle. Tooling: none.
- `prose:pre-agreed-seams` — tests live at public seams agreed before writing
  any test, never against internals. Tooling: partially — an ESLint
  `no-restricted-imports`/`no-restricted-syntax` config could ban reaching past
  a module's entry point, but nothing stock knows where a seam is.
- `prose:no-implementation-coupled-tests` — no mocking internal collaborators,
  no asserting on private methods or call counts/order; the tell is a test that
  breaks on refactor without a behaviour change. Tooling: none (`@typescript-eslint`
  cannot tell an internal collaborator from an external one).
- `prose:no-tautological-tests` — the expected value must not be recomputed the
  way the implementation computes it; use a known-good literal, a worked
  example, or the spec. Tooling: none.
- `prose:vertical-slices` — not all tests first then all implementation; each
  test is a tracer bullet answering what the last cycle taught. Tooling: none.
- `prose:mock-only-at-system-boundaries` — mock external APIs, time/randomness,
  and sometimes filesystem/database; never your own modules or anything you
  control. Tooling: none.
- `prose:design-for-mockability` — inject dependencies instead of creating them
  inside the function, and prefer per-operation SDK-style interfaces over one
  generic fetcher. Tooling: none.

### Domain modeling conventions — `domain-modeling/SKILL.md` (plugin v1.2.0)

Prose conventions again; no `ts-domain-*` IDs exist in v1.2.0.

- `prose:challenge-against-glossary` — call out a term the moment it conflicts
  with `CONTEXT.md`. Tooling: none. This project already has `CONTEXT.md`, so
  the check is live from day one.
- `prose:sharpen-fuzzy-language` — replace vague or overloaded terms with one
  precise canonical term. Tooling: none.
- `prose:concrete-scenarios` — stress-test domain relationships with invented
  edge-case scenarios, not abstractions. Tooling: none.
- `prose:cross-reference-with-code` — when a stated behaviour contradicts the
  code, surface the contradiction rather than quietly picking one. Tooling: none.
- `prose:context-md-is-a-glossary-only` — update `CONTEXT.md` inline as terms
  resolve, and keep implementation details, storage shapes, and specs out of it.
  Tooling: none.
- `prose:adrs-sparingly` — write an ADR only when the decision is hard to
  reverse **and** surprising without context **and** the result of a real
  trade-off. Tooling: none.

### Codebase design conventions — `codebase-design/SKILL.md`, `DEEPENING.md` (plugin v1.2.0)

Prose conventions; no `ts-design-*` IDs exist in v1.2.0.

- `prose:deep-modules` — prefer a lot of behaviour behind a small interface; a
  shallow module (interface nearly as complex as the implementation) is the
  smell. Tooling: none.
- `prose:deletion-test` — imagine deleting the module: if complexity vanishes it
  was a pass-through; if it reappears across N callers it earns its keep.
  Tooling: none.
- `prose:interface-is-the-test-surface` — callers and tests cross the same seam;
  wanting to test past the interface means the module shape is wrong. Tooling:
  none.
- `prose:two-adapters-make-a-real-seam` — don't introduce a port/seam unless
  something actually varies across it; one adapter is a hypothetical seam.
  Tooling: none.
- `prose:accept-dependencies-return-results` — pass collaborators in rather than
  constructing them; return values rather than mutating inputs. Tooling: none.
- `prose:replace-dont-layer-tests` — when tests at the deepened interface exist,
  delete the old shallow-module tests instead of keeping both. Tooling: none.

### TypeScript engineering baseline — OMP harness corpus (`rule://ts-*`)

Thirteen rules, all applicable to this stack. Definitions live in the harness,
not the plugin; no `rule://` rule is `ts-test-*`/`ts-design-*`-prefixed.

- `ts-bare-catch` — use bare `catch {}` when the caught value is unused instead
  of an underscore-prefixed binding. Tooling: would be caught by ESLint
  `@typescript-eslint/no-unused-vars` with `caughtErrors: "all"`; `tsc`
  `noUnusedLocals` does **not** cover catch bindings. Not enforced today.
- `ts-import-type` — use top-level `import type` for type-only dependencies,
  never inline `import("pkg").Type` in annotations (ambient `.d.ts` globals and
  generator-owned files excepted). Tooling: would be caught by ESLint
  `@typescript-eslint/consistent-type-imports` plus `verbatimModuleSyntax: true`
  in `tsconfig`. Not enforced today.
- `ts-no-any` — no `: any` or `as any`; use `unknown` + schema parse at
  boundaries, a type guard in-process, or a named cast with a one-line reason
  when the compiler is genuinely wrong. Tooling: would be caught by ESLint
  `@typescript-eslint/no-explicit-any`. Not enforced today.
- `ts-no-deprecated-leftovers` — never leave a `@deprecated` alias standing in
  for a finished refactor; update every call site and delete the old name in the
  same change (narrow exceptions for published APIs with a migration window).
  Tooling: none — `@typescript-eslint/no-deprecated` flags *using* a deprecated
  symbol, not *creating* one.
- `ts-no-dynamic-import` — use static imports when the specifier is known at
  author time; `await import()` only for genuinely runtime-selected modules,
  with a comment naming why static import can't work. Tooling: partially — an
  ESLint `no-restricted-syntax` selector on `ImportExpression`, or
  `import/no-dynamic-import` if `eslint-plugin-import` is added; neither ships
  in this stack yet.
- `ts-no-inline-cast-access` — never fabricate a shape inline for member access
  (`(value as { content: unknown }).content`); parse at the boundary or narrow
  with `in`/`typeof`. Tooling: none stock; an ESLint `no-restricted-syntax`
  selector targeting `TSAsExpression` with an object type annotation would be
  hand-written. The rule's `@oh-my-pi/omptype` example is illustrative — this
  project has no validator dependency yet.
- `ts-no-local-is-record` — don't hand-roll an `isRecord(): value is
  Record<string, unknown>` guard, which proves an object but not its fields;
  parse once at the boundary or check only the properties used. Tooling: none.
- `ts-no-return-type` — don't publish contracts via `ReturnType<typeof fn>`;
  name the type where the value is owned and import that name. Tooling: none
  (`@typescript-eslint/consistent-type-definitions` doesn't cover this).
- `ts-no-test-timers` — no real `setTimeout`/`setInterval`/sleep in test files;
  drive time with fake timers and await the actual promise/event instead of a
  guessed duration. Tooling: none stock (`no-restricted-globals` scoped to test
  files would be hand-written). NB: the rule's code samples are `bun:test` —
  here they map to Vitest's `vi.useFakeTimers()` / `vi.advanceTimersByTime()`.
- `ts-no-tiny-functions` — no one-expression/one-return wrappers that add no
  behaviour and no durable name; inline them, unless they are an exported domain
  concept, a type guard preserving narrowing, a DI/test seam, or a shared
  lockstep behaviour across three-plus call sites. Tooling: none
  (`max-lines-per-function` measures size, not triviality).
- `ts-promise-with-resolvers` — prefer `Promise.withResolvers<T>()` over
  `new Promise((resolve, reject) => …)` for linear control flow and typed
  resolvers. Tooling: partly the typechecker — `Promise.withResolvers` requires
  `lib` at ES2024 in `tsconfig`; no lint rule bans the executor form.
- `ts-redundant-clear-guard` — never guard `clearTimeout`/`clearInterval`/
  `clearImmediate` with a truthiness or null check when the clear is the branch's
  only statement; the call already no-ops. Tooling: partially —
  `@typescript-eslint/no-unnecessary-condition` can flag the redundant branch
  when the handle's type excludes `null`/`undefined`; a `number | undefined`
  handle survives it, though the guard is still redundant.
- `ts-set-map` — use `Record<K, V>` for small static string-keyed lookup tables;
  reserve `Set`/`Map` for dynamic or non-string keys, runtime
  insertion/deletion, `.size`, `.clear()`, ordering, or iterator use. Tooling:
  none.

### Project-specific conventions — from src/

None yet — no `src/` code at time of writing (`src/` contains only `.gitkeep`).
This section is regenerated from actual code at the first review and is never
cached across projects.

## Not applicable (different stack)

- `ts-test-*`, `ts-domain-*`, `ts-design-*`, `ts-code-review-*` — **do not
  exist in plugin v1.2.0.** `docs/workflow.md` §0 item 4 names them as
  skill-embedded rule families, but no file in the install
  (`skills/engineering/{tdd,domain-modeling,codebase-design,code-review}/`)
  defines a single `ts-`-prefixed ID, nor do any `agents/openai.yaml` manifests.
  The four skills are indexed above as prose conventions instead. Not a stack
  mismatch — a documentation/install mismatch to record, not to invent around.
- `setup-ts-deep-modules` rules (`entry-point-boundary`,
  `intra-package-freedom`, `tests-through-entry-points`, `no-cycles`) — the only
  place in the install with numbered TS boundary rules, but it sits in
  `skills/in-progress/` and is marked `disable-model-invocation: true`, and it
  requires a `dependency-cruiser` install plus a `src/packages/` layout. This
  project has neither, and Vite's plain `src/` app structure was chosen instead;
  the rules could be adopted later if a package layout lands.
- Domain-modeling multi-context layout (`CONTEXT-MAP.md`, per-package
  `CONTEXT.md` and `docs/adr/`) — excluded because this is a single-context repo
  with one root `CONTEXT.md`; the single-context `CONTEXT.md` + `docs/adr/`
  layout is what applies.
- `ts-no-test-timers` as written for Bun (`Bun.sleep`, `bun:test`) — excluded at
  the API level only; the rule itself is applicable and listed above with its
  Vitest equivalent. There is no `bun:test` in this stack.
- `@oh-my-pi/omptype` schema example in `ts-no-inline-cast-access` — excluded
  because that dependency isn't in the stack; the rule's intent (parse at the
  boundary) still applies, and a Zod parse would satisfy it once a validator is
  added.
- Go/other-language rule families — no such corpora exist in this OMP install
  and no non-TS languages are in the stack; nothing to exclude beyond the above.

## Rule provenance

- Plugin-derived rules: `mattpocock-skills` **v1.2.0**, at
  `/home/jjkouakou/.omp/plugins/cache/plugins/mattpocock___mattpocock-skills___1.2.0/skills/engineering/`
  — `code-review/SKILL.md` (Fowler baseline), `tdd/` (SKILL + `tests.md` +
  `mocking.md`), `domain-modeling/SKILL.md`, `codebase-design/SKILL.md` +
  `DEEPENING.md`.
- Harness-derived rules: the OMP built-in `ts-*` corpus, addressed as
  `rule://<name>`, versioned with OMP rather than the plugin. Definitions are
  not on disk under the plugin install; read them via `read rule://<name>`.
- The two sources version independently: a plugin bump cannot add or retire a
  `rule://` entry, and an OMP bump cannot change a smell.
