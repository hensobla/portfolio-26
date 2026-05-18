import Link from "next/link";
import {
  getEntriesByCategory,
  sandboxCategories,
  sandboxManifest,
  type SandboxCategory,
  type SandboxEntry,
  type SandboxStatus,
} from "@/lib/sandbox-manifest";
import styles from "./page.module.css";

/* =============================================================================
 * Library index
 *
 * The system's preview gallery. Two visible groupings:
 *
 *   1. SANDBOX — pieces with status "draft". Things in flight.
 *   2. COMPONENTS / MODULES / TEMPLATES — pieces with status "approved",
 *      grouped by category. The system as it exists.
 *
 * A piece appears in exactly one of those two groupings, never both. The
 * status flips when the user asks Claude Code to approve a piece (CC updates
 * the manifest along with any related files — catalog README, system docs).
 *
 * Layout (>= 1024px): two columns. A sticky left sub-nav anchor-links to
 * each section and each piece; the right column renders every piece's
 * default state inline so the index doubles as a visual catalog. Below
 * 1024px the sub-nav drops out and the content stacks normally.
 *
 * Per decisions.md D21, this file uses CSS Modules with the library chrome
 * tokens (--lib-*), not the project's design tokens. The library is a tool.
 * ========================================================================== */

const SANDBOX_SECTION_ID = "section-sandbox";

export default function LibraryIndexPage() {
  const totalCount = sandboxManifest.length;
  const approvedCount = sandboxManifest.filter(
    (entry) => entry.status === "approved"
  ).length;

  const drafts = sandboxManifest.filter((entry) => entry.status === "draft");

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Design system</p>
        <h1 className={styles.title}>Library</h1>
        <p className={styles.subtitle}>
          Preview gallery for every component, module, and template in the
          system. Drafts appear in Sandbox; approved pieces appear under their
          category. Each thumbnail renders the piece&rsquo;s default state —
          click through for state, breakpoint, and surface controls.
          {totalCount > 0 && (
            <>
              {" "}
              {approvedCount} of {totalCount}{" "}
              {totalCount === 1 ? "piece" : "pieces"} approved.
            </>
          )}
        </p>
      </header>

      <div className={styles.layout}>
        <SubNav drafts={drafts} />

        <div className={styles.content}>
          <SandboxSection drafts={drafts} />

          {sandboxCategories.map((category) => (
            <CategorySection
              key={category.id}
              id={category.id}
              title={category.title}
              emptyHint={category.emptyHint}
            />
          ))}
        </div>
      </div>
    </main>
  );
}

/* ---------------------------------------------------------------------------
 * Sticky sub-nav (left column on >= 1024px)
 * ------------------------------------------------------------------------ */

function SubNav({ drafts }: { drafts: SandboxEntry[] }) {
  return (
    <aside className={styles.subnav} aria-label="Library contents">
      <nav className={styles.subnavInner}>
        <SubNavSection
          sectionId={SANDBOX_SECTION_ID}
          title="Sandbox"
          count={drafts.length}
          pieces={drafts}
        />
        {sandboxCategories.map((category) => {
          const pieces = getEntriesByCategory(category.id).filter(
            (entry) => entry.status === "approved"
          );
          return (
            <SubNavSection
              key={category.id}
              sectionId={`section-${category.id}`}
              title={category.title}
              count={pieces.length}
              pieces={pieces}
            />
          );
        })}
      </nav>
    </aside>
  );
}

