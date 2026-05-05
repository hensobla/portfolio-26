import type { ReactNode } from "react";
import AttributionRow from "@/components/ui/AttributionRow";
import Eyebrow from "@/components/ui/Eyebrow";
import MetricCard from "@/components/ui/MetricCard";
import SectionNumber from "@/components/ui/SectionNumber";
import Tag from "@/components/ui/Tag";
import BasicHero from "@/components/modules/BasicHero";

/* =============================================================================
 * Sandbox manifest — single source of truth for what's previewable in /library.
 *
 * Per sandbox.md:
 *   - The library index reads `sandboxManifest` to populate its grouped lists.
 *   - Per-piece preview routes at /library/[category]/[name] read individual
 *     entries by (category, slug) and call `render(state)` to produce the
 *     piece for the user-selected state.
 *
 * Adding a piece: import the React component, append an entry below. The
 * three-artifact rule applies — every module entry here must also have a
 * Sanity schema in `src/sanity/schemaTypes/modules/` and a registration in
 * `ModuleRenderer`.
 * ========================================================================== */

export type SandboxCategory = "components" | "modules" | "templates";
export type SandboxStatus = "draft" | "approved";

export interface SandboxEntry {
  /** PascalCase display name. Matches the React component export name. */
  name: string;
  /** kebab-case URL slug. Used in /library/[category]/[slug]. */
  slug: string;
  /** Which library section this piece belongs to. */
  category: SandboxCategory;
  /** Whether the piece has been approved per sandbox.md's checklist. */
  status: SandboxStatus;
  /** Path from project root, for display in the catalog. */
  filePath: string;
  /**
   * Additional named states beyond "default". The "default" state is always
   * available and rendered when no state is selected. Examples: "with-comparison",
   * "long-content", "winner", "killed".
   */
  states: string[];
  /**
   * Produces the piece for a given state name. Called from the preview route.
   * State will be "default" or one of the strings in `states`.
   */
  render: (state: string) => ReactNode;
}

/* ---------------------------------------------------------------------------
 * The manifest.
 * ------------------------------------------------------------------------ */

