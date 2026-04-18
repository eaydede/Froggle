# Client

React + Vite + Tailwind v4 workspace. Rules in this file scope to `client/` and
extend the project root `CLAUDE.md`. When a root rule and a client rule
disagree, the client rule wins within this workspace.

## React

- **List keys are stable identifiers, not array indices.** `key={index}` is
  only acceptable when the list is fully static and never reorders, filters,
  or grows. If a list can be sorted, filtered, spliced, or animated in place,
  use a stable domain key (id, unique string). Index keys silently misassign
  DOM nodes on reorder, which corrupts animations, transitions, and
  uncontrolled child state.
