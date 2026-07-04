# Scida v1.6.5 Test Type Consolidation Plan

## Terminology Note

This plan uses user-facing product terminology:

- `Record Info` instead of `Step 1`
- `Test Data` instead of `Step 2`
- `Test Type` instead of `Scientific Family` / `Test Project`
- `Curve/Spectrum Data` instead of `Structured Curve` / `Structured Data Block`
- `Provenance Elements` instead of `Dictionary Library`

## 1. Goal

Allow users to manage first-level Test Types locally and let those Test Types drive Record Info suggestions plus Test Data condition / metric / curve-template recommendations.

## 2. Correct Hierarchy

Level 1:
- test type

Level 2:
- experimental conditions
- result metrics
- structured curves

Level 3:
- concrete template item

## 3. Ownership Rules

- Record Info `testProject` remains the internal stored field for record-level Test Type context
- Test Data uses that context across all three sections
- structured curve blocks no longer choose an independent Test Type owner
- `purposeType` remains internal for curve compatibility, import memory, and analysis/export continuity
- Provenance Elements `testProject` management is deprecated in favor of Test Template Library Test Types

## 4. Required v1.6.5 Behaviors

### Settings Test Template Library

- list built-in and user Test Types together
- create a new user Test Type
- edit display name, aliases, description, enabled state
- allow built-in Test Type local override and reset-to-built-in
- allow deleting user Test Types

### Deletion Safety

When deleting a user Test Type:
- delete the user Test Type
- delete user scalar templates under that Test Type
- delete user curve templates under that Test Type
- delete user import parsing templates under that Test Type
- clear exact import-memory references to deleted curve template ids
- never delete saved records

### Record Info

- enabled Test Types appear in Record Info suggestions
- choosing a Test Type still writes plain text into `testProject`
- manual text entry remains allowed
- strict exact/alias/id matching determines whether Test Data recommendations activate

### Test Data

- condition template recommendations use the Record Info Test Type
- metric template recommendations use the Record Info Test Type
- structured curve template selector uses the Record Info Test Type
- custom curve remains available

### Detail Page

- record detail stays read-only
- curve/spectrum items show Record Info Test Type ownership context instead of an editable family selector
- internal `purposeType` may still appear as secondary curve-data typing when useful, but not as the main ownership concept

## 5. Compatibility Rules

- keep existing records readable
- keep existing structured import memory valid
- keep existing built-in Test Types and templates valid
- keep legacy dictionary `testProject` entries readable and safely bridged into the Test Template Library
- do not silently rewrite old block `purposeType`

## 6. Risks

- Test Type deletion can orphan child-template references if cascade is incomplete
- loose matching can surface the wrong Test Data recommendation set
- built-in Test Type overrides must not mutate source-controlled defaults
- custom Test Type curves still need a safe internal `purposeType`

## 7. Validation Focus

- Test Type create / edit / disable / delete
- Record Info suggestion integration
- Test Data recommendation alignment
- no export / analysis regression
