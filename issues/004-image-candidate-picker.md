## Parent PRD

`issues/prd.md`

## What to build

Extend the Recipe Extractor to also gather multiple image candidates from the source page (JSON-LD `image` field, `og:image` meta tag, and a scan of `<img>` tags), and add an image-picker step to the submission UI so the submitter chooses one before the recipe is created. Replaces the "automatically use the first image candidate" behavior from `issues/002-submit-recipe-from-url.md`.

Per the PRD's "Image selection" and "Recipe extraction pipeline" sections: candidates are shown as thumbnails pointing at the original external URLs (nothing uploaded to Sanity yet); only the chosen image is uploaded to Sanity as an asset once picked.

## Acceptance criteria

- [ ] After submitting a URL, the submitter sees thumbnails of multiple image candidates scraped from the source page (when more than one exists).
- [ ] The submitter must pick one image before the recipe submission completes.
- [ ] Only the chosen image is uploaded to Sanity as an asset; no other candidate is uploaded anywhere.
- [ ] If a page has only one discoverable image, the flow still works (no picker friction required for a single candidate).
- [ ] Image-candidate scanning (JSON-LD image field + og:image + `<img>` scan) is unit tested against fixture HTML.

## Blocked by

- Blocked by `issues/002-submit-recipe-from-url.md`

## User stories addressed

- User story 2
