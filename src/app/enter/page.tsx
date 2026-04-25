"use client";

import { Suspense, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function PasswordForm() {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") ?? "/";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);

    const res = await fetch(`/api/auth?from=${encodeURIComponent(from)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: inputRef.current?.value ?? "" }),
    });

    if (res.ok) {
      router.push(from);
      router.refresh();
    } else {
      setError(true);
      setLoading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
        inputRef.current.focus();
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        ref={inputRef}
        type="password"
        placeholder="Password"
        autoFocus
        required
        className="w-full rounded-full border border-white/20 bg-white/10 px-6 py-3.5 text-sm text-white placeholder-white/40 outline-none backdrop-blur-sm transition focus:border-white/50"
      />
      {error && (
        <p className="pl-2 text-xs text-red-400">Incorrect password — try again.</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full py-3.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: "var(--accent)" }}
      >
        {loading ? "Checking…" : "Enter"}
      </button>
    </form>
  );
}

export default function EnterPage() {
  return (
    <main
      className="flex min-h-screen items-center justify-center"
      style={{
        background:
          "radial-gradient(ellipse at 72% 0%, #8B1FCC 0%, #5a0a9e 22%, #1e0550 48%, #0B132E 72%)",
      }}
    >
      <div className="w-full max-w-sm px-8">
        <p
          className="mb-10 text-2xl font-medium tracking-tight"
          style={{ fontFamily: "var(--font-inter)" }}
        >
          <span style={{ color: "var(--accent)" }}>Team</span>
          <span className="text-white">ollo.</span>
        </p>
        <Suspense fallback={null}>
          <PasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
