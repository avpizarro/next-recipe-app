## Parent PRD

`issues/prd.md`

## What to build

Extend the `/review` page (`issues/006-review-page-approve-reject-publish.md`) to show, for each ingredient line on a pending recipe, the suggested match produced by the Ingredient Matcher (`issues/005-ingredient-matcher-dedup.md`). The reviewer can accept the suggestion, pick a different existing ingredient instead, or confirm creating a new ingredient (with the naming convention enforced/validated inline: singular, title-case, no brand, no prep-state). Approving the recipe finalizes these resolved ingredient references — a recipe cannot be approved while any ingredient line is unresolved.

Per the PRD's "Ingredient matching & naming" section.

## Acceptance criteria

- [ ] The review page shows each ingredient line's suggested match (or "no match — create new") alongside the raw parsed text.
- [ ] The reviewer can override a suggested match by picking a different existing ingredient from a search/list.
- [ ] The reviewer can confirm creating a new ingredient; the name field rejects/flags names that violate the naming convention (plural, non-title-case, brand names, prep-state words) before it can be confirmed.
- [ ] Attempting to approve a recipe with any unresolved ingredient line is blocked, with a clear indication of which line(s) are unresolved.
- [ ] After approval, the recipe's `ingredient[]` references reflect exactly what the reviewer confirmed (matched existing docs or newly created ones).

## Blocked by

- Blocked by `issues/005-ingredient-matcher-dedup.md`
- Blocked by `issues/006-review-page-approve-reject-publish.md`

## User stories addressed

- User story 9
- User story 10
