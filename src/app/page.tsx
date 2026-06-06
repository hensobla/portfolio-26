// Placeholder homepage. The old marketing site was removed (clean slate for the
// Blueprint rebuild). This sits behind the password gate (src/proxy.ts), so only
// an authenticated visitor sees it. Replaced by the real Blueprint homepage when
// it's ported in from the Loomling workspace (design/).
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-6">
      <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
        Under construction
      </p>
    </main>
  );
}
