# OMP Project Workflow

A repeatable, gate-based development process for oh-my-pi (OMP), built on
Matt Pocock's 22 skills, session-per-gate context management, and pi-iso for
isolated exploration. Slice-first: architecture is scoped to what the current
slice needs, not the whole product, with a light one-time "north star" layer
to keep slices from contradicting each other later.

## How to use this document

This is a personal template, meant to be reused across every project, not a
one-off plan for a single app. Keep a master copy somewhere outside any
single project (e.g. `~/Documents/templates/omp-project-workflow.md`), and
copy it into each new project as `docs/workflow.md` during Step 0. Update
your master copy whenever you learn something that should change the process
for next time — treat this file itself as versioned.

---

## Quick reference

**Once per product:** repo setup → Product Vision → North Star Architecture (light) → Slice Scoping / Backlog

**Per slice, looped:** Slice Architecture (extend) → Slice Program Design → Ticket Breakdown → Build → Review → Close-out

**Periodic:** architecture drift check every 3–4 slices; triage as bug reports come in

**Every gate:** new session at project-root → run the skill → write to `docs/` → update `AGENTS.md` if a new doc landed → `handoff` before closing

---

## Part A — One-time, per product

### 0. Repo & doc setup

1. Run `setup-matt-pocock-skills` in the repo.
2. Create the doc skeleton (empty is fine):

```
project-root/
  docs/
    workflow.md          # this file
    standards.md          # scoped index of applicable coding-convention rules
    product/
      vision.md
      backlog.md
      slices/             # one scope doc per slice, e.g. slice-01-scope.md
    architecture/
      north-star.md
      slices/             # one doc per slice, e.g. slice-01-architecture.md
    program-design/
      slices/             # slice-01-spec.md, slice-01-tickets.md
    adr/                   # 0001-*.md, numbered, one decision per file
    external/              # env vars, test accounts, non-code facts
  src/
  AGENTS.md
```

3. Seed `AGENTS.md` at project root:

```markdown
# AGENTS.md

## Project doc layout
- docs/standards.md        — scoped index of applicable coding-convention rules (see below)
- docs/product/            — vision.md, backlog.md, slices/
- docs/architecture/       — north-star.md (whole-product, light), slices/ (per-slice, extends north-star)
- docs/program-design/     — slices/ (spec + tickets per slice)
- docs/adr/                — one file per decision, numbered
- docs/external/           — env vars, test accounts, non-code facts

## Workflow
Follow docs/workflow.md. Before starting any gate, read the most recent file
in the relevant docs/ subfolder — and for architecture, read north-star.md
first, then the latest slice architecture doc — before doing anything else.
Read docs/standards.md before any code-review.

During build sessions: use grill-me (not grill-with-docs) for small
decisions that don't need to survive past the current ticket. Use
diagnosing-bugs if something breaks unexpectedly. Use pi-iso subagents for
any mid-build exploration instead of working inline.
```

`AGENTS.md` auto-loads every session but does **not** auto-update. Updating
it is an explicit last step of every gate's close-out below — don't skip it.

