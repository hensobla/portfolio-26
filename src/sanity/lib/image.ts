import imageUrlBuilder from "@sanity/image-url";
import { client } from "./client";

// Builder is null when Sanity isn't configured (no env vars). urlFor() throws
// in that case — but consumers should only call urlFor() with real Sanity
// image data, which only exists when the client is non-null. If you hit the
// throw, your consumer is calling urlFor() unconditionally; gate it on the
// presence of actual image data.
const builder = client ? imageUrlBuilder(client) : null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function urlFor(source: any) {
  if (!builder) {
    throw new Error(
      "Sanity image builder is unavailable — NEXT_PUBLIC_SANITY_PROJECT_ID / DATASET not set."
    );
  }
  return builder.image(source);
}
