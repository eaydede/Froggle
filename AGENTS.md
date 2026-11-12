## Purpose

Write straightforward code that is easy to understand today and establishes sensible patterns for future changes. Prefer readability, semantic naming, clear ownership, consistency, and simplicity. Additional structure should earn its place through a useful responsibility boundary.

## Functions and names

Use high-level functions that express a clear sequence of meaningful operations. Extract helpers for meaningful complexity, distinct responsibility, or genuine reuse; keep trivial filters and sorts inline. Choose concise names accurate in context: parseName inside a project module can be clearer than parseProjectName. Names must reflect all responsibilities; a filter hook that also owns sorting and URL synchronization needs a broader name. Do not optimize function count, line count, or abstraction count.

## Feature ownership and reuse

Organize by capabilities such as projects/list, projects/create, projects/edit, and projects/archive. Colocate each capability’s UI, state, and backend files instead of splitting a feature into components/hooks/services buckets. Allow independent features to own similar components until stable shared responsibilities emerge. Incidental similarity is not a contract; some duplication avoids coupling. Three uses are a signal to assess reuse, not an extraction rule. Established shared business invariants should have a single source of truth. Prefer feature-owned repositories until genuinely shared persistence responsibility emerges.

## Backend boundaries

Keep API, service, and repository responsibilities distinct even in small backend features. The API owns transport, input shape/types, auth context, and response mapping. Services own business rules, domain invariants, and workflow. Repositories own persistence and translate database results. Use simple functions and modules; do not add interfaces, factories, dependency-injection machinery, or more layers without a concrete need.

## Validation and errors

Validate at the responsible boundary: request structure at the API; business invariants in services/domain; persistence and integrity constraints in repositories/database. Share schemas only for a stable shared validation contract. Translate expected failures into meaningful application errors when useful, preserve causes, and keep unexpected failures traceable through centralized handling.

## React responsibilities

Extract child components for meaningful independently understandable UI responsibilities, and hooks when stateful behavior is a responsibility of its own. Small tightly coupled components may stay in one file. A few straightforward state lines do not justify a hook. Consider the precedent a component sets for future additions.

## Design system

Use the established design system consistently: semantic tokens for colors, spacing, typography, radii, and recurring values; shared buttons, inputs, badges, dialogs, and other UI primitives. Feature-specific styling may be justified, but do not invent competing conventions. Improve nearby inconsistencies only when worthwhile; keep unrelated styling cleanup separate.

## Workflow and bug fixes

Inspect existing conventions, infer reasonable decisions, implement within scope, and verify independently. Ask only when unresolved consequential ambiguity prevents a responsible decision. Do not invent product features. Report meaningful assumptions, decisions, executed verification, and remaining limitations. Never claim unexecuted checks passed. For bugs, identify the cause, make the smallest correct behavioral fix, add a regression test, and consider optional refactoring separately. Keep functional changes and optional cleanup logically distinct. Do not create commits without authorization.

## Architectural changes

For explicitly requested rewrites or architectural changes, establish the target responsibilities, dependency direction, and compatibility requirements before implementation. Follow the agreed target architecture where it conflicts with existing conventions. Choose a coherent migration boundary and update affected callers, tests, and documentation within that scope. Preserve existing behavior unless changes are requested. Prefer complete, verifiable slices; avoid leaving competing implementations or temporary compatibility layers without a clear purpose. Apply the new pattern consistently within the migrated area and document remaining migration work.

## Verification

Use focused unit tests and meaningful integration tests for critical paths, business rules, authorization, important failures, integrity, and regressions. Prefer confidence over test count, redundant coverage, or implementation-mirroring tests.
