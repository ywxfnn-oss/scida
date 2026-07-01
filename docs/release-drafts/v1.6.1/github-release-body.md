# Scida v1.6.1

## Summary

Scida `v1.6.1` is a focused polish release that tightens the workflow surfaces added after `v1.4`. It keeps the product local-first and preserves analysis/export boundaries while making database, entry, structured-data, and analysis review behavior more consistent and easier to use.

## Highlights

- clearer database workspace hierarchy and interaction grouping
- controlled single-field 24-hour test-time input using `YYYY-MM-DD HH:mm`
- simpler one-block-one-curve structured-data import flow
- more compact structured-data review in database detail
- better structured-series naming consistency across Step 2, database detail, and Analysis

## Important Fixes

- completeness guidance now catches partially filled scalar rows more reliably
- final save no longer clears local draft state if persisted draft deletion fails
- leaving create flow now respects draft handling instead of bypassing it
- copied-draft wording now matches the actual cleared content

## Boundaries Kept

- analysis remains read-only
- export semantics remain unchanged
- no schema change was introduced in this release line
- no cloud, collaboration, or AI features were added

## Binary Trust Note

Public binaries should still be described accurately at release time.

Use one of the following statements in the final release, depending on the actual CI outcome:

### If signed and notarized

This release includes validated signed and notarized macOS artifacts.

### If not fully signed/notarized

Current binaries should still be treated conservatively unless signing/notarization is explicitly confirmed for this release.

## Full Notes

See:

- `CHANGELOG.md`
- `docs/release-notes/v1.6.1.md`
