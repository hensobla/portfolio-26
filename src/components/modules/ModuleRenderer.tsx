import BasicHero, { type BasicHeroData } from "./BasicHero";

/* =============================================================================
 * ModuleRenderer — the Sanity `_type` → React module dispatch table.
 *
 * Per templates.md, this is the ONLY file that imports modules directly.
 * Templates compose pages by rendering `<ModuleRenderer modules={doc.modules} />`
 * and the renderer maps each entry's `_type` to the corresponding React
 * module from `src/components/modules/`.
 *
 * Adding a module to the system: import its component + data type below, then
 * add the (_type → component) row to `moduleMap`. The Sanity schema and the
 * sandbox manifest entry are added in the same change.
 *
 * Unknown _types: gracefully skipped, with a dev-only console warning so
 * mismatches surface during development without crashing production pages.
 * ========================================================================== */

export type ModuleData = (BasicHeroData & { _type: "basicHero"; _key: string }) & {
  [key: string]: unknown;
};

type ModuleProps<T extends { _type: string; _key: string }> = { data: T };

// Each entry maps a Sanity `_type` to the React module that consumes it.
// Cast to a permissive component type because the data shapes differ per
// module — the dispatch is correct at runtime; TypeScript's structural type
// system isn't expressive enough to encode this without per-call generics.
const moduleMap: Record<
  string,
  React.ComponentType<ModuleProps<{ _type: string; _key: string }>>
> = {
  basicHero: BasicHero as unknown as React.ComponentType<
    ModuleProps<{ _type: string; _key: string }>
  >,
};

export interface ModuleRendererProps {
  modules: Array<{ _type: string; _key: string; [key: string]: unknown }>;
}

export default function ModuleRenderer({ modules }: ModuleRendererProps) {
  return (
    <>
      {modules.map((mod) => {
        const Component = moduleMap[mod._type];
        if (!Component) {
          if (process.env.NODE_ENV === "development") {
            // eslint-disable-next-line no-console
            console.warn(
              `[ModuleRenderer] Unknown module _type: "${mod._type}". Skipping.`
            );
          }
          return null;
        }
        return (
          <Component
            key={mod._key}
            data={mod as { _type: string; _key: string }}
          />
        );
      })}
    </>
  );
}
