import "./library-chrome.css";

/* =============================================================================
 * Library layout
 *
 * Wraps every /library route in a `.libraryChrome` container that scopes the
 * neutral, project-agnostic chrome tokens defined in library-chrome.css.
 *
 * The library is a tool. Its chrome stays neutral so this directory can be
 * lifted into another project without dragging the Vignelli theme along. The
 * pieces being previewed continue to render in their project theme; the
 * canvas surface buttons continue to swap between project surfaces.
 * ========================================================================== */

export default function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="libraryChrome">{children}</div>;
}
