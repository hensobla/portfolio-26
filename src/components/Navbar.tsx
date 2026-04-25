import Link from "next/link";

export default function Navbar() {
  return (
    <header className="absolute top-0 left-0 right-0 z-50 px-8 py-4">
      <nav className="flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="text-[30px] font-medium leading-tight tracking-tight text-white"
          style={{ fontFamily: "var(--font-inter)" }}
        >
          <span style={{ color: "var(--accent)" }}>Team</span>ollo.
        </Link>

        {/* Copyright — center */}
        <span className="hidden text-sm text-[#0B132E] md:block">
          Teammate © 2022
        </span>

        {/* Right side */}
        <div className="flex items-center gap-6">
          {/* Hamburger */}
          <button className="flex flex-col gap-[4px]" aria-label="Menu">
            <span className="block h-[1.5px] w-11 bg-white" />
            <span className="block h-[1.5px] w-11 bg-white" />
          </button>

          {/* Let's talk button */}
          <Link
            href="#contact"
            className="hidden rounded-full border-2 border-white px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-black md:inline-flex"
          >
            Let&rsquo;s talk
          </Link>
        </div>
      </nav>
    </header>
  );
}
