import Link from "next/link";

export default function CTABanner() {
  return (
    <section id="contact" className="bg-foreground px-8 py-24 text-background">
      <div className="mx-auto max-w-7xl flex flex-col items-start gap-8 md:flex-row md:items-center md:justify-between">
        <h2 className="text-4xl font-bold leading-tight md:text-5xl">
          Want to Start
          <br />a Project?
        </h2>
        <Link
          href="#"
          className="inline-flex rounded-full bg-accent px-8 py-4 text-sm font-semibold text-foreground transition-transform hover:scale-105"
        >
          Let&rsquo;s Talk
        </Link>
      </div>
    </section>
  );
}
