import { createClient, type SanityClient } from "next-sanity";

/* =============================================================================
 * Sanity client
 *
 * Returns a real client when env vars are configured, otherwise `null`. This
 * lets the project build cleanly in environments where Sanity isn't wired up
 * (Vercel preview deployments without per-branch env vars, CI runners, etc.)
 * — pages that depend on Sanity content gracefully degrade or 404 instead of
 * the build failing at module-evaluation time.
 *
 * Consumers must null-check before fetching:
 *
 *   if (!client) notFound();          // for routes where Sanity is required
 *   const data = client ? await client.fetch(...) : null;  // for routes with fallbacks
 * ========================================================================== */

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;

export const client: SanityClient | null =
  projectId && dataset
    ? createClient({
        projectId,
        dataset,
        apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? "2024-01-01",
        useCdn: process.env.NODE_ENV === "production",
      })
    : null;
