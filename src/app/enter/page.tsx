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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="password"
        placeholder="Password"
        aria-label="Password"
        autoFocus
        required
        className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 placeholder-neutral-500 outline-none transition focus:border-neutral-400"
      />
      {error && <p className="text-xs text-neutral-400">Incorrect password.</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-neutral-100 py-3 text-sm font-medium text-neutral-900 transition hover:bg-white disabled:opacity-50"
      >
        {loading ? "Checking…" : "Enter"}
      </button>
    </form>
  );
}

export default function EnterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-6">
      <div className="w-full max-w-xs">
        <p className="mb-8 text-center text-xs uppercase tracking-[0.25em] text-neutral-500">
          Private
        </p>
        <Suspense fallback={null}>
          <PasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