export const sandboxManifest: SandboxEntry[] = [
  {
    name: "Eyebrow",
    slug: "eyebrow",
    category: "components",
    status: "approved",
    filePath: "src/components/ui/Eyebrow.tsx",
    states: ["long-content"],
    render: (state) => {
      switch (state) {
        case "long-content":
          return (
            <Eyebrow>
              An eyebrow with absurdly long content to test wrapping behavior
            </Eyebrow>
          );
        default:
          return <Eyebrow>Hypothesis</Eyebrow>;
      }
    },
  },
  {
    name: "SectionNumber",
    slug: "section-number",
    category: "components",
    status: "approved",
    filePath: "src/components/ui/SectionNumber.tsx",
    states: ["inverse"],
    render: (state) => {
      switch (state) {
        case "inverse":
          return <SectionNumber number="05" tone="inverse" />;
        default:
          return <SectionNumber number="03" />;
      }
    },
  },
  {
    name: "MetricCard",
    slug: "metric-card",
    category: "components",
    status: "approved",
    filePath: "src/components/ui/MetricCard.tsx",
    states: ["with-comparison", "with-comparison-over", "long-label"],
    render: (state) => {
      switch (state) {
        case "with-comparison":
          return (
            <MetricCard
              value="+6%"
              label="AOV lift"
              comparison="No target — anchor effect"
              comparisonState="neutral"
            />
          );
        case "with-comparison-over":
          return (
            <MetricCard
              value="+18%"
              label="CVR lift"
              comparison="↑ Target +12%"
              comparisonState="over"
            />
          );
        case "long-label":
          return (
            <MetricCard
              value="−22%"
              label="Configurator support tickets per session"
            />
          );
        default:
          return <MetricCard value="+47%" label="Time on configurator" />;
      }
    },
  },
  {
    name: "Tag",
    slug: "tag",
    category: "components",
    status: "approved",
    filePath: "src/components/ui/Tag.tsx",
    states: ["winner", "killed", "tabled"],
    render: (state) => {
      switch (state) {
        case "winner":
          return <Tag variant="winner">Winner</Tag>;
        case "killed":
          return <Tag variant="killed">Killed</Tag>;
        case "tabled":
          return <Tag variant="tabled">Tabled</Tag>;
        default:
          return <Tag>Baseline</Tag>;
      }
    },
  },
  {
    name: "AttributionRow",
    slug: "attribution-row",
    category: "components",
    status: "approved",
    filePath: "src/components/ui/AttributionRow.tsx",
    states: ["short-content", "long-content"],
    render: (state) => {
      switch (state) {
        case "short-content":
          return (
            <AttributionRow
              function_="Brand"
              who="1 ACD"
              what="Co-wrote final copy."
            />
          );
        case "long-content":
          return (
            <AttributionRow
              function_="Engineering"
              who="2 ICs · 1 EM · 1 staff engineer reviewing on a part-time basis"
              what="Rebuilt the configurator state machine end to end. Replaced the variant-grid rendering pipeline with a streaming approach that handled large catalogs without blocking the main thread. Owned the experimentation tooling integration with the analytics platform, including all instrumentation, dashboard wiring, and the post-launch readout pipeline."
            />
          );
        default:
          return (
            <AttributionRow
              function_="Product"
              who="1 PM"
              what="Reframed the OKR mid-quarter from configurator refresh to configurator CVR. Held the line on scope expansion with leadership."
            />
          );
      }
    },
  },
  {
    name: "Basic Hero",
    slug: "basic-hero",
    category: "modules",
    status: "approved",
    filePath: "src/components/modules/BasicHero.tsx",
    states: [
      "headline-only",
      "no-eyebrow",
      "no-accent",
      "long-headline",
      "many-chips",
    ],
    render: (state) => {
      switch (state) {
        case "headline-only":
          return (
            <BasicHero
              data={{
                headline: "Configurator",
                headlineAccent: "v3",
              }}
            />
          );
        case "no-eyebrow":
          return (
            <BasicHero
              data={{
                headline: "Configurator",
                headlineAccent: "v3",
                chips: ["Hardware commerce", "A/B test", "+18% CVR"],
              }}
            />
          );
        case "no-accent":
          return (
            <BasicHero
              data={{
                eyebrow: "Case study",
                headline: "Configurator v3",
                chips: ["Hardware commerce", "A/B test", "+18% CVR"],
              }}
            />
          );
        case "long-headline":
          return (
            <BasicHero
              data={{
                eyebrow: "Case study",
                headline:
                  "Reframing the configurator around use cases instead of variants",
                chips: ["Hardware commerce", "A/B test", "Self-persuasion"],
              }}
            />
          );
        case "many-chips":
          return (
            <BasicHero
              data={{
                eyebrow: "Case study",
                headline: "Configurator",
                headlineAccent: "v3",
                chips: [
                  "Hardware commerce",
                  "A/B/n test",
                  "Self-persuasion",
                  "Use-case framing",
                  "Cross-functional",
                  "Configurator",
                  "Variant grid",
                  "Post-purchase",
                ],
              }}
            />
          );
        default:
          return (
            <BasicHero
              data={{
                eyebrow: "Case study",
                headline: "Configurator",
                headlineAccent: "v3",
                chips: ["Hardware commerce", "A/B test", "+18% CVR"],
              }}
            />
          );
      }
    },
  },
];

/* ---------------------------------------------------------------------------
 * Categories metadata. Kept here so the index page and the preview pages
 * share the same definitions for category titles and empty-state hints.
 * ------------------------------------------------------------------------ */

export const sandboxCategories: {
  id: SandboxCategory;
  title: string;
  emptyHint: string;
}[] = [
  {
    id: "components",
    title: "Components",
    emptyHint: "src/components/ui/",
  },
  {
    id: "modules",
    title: "Modules",
    emptyHint: "src/components/modules/",
  },
  {
    id: "templates",
    title: "Templates",
    emptyHint: "src/components/templates/",
  },
];

/* ---------------------------------------------------------------------------
 * Lookup helpers
 * ------------------------------------------------------------------------ */

export function getEntry(
  category: SandboxCategory,
  slug: string
): SandboxEntry | undefined {
  return sandboxManifest.find(
    (entry) => entry.category === category && entry.slug === slug
  );
}

export function getEntriesByCategory(
  category: SandboxCategory
): SandboxEntry[] {
  return sandboxManifest.filter((entry) => entry.category === category);
}

export function isSandboxCategory(value: string): value is SandboxCategory {
  return value === "components" || value === "modules" || value === "templates";
}