4. Generate `docs/standards.md` — a scoped index of the coding-convention
   rules that actually apply to this project's stack. This pulls from **two
   independent sources**, versioned separately:
   - The Pocock plugin's skill-embedded rules (Fowler smells from
     `code-review/SKILL.md`; `ts-test-*`, `ts-domain-*`, `ts-design-*`,
     `ts-code-review-*` from `tdd/`, `domain-modeling/`, `codebase-design/`)
     — versioned by plugin version (e.g. `mattpocock-skills___1.2.0`).
   - OMP's own harness-level rule corpus, addressable as `rule://<name>`,
     separate from the plugin entirely — versioned by OMP version, not
     plugin version. Don't assume one search covers both; check for a
     harness rule corpus even after the plugin's skill folders are covered.

   This is mostly mechanical (read real rule definitions, summarize, filter
   by detected stack, check each against existing tooling config to see if
   it's already mechanically enforced) — a session on DeepSeek V4 Flash is
   fine for the first pass, but if anything is ambiguous (does a rule's
   *intent* genuinely overlap with what a tsconfig/lint rule enforces?),
   escalate that judgment call to Kimi K3 rather than trusting a cheap
   model's guess. Have it read actual rule definitions, never infer meaning
   from a rule's name alone. Structure:

```markdown
# Coding Standards

This project uses: [detected languages/frameworks]

Two ground rules apply to every review:
1. A documented standard overrides the baseline — where this file or any
   other repo doc endorses something a rule below would flag, suppress it.
2. All rules are judgement calls, never hard violations — skip anything
   tooling already enforces.

## Applicable rules
### [source subsection, e.g. "Fowler code smells", "Test rules — tdd/
    skill", "TypeScript engineering baseline — OMP harness corpus"]
- rule-name — one-line description of what it catches and, if relevant,
  what tooling does/doesn't already cover it
  (repeat per applicable rule, grouped by source)

### Project-specific conventions — from src/
- pj-rule-name — a convention read from the actual codebase, not the skill
  install (net-new every project, never cached)

## Not applicable (different stack)
- rule-name — excluded because [reason, naming the missing dependency/tool]

Full rule definitions live at [path to skill install] and the OMP harness
rule corpus.
```

**Caching for reuse across projects:** the plugin-derived and harness-derived
sections are identical for any project on the same versions and language —
no reason to regenerate them from scratch each time. Save them outside any
single project (e.g. `~/Documents/templates/`), keyed by **both** version
numbers independently, since they bump on different schedules:
- `skill-rules-ts-v1.2.0.md` — plugin-derived (smells + `ts-test-*`/
  `ts-domain-*`/`ts-design-*`/`ts-code-review-*`)
- `harness-rules-ts-<omp-version>.md` — harness-corpus-derived

On a new project: check for matching snapshots first. If found, copy them
in as the base and only generate the `pj-*` section fresh (always net-new,
since it's read from that project's actual code). If a stack or version
doesn't match anything cached, do the full generation once, then save the
result back under the new key for next time. The "Not applicable" section
also flips per stack rather than needing regeneration — a Go project's
"applicable" `go-*` section is just the snapshot a TypeScript project would
have filed under "not applicable."

**If `docs/standards.md` gets created or updated after a slice has already
been reviewed:** don't assume the whole review needs redoing. Fowler smells
and harness-corpus rules tend to be standing `code-review` behavior
regardless of whether this file exists yet; what's genuinely unverified is
anything from the skill-embedded sections (`ts-test-*`/`ts-domain-*`/
`ts-design-*`) and all of `pj-*`, since those depend on this file actually
being read. Run one targeted pass checking the already-reviewed diff
against just those sections, rather than a full re-review.

### 1. Product Vision

What the app does, who it's for, the ultimate user workflow. This is
direction-setting, not requirements gathering — you're not listing features
yet.

- **Skill:** `grill-with-docs`
- **Model:** Kimi K3 (or your best available reasoner) — this is a judgment
  gate, low volume, high cost of getting it wrong
- **Output:** `docs/product/vision.md` + any core-direction ADRs
- Close with `handoff`, update `AGENTS.md` if needed.

### 2. North Star Architecture (deliberately light)

The small set of decisions that are genuinely expensive to change later:
core domain vocabulary, primary data store, auth strategy, major service
boundaries. This is *not* full architecture — a page, not a spec. Its only
job is making sure Slice 1's decisions don't silently paint you into a
corner for Slice 3.

- **Skills:** `domain-modeling` + `codebase-design`, scoped explicitly to
  "what would be expensive to change later," nothing else
- **Model:** Kimi K3
- **Output:** `docs/architecture/north-star.md` + ADRs
- Close with `handoff`.

### 3. Slice Scoping / Backlog

Break the vision into thin, independent, user-facing slices. Identify Slice
1: the smallest path to real user value. Defer everything else to backlog —
don't spec later slices yet, just name and order them.

- **Skill:** `wayfinder` (charts the effort and settles the decisions) or
  `to-tickets` if you prefer its format
- **Model:** Kimi K3 for the slicing judgment calls; DeepSeek V4 Flash is
  fine if you're just formatting an already-clear breakdown
- **Output:** `docs/product/backlog.md` (ordered slice list) +
  `docs/product/slices/slice-01-scope.md` (user-facing scope only, no tech
  yet) for whichever slice is current
- Close with `handoff`.

---

## Part B — Per slice (loop this for every slice you pull off the backlog)

### 4. Slice Architecture

Scoped strictly to this slice: what tables, endpoints, or service boundaries
does *this* feature need? Read `north-star.md` and any prior slice
architecture docs first — extend them, don't restart from blank. This is
what prevents slice-to-slice contradictions without going back to
big-design-up-front.

- **Skills:** `wayfinder` + `domain-modeling` + `codebase-design`, scoped to
  the current slice
- **Model:** Kimi K3
- **Output:** `docs/architecture/slices/slice-0X-architecture.md`
- Close with `handoff`, update `AGENTS.md`.

### 5. Slice Program Design

Turn the slice's open questions into a formal spec: types, endpoints, call
stacks. Use `prototype` first if a UI or state model needs a sanity check
before you commit it to spec.

- **Skills:** `to-spec` (+ `prototype` if needed)
- **Model:** Kimi K3
- **Output:** `docs/program-design/slices/slice-0X-spec.md`
- Close with `handoff`.

### 6. Ticket Breakdown

Break the slice spec into buildable, session-sized tickets.

- **Skill:** `to-tickets`
- **Model:** DeepSeek V4 Flash (mechanical parsing) — but **review the
  output yourself** against the slice-quality checklist below before
  building anything off it
- **Output:** `docs/program-design/slices/slice-0X-tickets.md`

### 7. Build (one session per ticket)

- **Skills:** `implement` + `tdd` in the same session — don't split models
  between these two, they're one continuous loop, not two tasks
- **Model:** GLM 5.2
- Use `grill-me` (not `grill-with-docs`) for small in-session decisions that
  don't need to survive past this ticket
- Use `diagnosing-bugs` if something breaks unexpectedly
- Use pi-iso subagents for any exploration mid-build ("how does X currently
  work?") instead of doing it inline, to keep the build session's context
  clean
- Close each ticket's session with `handoff` if the next ticket depends on
  decisions made in this one; otherwise a plain close is fine

### 8. Review

Fresh session — not the one that built the code.

- **Skill:** `code-review`, checked against `docs/standards.md` and the
  slice spec from Step 5. Fowler smells and the harness-corpus rules tend to
  be standing `code-review` behavior regardless of whether this file is
  read — but the skill-embedded rules (`ts-test-*`/`ts-domain-*`/
  `ts-design-*`) and every `pj-*` rule genuinely depend on this file being
  read explicitly, since they don't exist anywhere the model would
  otherwise see them. Don't assume any of it is ambient — read the file.
- **Model:** DeepSeek V4 Pro by default — not GLM 5.2 (that's what wrote the
  code, so it can't check its own blind spots), and not Flash (that's the
  mechanical tier; Pro is the stronger sibling and has a specific reputation
  for bug-catching in review). Escalate to Kimi K3 only when a finding is
  ambiguous and needs deeper judgment, not as a default swap.

### 9. Slice close-out — Definition of Done

Before marking a slice complete and pulling the next one:

- [ ] All tickets for the slice pass their tests
- [ ] `code-review` approved (or issues resolved)
- [ ] `docs/architecture/slices/` and `docs/program-design/slices/` reflect
      what was actually built, not just what was planned
- [ ] `AGENTS.md` updated if any new doc paths were added
- [ ] `docs/product/backlog.md` updated — mark this slice done, confirm next
      slice is still the right one to pull (priorities may have shifted)
- [ ] Final `handoff` written for the slice as a whole

---

## Part C — Periodic / ongoing (not tied to a specific slice)

- **Architecture drift check, every 3–4 slices:** run
  `improve-codebase-architecture` to catch places where per-slice
  architecture decisions have quietly drifted apart. This is the recurring
  job that replaces doing all architecture up front.
- **Bug/issue triage, as reports come in:** `triage` sorts raw issues into
  actionable work — separate from `to-tickets`, which breaks down planned
  feature work.
- **Cross-cutting, used as needed rather than scheduled:**
  - `ask-matt` — unsure which skill fits the moment
  - `research` — need a cited answer from primary sources
  - `resolving-merge-conflicts` — as needed
  - `teach` — want to understand what the agent did, not just ship it
  - `writing-great-skills` — only when authoring/editing your own skills

---

## Session & context rules

- One session per gate. Always start at project-root, never inside a
  subfolder.
- Close every gate with `handoff` before starting the next.
- Use pi-iso subagents for exploration inside any session rather than
  working inline — isolated filesystem copy, reports back, keeps your main
  session's context clean.
- Treat OMP's built-in memory/mental-model auto-load as a backup, not the
  source of truth. `docs/` + `AGENTS.md` are what you actually control.

## Git

**One-time setup, if the repo doesn't exist yet:**

1. Write `.gitignore` *before* anything else — build output/dependencies for
   your stack, OS junk (`.DS_Store`) — so junk never enters history.
2. Audit `docs/external/` for real secret *values* before it's ever staged.
   It should hold variable names and pointers ("DB password is in the team
   password manager"), not actual credentials. If real values are in there,
   move them to a local `.env` and gitignore that instead.
3. `git init` at project-root — same root every session starts from.
4. `git status` and read the full list before `git add -A` — last chance to
   catch anything `.gitignore` missed.
5. If work already exists before git was set up, don't reconstruct fake
   granular history — one honest baseline commit ("baseline: workflow setup
   + slice 0X complete") is fine. Granularity starts from here forward.
6. Tag the current slice boundary (`git tag slice-0X-complete`) so it's
   addressable later.

**Ongoing rhythm — commit per durable output, not strictly per session:**

| Gate | Commit | Branch |
|---|---|---|
| 0–3 (setup through Backlog) | one commit each, as the doc lands | directly on `main` — not in-progress feature work |
| 4. Slice Architecture | commit the doc | **cut `slice-0X` here** |
| 5. Program Design | commit the doc | on `slice-0X` |
| 6. Ticket Breakdown | commit the doc | on `slice-0X` |
| 7. Build | **one commit per ticket, when its tests pass** | on `slice-0X` |
| 8. Review | commit only if changes were made responding to feedback | on `slice-0X` |
| 9. Close-out | merge `slice-0X` → `main`, then `git tag slice-0X-complete` | back on `main` |

Branch-per-slice matches the property slices are already designed to have —
independently shippable. If a slice's build goes sideways mid-way, that
branch can be abandoned or reworked without touching `main`'s last known-good
state. Docs-only gates (0–3) skip the branch since nothing there is
"in-progress" the way a slice build is.

Judgment call, not a hard rule: if a single ticket-build session has a
couple of natural sub-checkpoints (schema + migration, then endpoint), split
it into two commits instead of one. The target is one commit per working,
tested increment — usually one ticket, not always.

## Slice quality checklist

Apply this whenever `to-tickets` or `wayfinder` hands you a breakdown:

- **Vertical, not horizontal** — whole stack for one thin behavior, not one
  layer for everything
- **Independently shippable and testable** — provable without needing other
  unbuilt slices or tickets
- **Sized to fit one session** — if it risks hitting compaction mid-build,
  split it
- **Ordered by dependency**, not preference

## Model routing summary

| Use case | Model | Why |
|---|---|---|
| Product Vision, North Star Architecture, Slice Architecture, Slice Program Design | Kimi K3 | Low-volume, high-stakes judgment calls |
| Build loop (`implement` + `tdd`) | GLM 5.2 | Leads open models on long-horizon agentic coding |
| Ticket breakdown, general Q&A companion window, `research` | DeepSeek V4 Flash | Cheap, fast, mechanical/low-stakes |
| `code-review` (default) | DeepSeek V4 Pro | Not the build model, so it isn't checking its own blind spots; edges GLM on bug-catching benchmarks and has a specific real-world reputation for finding bugs others miss |
| `code-review` (escalation) | Kimi K3 | Only when a finding is ambiguous and needs deeper judgment — not a default swap, since it can overthink straightforward cases |

Once the model-roles schema in `config.yml` is confirmed, wire these
mappings directly instead of switching manually per session.

**Reducing switches:** the full sequence above is 4 model switches per
slice. If that's more overhead than it's worth, the one safe place to
collapse is folding Ticket Breakdown into the tail of the Slice Program
Design session, staying on Kimi K3 for both — you lose a little cost
efficiency but keep the two things that actually matter: judgment gates off
a weaker model, and Review independent of Build. That gets you to 3
switches: Kimi K3 (Architecture → Program Design → Ticket Breakdown) → GLM
5.2 (Build) → DeepSeek V4 Pro (Review, escalate to Kimi K3 only if needed).

## Reusable session prompts

Model for each: see the routing table above. Swap in slice/ticket numbers
each time.

**3. Slice Scoping / Backlog — one-off (before any backlog exists):**

```
Read docs/product/vision.md. Using wayfinder, break the vision into thin,
independent, user-facing slices. Identify the smallest one that delivers
real user value as Slice 1; order everything else by dependency, not
preference, and defer it to backlog — do not scope anything beyond Slice 1
yet.

Write docs/product/backlog.md (the ordered list) and
docs/product/slices/slice-01-scope.md (Slice 1's scope only).
```

**3. Slice Scoping / Backlog — recurring (pulling the next slice):**

```
Scope the next slice from the backlog.

Read, in order:
1. docs/product/vision.md
2. docs/product/backlog.md
3. docs/architecture/north-star.md (context only — this should not shape
   what the slice does, only confirm it doesn't conflict with an
   already-settled constraint)

Using wayfinder: before scoping anything, confirm the next slice on the
backlog is still the smallest path to real user value given what was
learned in prior slices — not just next in the original order. If priorities
should shift, say so explicitly and wait for me before proceeding.

Scope this slice in strictly user-facing terms — what the user can do, not
how it's built. No database, endpoint, or architecture language belongs in
this doc; that's the next gate's job.

Write docs/product/slices/slice-0X-scope.md, and update
docs/product/backlog.md to move this slice from backlog to in-progress.
```

*Why:* the recurring version is where close-out's "is the next slice still
right?" question (Step 9, item 5) actually gets acted on — without this
step re-asking it, that check is theater. Keeping scope strictly
user-facing enforces the separation the whole slice-first redesign depends
on; letting architecture language leak in here quietly collapses two gates
back into one. Reading `north-star.md` for context only, not to shape
scope, keeps architecture from leaking upstream into product thinking —
the opposite direction from the fix this workflow was built around.

**Orientation — run before Step 4 whenever returning to a project or
starting a new slice, not just the first time:**

```
I want to fully understand everything built so far before starting the
next Architecture gate.

Read, in order:
1. docs/product/vision.md
2. docs/architecture/north-star.md
3. Every file in docs/architecture/slices/ so far
4. Every file in docs/program-design/slices/ so far
5. docs/adr/ (all files)
6. docs/standards.md's pj-* section
7. The actual code in src/ — don't just summarize the docs, confirm what's
   really there matches what they claim

Using teach, explain to me as a beginner developer:
1. What's been built so far actually does, in plain language — from a
   user's perspective first, then how it works underneath.
2. The key decisions that were made and why (from the ADRs and
   north-star.md), not just what was decided — I need the reasoning, since
   that's what constrains what the next slice can do.
3. Where the docs and the actual code disagree, if anywhere — call this
   out explicitly rather than treating the docs as guaranteed accurate.
4. What "surface area" the next slice will actually be extending — which
   modules, types, and patterns are load-bearing for what comes next.

Don't tell me what the next slice should be yet — that's the Architecture
gate's job. Just make sure I understand what already exists well enough to
make that call myself when I get there.
```

*Why:* the read order — docs first, then real code — is what makes point 3
possible. Without checking the code, this session could confidently
narrate the plan rather than reality, the same failure mode the Review and
manual-test prompts already guard against. Point 4 is the actual payoff:
it directly primes what Step 4's "extend, don't restart" rule needs to
work — you can't extend something you don't understand the shape of. The
closing line keeps the boundary clean between understanding and deciding,
same move as triage's (a)/(b)/(c) split — without it, this session could
quietly start scoping the next slice itself, which isn't its job. Model:
Kimi K3 — a beginner-facing explanation that confidently oversimplifies a
real constraint is worse than none at all.

**4. Slice Architecture:**

```
Slice architecture for slice 0X: [one-line scope of what this slice does].

Read first, in order:
1. docs/architecture/north-star.md
2. The latest file in docs/architecture/slices/ (if a prior slice exists)
3. docs/product/slices/slice-0X-scope.md

Using wayfinder, domain-modeling, and codebase-design: decide only what
THIS slice needs — tables, endpoints, service boundaries — extending the
existing architecture rather than restarting it. Do not architect for
future slices still in the backlog.

If anything here feels genuinely expensive to change later (the kind of
thing north-star.md exists for), stop and flag it back to me instead of
deciding it unilaterally.

Write the result to docs/architecture/slices/slice-0X-architecture.md.
```

*Why:* the read order enforces "extend, don't restart" — without it,
nothing stops a blank-slate redesign each slice. The flag-back clause
guards a specific failure mode the north-star layer exists to prevent: an
expensive, hard-to-reverse decision getting made ad hoc inside a
slice-scoped session where nobody's watching for it.

**5. Slice Program Design:**

```
Turn slice 0X's architecture into a formal program design spec.

Read: docs/architecture/slices/slice-0X-architecture.md and
docs/product/slices/slice-0X-scope.md.

Using to-spec, resolve every open question into concrete types, endpoints,
and call stacks — nothing should be left ambiguous enough that two
engineers could implement it differently. If a UI or state model choice
needs a quick sanity check before it's locked into the spec, use prototype
first and tell me what you tried.

Write the result to docs/program-design/slices/slice-0X-spec.md.
```

*Why:* "nothing should be left ambiguous enough that two engineers could
implement it differently" gives a checkable bar for spec completeness
instead of leaving it to chance. The `prototype` clause only fires when
actually needed, rather than becoming a step always or never run.

**6. Ticket Breakdown:**

```
Break slice 0X's spec into buildable tickets.

Read: docs/program-design/slices/slice-0X-spec.md.

Using to-tickets: propose an ordered list of tickets, each independently
shippable and testable, sized to fit comfortably in one build session. For
each ticket, name what it depends on so ordering reflects real
dependencies, not just spec order. Flag any boundary decision you're unsure
about rather than silently picking one.

Write the result to docs/program-design/slices/slice-0X-tickets.md, and
summarize the list back to me before I start building.
```

*Why:* bakes the slice quality checklist (vertical, testable,
session-sized, dependency-ordered) directly into the request rather than
trusting the skill's defaults — which shouldn't be taken on faith.
Requiring a summary before build surfaces judgment calls you'd otherwise
never see baked into an apparently-complete list.

**Launching Step 7 (Build) on a specific model:**

```
omp --model glm-5.2
```

Run from project-root. The flag fuzzy-matches your model catalog, so it
doesn't need to be exact. Note: using `--model` directly resets the session
to OMP's "default" role internally rather than preserving a named role, even
if the model is assigned to a role in `config.yml` — cosmetic quirk, not a
blocker.

**7. Build, once AGENTS.md carries the standing build-session rules from
Step 0:**

```
Start ticket [N] from docs/program-design/slices/slice-0X-tickets.md.

Read, in this order, before writing any code:
1. That ticket's entry
2. docs/program-design/slices/slice-0X-spec.md
3. docs/architecture/north-star.md
4. docs/architecture/slices/slice-0X-architecture.md

Implement it test-first using implement + tdd. Before we close this
session, tell me if anything you decided here matters for later tickets in
this slice — if so, I'll want a handoff.
```

*Why:* the last line puts the handoff-or-not judgment call at the point
where the agent actually knows the answer, rather than you guessing
upfront.

**8. Review:**

```
Fresh review of slice 0X's build (branch slice-0X, all tickets complete).

Read, in order: docs/standards.md, docs/program-design/slices/slice-0X-spec.md.

Using code-review, evaluate the diff on two separate axes, reported
separately: (1) Standards — does the diff hold up against docs/standards.md,
including the pj-* section; (2) Spec — does it implement what
slice-0X-spec.md actually asked for. A change can pass one axis and fail
the other; don't merge them into one verdict.

For anything flagged, cite the specific rule or spec line it violates, not
just a general impression. If a finding is ambiguous rather than a clear
match against a documented rule, say so explicitly instead of guessing.
```

*Why:* the two-axis instruction is your own `ts-code-review-two-axis` rule
made explicit rather than assumed automatic. Citing the specific rule or
spec line is only possible because `docs/standards.md` exists — before that
file, this instruction had nothing to point at. "Say so explicitly instead
of guessing" is what should trigger the Kimi K3 escalation from the
routing table above — without asking for it, there's no way to tell a
confident wrong answer from a genuinely settled one.

**Addendum — manual test walkthrough:** runs naturally in the same Review
session, since it already reads the diff and spec fresh. Only split it into
its own session if you specifically want to test before Review happens.

```
Read the diff for slice 0X (branch slice-0X) and
docs/program-design/slices/slice-0X-spec.md.

Write a manual test walkthrough: concrete steps a human can follow in the
browser/app to verify this slice does what the spec says, based only on
what's in the diff — not anything discussed while it was built. Number the
steps, and for each one state what I should observe as the pass condition.

If the spec calls for something you can't find a way to manually verify
from the diff, say so explicitly instead of writing a step around it.
```

*Why:* running this fresh, not in the session that built the code, forces
it to describe only what's actually in the diff rather than what was
intended or discussed while building — the same reasoning behind running
Review on a different model than Build. The last line surfaces a possibly
incomplete implementation (something the spec asked for with no traceable
path in the diff) instead of papering over the gap with a plausible-looking
step.

**9. Slice close-out — Definition of Done:**

```
Close out slice 0X. Confirm every item below explicitly — don't just say
"done":

1. All tickets pass their tests — name the command you ran and confirm it
   was clean.
2. code-review is approved, or every issue it raised has a linked
   resolution.
3. docs/architecture/slices/slice-0X-architecture.md and
   docs/program-design/slices/slice-0X-spec.md reflect what was actually
   built — if anything changed during implementation, update these docs
   now rather than leaving them describing the original plan.
4. Update AGENTS.md if any new doc paths were added this slice.
5. Update docs/product/backlog.md: mark this slice done, and tell me
   whether the next backlog slice is still the right one to pull, or if
   anything learned this slice changes that.

Write a final handoff for the slice once all five are confirmed.
```

*Why:* converts "done" from a self-report into something with evidence
attached — naming the command run closes off an easy way to claim a
checklist item without it being true. Item 3 exists because slice 1 ran
into exactly this: doc drift caught during close-out — this turns that
one-off lesson into a standing habit instead of something to remember
manually.

**Part C — Architecture drift check (every 3–4 slices):**

```
Run an architecture drift check across the last 3-4 slices.

Read: docs/architecture/north-star.md and every file in
docs/architecture/slices/ from those slices.

Using improve-codebase-architecture: compare what was actually decided
per-slice against what's actually in the code today. Flag:
1. Any place two slices' decisions quietly contradict each other (e.g. two
   different patterns solving the same kind of problem).
2. Any module that's grown complex enough to reconsider against
   ts-design-deep-modules in docs/standards.md.
3. Anywhere the code has drifted from its slice architecture doc without
   the doc being updated to match.

Report findings only — don't refactor anything yet. I'll decide what's
worth acting on.
```

*Why:* this is the direct answer to the risk the north-star layer was
built to guard against — that one slice's decisions and a later slice's
needs could quietly contradict each other without anyone noticing.
"Report only, don't refactor" keeps this diagnostic, not corrective — a
human decides whether a fix is worth the disruption now or belongs on the
backlog. Model: Kimi K3 — cross-referencing multiple docs and code for
real contradictions is judgment, not mechanical work.

**Part C — Understanding drift findings (companion to the drift check, for
learning to judge fix vs. no-fix yourself):**

```
I'm a beginner developer and want to understand these drift check findings
well enough to decide myself what's worth fixing — not be told what to do:

[paste the drift check's findings]

For each one, using teach, explain in plain language with no unexplained
jargon:
1. What's actually happening in the code, concretely — not "state is
   inconsistent," but which specific pattern differs from which.
2. Why the original convention exists in the first place — what problem it
   was solving when it was written.
3. What could realistically go wrong if this is left as-is — a concrete
   scenario, not a vague "technical debt" warning.
4. What it would cost to fix — roughly how invasive: a fast, contained
   change, or something that ripples across several files.

Don't tell me what to decide. Give me enough to weigh the cost of fixing
against the cost of leaving it myself. If a finding depends on something I
haven't learned yet, teach that first before explaining the finding.
```

*Why:* point 1 forces concreteness — a phrase like "state is inconsistent"
sounds like an explanation but teaches nothing; naming the actual pattern
is what's learnable. Point 2 matters more than it looks — understanding
why a convention exists is what lets you eventually judge a finding you've
never seen before yourself, instead of memorizing today's findings as
fixed rules. "Don't tell me what to decide" is the load-bearing line: it's
easy for an explanation to quietly collapse into a recommendation, which
would just outsource the judgment instead of building it. The last line
makes this reusable across drift checks rather than a one-off, since
`teach` is designed to build understanding across sessions. Model: Kimi
K3 — a beginner-facing explanation that oversimplifies a real tradeoff
into something wrong is worse than no explanation, so this is worth the
stronger reasoner over the cheap tier.

**Part C — Bug/issue triage (as reports come in):**

```
Triage this incoming report: [paste description].

Read: docs/product/backlog.md, the relevant slice's spec and architecture
docs, and docs/standards.md's pj-* section if this might contradict a
documented invariant.

Using triage: determine whether this is (a) a genuine bug against the
spec, (b) a new feature request that belongs on the backlog, not a bug, or
(c) expected behavior being misunderstood. For (a), scope it to a
ticket-sized fix. For (b), don't build anything — draft a backlog entry and
stop.

Tell me which of the three this is and why before doing anything else.
```

*Why:* without the (a)/(b)/(c) split, "triage" risks quietly becoming
"start building whatever came in" — which breaks the gate model, since new
feature work belongs in Slice Scoping, not a bug-fix session. Naming the
category first is what stops scope creep from disguising itself as a fix.

## Notes on tooling decisions

- **Not using herdr** — using pi-iso for isolated exploration/subagent work
  instead. Herdr is a separate persistent multiplexed session with no
  automatic result relay back to a main session; pi-iso subagents return a
  result inline, which fits this workflow's session-per-gate model better.
- **Not installing the 4-gate skill (Dex Horthy's Software Factory
  Playbook)** — the gate sequence above already covers the same ground
  (interview-and-record, decision-mapping, formal spec, ticketed slices,
  test-first build, spec-aware review) with finer-grained skills already
  installed. Revisit only if gates start getting skipped without real
  sign-off in practice — the 4-gate skill's real edge is hard blocking
  between stages, which these skills don't enforce on their own. If
  installed later, scope it per-slice, not per-product, to match this
  workflow's structure.
