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
 * Per decisions.md D21, this file uses CSS Modules with the library chrome
 * tokens (--lib-*), not the project's design tokens. The library is a tool.
 * ========================================================================== */

export default function LibraryIndexPage() {
  const totalCount = sandboxManifest.length;
  const approvedCount = sandboxManifest.filter(
    (entry) => entry.status === "approved"
  ).length;

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Design system</p>
        <h1 className={styles.title}>Library</h1>
        <p className={styles.subtitle}>
          Preview gallery for every component, module, and template in the
          system. Drafts appear in Sandbox; approved pieces appear under their
          category. Each link opens the piece in isolation with its preview
          controls.
          {totalCount > 0 && (
            <>
              {" "}
              {approvedCount} of {totalCount}{" "}
              {totalCount === 1 ? "piece" : "pieces"} approved.
            </>
          )}
        </p>
      </header>

      <SandboxSection />

      {sandboxCategories.map((category) => (
        <CategorySection
          key={category.id}
          id={category.id}
          title={category.title}
          emptyHint={category.emptyHint}
        />
      ))}
    </main>
  );
}

function SandboxSection() {
  const drafts = sandboxManifest.filter((entry) => entry.status === "draft");
  const count = drafts.length;
  const countLabel =
    count === 0 ? "0 drafts" : count === 1 ? "1 draft" : `${count} drafts`;

  return (
    <section className={`${styles.section} ${styles.sandboxSection}`}>
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
            <PieceRow
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
    <section className={styles.section}>
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
            <PieceRow
              key={`${piece.category}/${piece.slug}`}
              piece={piece}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function PieceRow({
  piece,
  showCategory = false,
}: {
  piece: SandboxEntry;
  showCategory?: boolean;
}) {
  const statusClassName = statusClassFor(piece.status);

  return (
    <li className={styles.pieceRow}>
      <Link
        href={`/library/${piece.category}/${piece.slug}`}
        className={styles.pieceLink}
      >
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
    </li>
  );
}

function statusClassFor(status: SandboxStatus): string {
  return status === "approved"
    ? `${styles.pieceStatus} ${styles.pieceStatusApproved}`
    : `${styles.pieceStatus} ${styles.pieceStatusDraft}`;
}
