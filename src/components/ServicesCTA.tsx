import Link from "next/link";

export default function ServicesCTA() {
  return (
    <section className="bg-background border-t border-border px-8 py-20">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-10 md:flex-row">
        <h2 className="text-4xl font-bold leading-tight text-foreground md:text-5xl">
          Take a Look
          <br />
          at What
        </h2>

        <Link
          href="#work"
          className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-foreground transition-transform hover:scale-110"
        >
          All Work
        </Link>

        <h2 className="text-4xl font-bold leading-tight text-foreground md:text-5xl">
          We Can Do
          <br />
          For You
        </h2>
      </div>
    </section>
  );
}
