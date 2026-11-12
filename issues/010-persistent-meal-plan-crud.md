## Parent PRD

`issues/prd.md`

## Status

Deferred. Personal meal plans require ordinary user accounts, which are outside the current admin-only login scope. The specification below is retained for future planning and is not part of the active implementation.

## What to build

A new `mealPlan` Sanity document type (reference to the owning user + array of recipe references), with API routes and a minimal UI so a signed-in user can add a published recipe to their meal plan, remove an individual recipe from it, view their current plan, and delete the whole plan. Persists across sessions/devices.

Per the PRD's "Meal plan & shopping list" and schema-changes sections.

## Acceptance criteria

- [ ] A signed-in user can add a published recipe to their meal plan from the recipe listing or detail page.
- [ ] A signed-in user can view their current meal plan (list of recipes they've added).
- [ ] A signed-in user can remove a single recipe from their meal plan without affecting the rest.
- [ ] A signed-in user can delete their entire meal plan.
- [ ] The meal plan persists: adding a recipe, signing out, signing back in (or reloading) still shows it.
- [ ] One user's meal plan is never visible or editable by another user.

## Blocked by

- Blocked by `issues/001-auth-foundation.md`
- Blocked by `issues/006-review-page-approve-reject-publish.md`

## User stories addressed

- User story 15
- User story 16
- User story 17
