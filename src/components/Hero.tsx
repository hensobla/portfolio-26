import Image from "next/image";

export default function Hero() {
  return (
    <section
      className="relative min-h-screen overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 72% 0%, #8B1FCC 0%, #5a0a9e 22%, #1e0550 48%, #0B132E 72%)",
      }}
    >
      {/* Top-right intro paragraph */}
      <div className="absolute top-28 right-8 z-10 max-w-[220px] pt-6">
        <p className="text-sm leading-relaxed text-white/60">
          Here we go a small intro
          <br />
          paragraph that talks about
          <br />
          our company and team
        </p>
        <div className="mt-4 h-px w-full bg-white/30" />
      </div>

      {/* Main layout */}
      <div className="flex min-h-screen flex-col px-8 pt-24">
        {/* Headline */}
        <h1
          className="mt-6 font-bold leading-[1.05] tracking-[-0.02em] text-white"
          style={{ fontSize: "clamp(60px, 9.5vw, 175px)" }}
        >
          Let&rsquo;s Talk
          <br />
          <span style={{ paddingLeft: "clamp(30px, 5vw, 96px)" }}>
            To Design
          </span>
          <br />
          Teamollo
        </h1>

        {/* Image + scroll button */}
        <div className="relative mt-auto">
          {/* Lime green scroll indicator */}
          <div
            className="absolute right-8 -top-12 z-20 flex h-[112px] w-[112px] items-center justify-center rounded-full text-3xl font-bold"
            style={{ backgroundColor: "var(--accent)" }}
          >
            ↓
          </div>

          {/* Office image — contained, left-offset */}
          <div className="relative ml-[5vw] h-[46vh] overflow-hidden rounded-t-2xl">
            <Image
              src="https://picsum.photos/seed/officedesk/1400/700"
              alt="Creative office workspace"
              fill
              className="object-cover"
              sizes="95vw"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
