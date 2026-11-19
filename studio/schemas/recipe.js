const ingredientEntry = {
    type: "object",
    fields: [
        { name: "parsedName", title: "Parsed ingredient name", type: "string", readOnly: true },
        { name: "normalizedName", title: "Proposed ingredient name", type: "string", readOnly: true },
        { name: "matchConfidence", title: "Match similarity", type: "number", readOnly: true },
        { name: "suggestedIngredient", title: "Suggested ingredient (requires review)", type: "reference", to: [{ type: "ingredient" }], readOnly: true },
        { name: "resolutionStatus", title: "Resolution status", type: "string", options: { list: ["unresolved", "resolved"] }, readOnly: true },
        { name: "rawText", title: "Original ingredient line", type: "string", readOnly: true },
        {
            name: "ingredient",
            title: "Ingredient",
            type: "reference",
            to: [{ type: "ingredient" }],
        },
        {
            name: "wholeNumber",
            title: "whole Number",
            type: "number"
        },
        {
            name: "fraction",
            title: "Fraction",
            type: "string",
            options: {
                list: ["1/2", "1/3", "1/4", "3/4", "2/3"]
            }
        },
        {
            name: "unit",
            title: "Unit",
            type: "string",
            options: {
                list: ["grams", "cup(s)", "tbsp", "tsp", "ounce(s)"]
            }
        }
    ],
    preview: {
        select: {
            title: "ingredient.name",
            proposedName: "normalizedName",
            suggestedName: "suggestedIngredient.name",
            parsedName: "parsedName",
            rawText: "rawText",
            media: "ingredient.image",
            wholeNumber: "wholeNumber",
            fraction: "fraction",
            unit: "unit"
        },
        prepare({
            title,
            proposedName,
            suggestedName,
            parsedName,
            rawText,
            media,
            wholeNumber = "(No whole number set)",
            fraction = "(No fraction set)",
            unit = "(No unit set)",
        }) {
            return {
                // Pending imports have no final reference until review confirms it.
                title: [title, proposedName, suggestedName, parsedName, rawText]
                    .find((value) => typeof value === "string" && value.trim()) || "Ingredient needs a name",
                subtitle: `${wholeNumber} ${fraction} ${unit}`,
                media
            }
        }
    }
};

export default {
    name: "recipe",
    title: "Recipe",
    type: "document",
    fields: [
        { name: "status", title: "Status", type: "string", options: { list: ["pending", "published", "rejected"] }, validation: Rule => Rule.required() },
        { name: "servings", title: "Servings", type: "number", validation: Rule => Rule.positive() },
        { name: "submittedBy", title: "Submitted by (admin ID)", type: "string", readOnly: true },
        { name: "sourceFormat", title: "Source format", type: "string", options: { list: ["structured", "llm"] }, readOnly: true },
        {
            name: "name",
            title: "Recipe Name",
            type: "string",
        },
        {
            name: "slug",
            title: "Slug",
            type: "slug",
            options: {
                source: "name",
                maxLenght: 96,
            },
        },
        {
            name: "url",
            title: "Url",
            type: "string",
        },
        {
            name: "chef",
            title: "Chef",
            type: "reference",
            to: {
                type: "chef"
            },
        },
        {
            name: "mainImage",
            title: "Recipe Main Image",
            type: "image",
            options: {
                hotspot: true
            }
        },
        {
            name: "ingredientGroups", title: "Ingredient groups", type: "array",
            of: [{
                name: "ingredientGroup", type: "object",
                fields: [
                    { name: "title", title: "Group heading (leave blank for untitled ingredients)", type: "string" },
                    { name: "ingredients", title: "Ingredients", type: "array", of: [ingredientEntry] },
                ],
                preview: { select: { title: "title" }, prepare: ({ title }) => ({ title: title || "Ingredients" }) },
            }],
        },
        {
            name: "ingredient", title: "Ingredients (legacy flat list)", type: "array",
            of: [ingredientEntry],
            hidden: ({ document }) => Boolean(document?.ingredientGroups?.length),
        },
        {
            name: "instructions",
            title: "Instructions",
            type: "array",
            of: [{ type: "block" }
            ],
        },
        {
            name: "likes",
            title: "Likes",
            type: "number",
        },
    ],
    initialValue: {
        status: "pending",
        likes: 0,
    },
}