function SubNavSection({
  sectionId,
  title,
  count,
  pieces,
}: {
  sectionId: string;
  title: string;
  count: number;
  pieces: SandboxEntry[];
}) {
  const isEmpty = count === 0;
  const sectionClassName = isEmpty
    ? `${styles.subnavSection} ${styles.subnavSectionEmpty}`
    : styles.subnavSection;

  return (
    <div className={sectionClassName}>
      <a href={`#${sectionId}`} className={styles.subnavSectionLink}>
        <span className={styles.subnavSectionTitle}>{title}</span>
        <span className={styles.subnavSectionCount}>{count}</span>
      </a>
      {pieces.length > 0 && (
        <ul className={styles.subnavList}>
          {pieces.map((piece) => (
            <li key={`${piece.category}/${piece.slug}`}>
              <a
                href={`#${pieceAnchorId(piece)}`}
                className={styles.subnavLink}
              >
                {piece.name}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Sandbox section (drafts)
 * ------------------------------------------------------------------------ */

function SandboxSection({ drafts }: { drafts: SandboxEntry[] }) {
  const count = drafts.length;
  const countLabel =
    count === 0 ? "0 drafts" : count === 1 ? "1 draft" : `${count} drafts`;

  return (
    <section
      id={SANDBOX_SECTION_ID}
      className={`${styles.section} ${styles.sandboxSection}`}
    >
      <header className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Sandbox</h2>
        <p className={styles.sectionCount}>{countLabel}</p>
      </header>
      <p className={styles.sandboxNote}>
        Pieces being iterated. Each appears here while its status is{" "}
        <code>draft</code>. To approve, ask Claude Code:{" "}
        <code>approve [Name]</code>
        {" "}— CC flips the status, writes the catalog entry, and updates any
        related system docs in one turn.
      </p>

      {count === 0 ? (
        <p className={styles.emptyState}>
          No drafts in progress. Ask Claude Code to build a new component,
          module, or template — it&rsquo;ll appear here while you iterate.
        </p>
      ) : (
        <ul className={styles.pieceList}>
          {drafts.map((piece) => (
            <PieceItem
              key={`${piece.category}/${piece.slug}`}
              piece={piece}
              showCategory
            />
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------------------------------------------------------------------------
 * Category section (approved pieces)
 * ------------------------------------------------------------------------ */

function CategorySection({
  id,
  title,
  emptyHint,
}: {
  id: SandboxCategory;
  title: string;
  emptyHint: string;
}) {
  const pieces = getEntriesByCategory(id).filter(
    (entry) => entry.status === "approved"
  );
  const count = pieces.length;
  const countLabel =
    count === 0 ? "0 pieces" : count === 1 ? "1 piece" : `${count} pieces`;

  return (
    <section id={`section-${id}`} className={styles.section}>
      <header className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <p className={styles.sectionCount}>{countLabel}</p>
      </header>

      {count === 0 ? (
        <p className={styles.emptyState}>
          No approved {title.toLowerCase()}{" "}yet. New entries appear here as
          they&rsquo;re built in <code>{emptyHint}</code> and approved by
          Claude Code.
        </p>
      ) : (
        <ul className={styles.pieceList}>
          {pieces.map((piece) => (
            <PieceItem
              key={`${piece.category}/${piece.slug}`}
              piece={piece}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------------------------------------------------------------------------
 * One piece in the index: heading row + inline thumbnail rendering the
 * piece's default state. Thumbnail click navigates to the detail route.
 * ------------------------------------------------------------------------ */

function PieceItem({
  piece,
  showCategory = false,
}: {
  piece: SandboxEntry;
  showCategory?: boolean;
}) {
  const detailHref = `/library/${piece.category}/${piece.slug}`;
  const statusClassName = statusClassFor(piece.status);

  return (
    <li id={pieceAnchorId(piece)} className={styles.pieceItem}>
      <div className={styles.pieceMeta}>
        <Link href={detailHref} className={styles.pieceLink}>
          {piece.name}
          {showCategory && (
            <span className={styles.pieceCategoryHint}>
              {" "}
              · {piece.category}
            </span>
          )}
        </Link>
        <span className={styles.piecePath}>{piece.filePath}</span>
        <span className={statusClassName}>
          {piece.status === "approved" ? "Approved" : "Draft"}
        </span>
      </div>

      <Link
        href={detailHref}
        className={styles.thumbLink}
        aria-label={`Open ${piece.name} preview`}
      >
        <div className={styles.thumb} data-surface="paper">
          <div className={styles.thumbInner}>{piece.render("default")}</div>
        </div>
      </Link>
    </li>
  );
}

/* ---------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------ */

function pieceAnchorId(piece: SandboxEntry): string {
  return `piece-${piece.category}-${piece.slug}`;
}

function statusClassFor(status: SandboxStatus): string {
  return status === "approved"
    ? `${styles.pieceStatus} ${styles.pieceStatusApproved}`
    : `${styles.pieceStatus} ${styles.pieceStatusDraft}`;
}
