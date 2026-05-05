import { defineField, defineType } from "sanity";

/* =============================================================================
 * basicHero — Sanity schema for the BasicHero module.
 *
 * Paired one-to-one with src/components/modules/BasicHero.tsx. The fields
 * below mirror the React component's `BasicHeroData` interface. Any change
 * to one must propagate to the other.
 * ========================================================================== */

export const basicHero = defineType({
  name: "basicHero",
  title: "Basic Hero",
  type: "object",
  fields: [
    defineField({
      name: "eyebrow",
      title: "Eyebrow",
      type: "string",
      description:
        "Optional small uppercase label above the headline (e.g. 'Case Study').",
    }),
    defineField({
      name: "headline",
      title: "Headline",
      type: "string",
      description:
        "The primary focus. Punchy. Renders large display-heavy uppercase.",
      validation: (r) => r.required().min(1).max(140),
    }),
    defineField({
      name: "headlineAccent",
      title: "Headline Accent",
      type: "string",
      description:
        "Optional trailing string appended after the headline, rendered in --primary (red). Use for version numbers, years, or a short accent phrase.",
      validation: (r) => r.max(40),
    }),
    defineField({
      name: "chips",
      title: "Chips",
      type: "array",
      description:
        "Secondary focus — a handful of topic tags. 2–6 works best.",
      of: [{ type: "string" }],
      validation: (r) => r.max(8),
    }),
  ],
  preview: {
    select: { headline: "headline", eyebrow: "eyebrow" },
    prepare: ({ headline, eyebrow }) => ({
      title: headline || "Untitled hero",
      subtitle: eyebrow ? `Eyebrow: ${eyebrow}` : "Basic Hero",
    }),
  },
});
