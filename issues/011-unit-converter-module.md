## Parent PRD

`issues/prd.md`

## What to build

The Unit Converter module: pure functions with no I/O, no UI dependency. Implements generic dimensional conversion (cup/tbsp/tsp/oz/g/kg/mg/mL/L) plus density-based mass↔volume bridging using a supplied `densityGPerMl`. Canonical output units are grams for solids and millilitres for liquids.

Per the PRD's "Unit conversion & aggregation" section and the "Unit Converter" module spec: `convertToCanonical(quantity, unit, densityGPerMl?) → { value, unit }` and `aggregateIngredientLines(lines[]) → aggregatedLines[]`. Per the PRD's "Further Notes," `@dailykit/food-units-converter` may be used as a reference/dependency for the mass↔volume arithmetic step, but does not cover cup/tbsp/tsp and ships no density data itself — a separate dimensional-conversion library (or equivalent hand-rolled logic) is needed for that step.

This slice is pure logic — it is verified via its test suite rather than a UI, per the PRD's testing decisions.

## Acceptance criteria

- [ ] `convertToCanonical` correctly converts between units of the same dimension (e.g. cups → mL, oz → g).
- [ ] `convertToCanonical` correctly bridges volume → mass (and vice versa) when given a `densityGPerMl`.
- [ ] `convertToCanonical` returns a clear "cannot convert" result (not a silently wrong number) when a volume↔mass bridge is needed but no density is supplied.
- [ ] `aggregateIngredientLines` correctly sums multiple lines referring to the same ingredient once all are expressed in the same canonical unit.
- [ ] `aggregateIngredientLines` flags (rather than drops or guesses) lines it could not convert/aggregate due to missing density.
- [ ] Full unit test coverage per the PRD's testing decisions: same-unit summing, cross-unit-same-dimension conversion, density-based bridging with known densities, and the missing-density flagged case.

## Blocked by

None - can start immediately.

## User stories addressed

- User story 19
- User story 20
- User story 21
