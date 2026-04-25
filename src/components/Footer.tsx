import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-background px-8 py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
        <Link
          href="/"
          className="text-xl font-medium tracking-tight"
          style={{ fontFamily: "var(--font-inter)" }}
        >
          Teamollo<span style={{ color: "#EE1F1F" }}>.</span>
        </Link>

        <div className="flex gap-8 text-sm text-muted">
          <Link href="#" className="hover:text-foreground">
            Home
          </Link>
          <Link href="#about" className="hover:text-foreground">
            About
          </Link>
          <Link href="#work" className="hover:text-foreground">
            Portfolio
          </Link>
          <Link href="#contact" className="hover:text-foreground">
            Contact
          </Link>
        </div>

        <p className="text-xs text-muted">
          &copy; {new Date().getFullYear()} Teamollo. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
