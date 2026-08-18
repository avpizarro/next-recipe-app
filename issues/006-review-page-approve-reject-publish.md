## Parent PRD

`issues/prd.md`

## What to build

A new in-app `/review` page, restricted to allowlisted admin emails, listing all `pending` recipes. A reviewer can approve (flips `status` to `"published"`) or reject (flips `status` to `"rejected"`) each one. The recipe's submitter-chosen main image is shown for context but is not editable here (per PRD: the submitter's choice at submission time is final).

This slice also updates the public homepage/recipe-listing query to only show `status == "published"` recipes.

Per the PRD's "In-app review/moderation" and "Auth & access control" sections.

## Acceptance criteria

- [ ] Visiting `/review` while signed in as a non-admin (or signed out) is blocked.
- [ ] Visiting `/review` as an allowlisted admin shows all pending recipes, including their submitter-chosen main image.
- [ ] Approving a recipe sets `status: "published"` and it now appears on the public homepage/recipe listing.
- [ ] Rejecting a recipe sets `status: "rejected"` and it never appears on the public homepage/recipe listing.
- [ ] Existing recipes that predate the `status` field (no `status` value at all) continue to appear on the public homepage/recipe listing — i.e. missing `status` is treated as published, not filtered out.

## Blocked by

- Blocked by `issues/001-auth-foundation.md`
- Blocked by `issues/002-submit-recipe-from-url.md`

## User stories addressed

- User story 6
- User story 7
- User story 13
- User story 14
