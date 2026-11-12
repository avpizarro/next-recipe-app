## Parent PRD

`issues/prd.md`

## What to build

Extend the public recipe detail page to show per-serving nutrition facts (calories/protein/carbs/fat), computed from the recipe's servings and ingredient macros. No login or saved profile is required.

Personalized comparisons and suggested portions are deferred with issues 013 and 014. Keep this issue focused on public nutrition facts; do not introduce user accounts or profile prompts.

Per the PRD's "Nutrition & portion guidance" section.

## Acceptance criteria

- [ ] Any published recipe with ingredient macro data shows per-serving nutrition facts on its detail page.
- [ ] Anonymous visitors see per-serving facts without a login or profile prompt.
- [ ] A recipe with incomplete ingredient macro data (e.g. an ingredient created before macros existed) degrades gracefully rather than showing incorrect totals.

## Blocked by

- Blocked by `issues/009-nutrition-lookup-review-confirmation.md`

## User stories addressed

- User story 31
- User story 34

## Deferred follow-up

User stories 32 and 33 (target comparisons and suggested portions) depend on issues 013 and 014 and are not part of the active acceptance criteria. If nutrition calculation needs unit conversion, implement or reactivate the required conversion subset explicitly; never treat volume as mass or report incomplete totals as complete.
