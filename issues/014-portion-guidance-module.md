## Parent PRD

`issues/prd.md`

## What to build

The Portion Guidance module: a pure function with no I/O, no UI dependency. Given a recipe's per-serving macros and a user's daily targets, computes how one serving compares to those targets and suggests a portion fraction.

Per the PRD's "Nutrition & portion guidance" section and the "Portion Guidance" module spec: `computePortionGuidance(recipe, userTargets) → { perServingMacros, percentOfDailyTargets, suggestedPortionFraction }`.

This slice is pure logic — it is verified via its test suite rather than a UI, per the PRD's testing decisions.

## Acceptance criteria

- [ ] Given a recipe's servings + summed ingredient macros and a user's daily targets, `computePortionGuidance` returns correct per-serving macros, percent-of-daily-target figures, and a suggested portion fraction.
- [ ] Handles missing/zero user targets without erroring (returns a result indicating guidance isn't available, not a crash or nonsense number).
- [ ] Handles edge cases: very small/large serving counts, a recipe with incomplete ingredient macro data.
- [ ] Full unit test coverage per the PRD's testing decisions: standard comparisons, zero/missing targets, and portion-fraction suggestions across a range of serving sizes.

## Blocked by

None - can start immediately.

## User stories addressed

- User story 32
- User story 33
