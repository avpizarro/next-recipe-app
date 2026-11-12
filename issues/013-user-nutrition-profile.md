## Parent PRD

`issues/prd.md`

## Status

Deferred. Personal nutrition profiles require ordinary user accounts, which are deferred. The specification below is retained for future planning and is not part of the active implementation.

## What to build

A new user-profile document (daily calorie/macro targets: `dailyCalories`, `dailyProtein`, `dailyCarbs`, `dailyFat`), keyed to the signed-in user's session, with a simple profile page UI to enter and edit them.

Per the PRD's "Nutrition & portion guidance" and schema-changes sections. Explicitly no BMR/TDEE formula and no external fitness-service integration — targets are always manually entered, per the PRD's "Out of Scope" section.

## Acceptance criteria

- [ ] A signed-in user can enter daily calorie, protein, carbs, and fat targets on a profile page.
- [ ] The entered targets persist across sessions (reload, sign out/in) for that user.
- [ ] A signed-in user can edit previously saved targets.
- [ ] One user's targets are never visible or editable by another user.
- [ ] A user with no saved targets sees a clear empty/prompt state rather than an error.

## Blocked by

- Blocked by `issues/001-auth-foundation.md`

## User stories addressed

- User story 30
