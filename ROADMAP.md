# Roadmap

## Near-Term Priorities

- Continue low-risk renderer splits:
  - DOM/query helpers
  - low-coupling state helpers
  - reusable view fragments where behavior does not change
- Continue low-risk main-process cleanup without changing behavior:
  - keep reducing helper density in `src/main.ts`
  - leave delete logic, migration execution, and update rollback flows intact until separately planned
- Keep core docs current with the extracted modules and recently added safety features.

## Medium-Term Priorities

- Add broader integrity and safety tooling around managed files while staying read-only by default first.
- Improve duplicate detection only if needed, using conservative and explainable signals.
- Introduce more focused validation and smoke-test coverage around startup, save/update, export, and storage workflows.
- Revisit main/renderer structure after the low-risk splits settle and the module boundaries are clearer.

## Intentionally Deferred For Now

- Schema changes or migration redesign for duplicate prevention
- Hard-blocking duplicate prevention rules
- Delete-flow redesign or automatic cleanup actions for orphan files
- Changes to `experiment:update` file mutation and rollback behavior
- Export workflow redesign
- Large UI redesigns or new frameworks
