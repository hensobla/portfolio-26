const services = [
  "Web Design",
  "Animation",
  "Branding Design",
  "UI/UX",
  "Web App Design & Development",
  "3D Modeling",
  "Digital Marketing",
  "Web Development",
  "App Design",
];

export default function About() {
  return (
    <>
      {/* Sub-hero: Hello Stranger + intro paragraph */}
      <section id="about" className="bg-background px-8 py-20">
        <div className="mx-auto max-w-7xl">
          <p
            className="font-semibold tracking-wide"
            style={{ fontSize: "30px", lineHeight: "2.4", letterSpacing: "0.01em" }}
          >
            Hello Stranger
          </p>
          <p
            className="mt-4 max-w-5xl font-normal leading-[1.29] text-muted"
            style={{ fontSize: "clamp(28px, 3vw, 56px)", letterSpacing: "0.01em" }}
          >
            We are an award-winning strategic design company that provides
            consultancy services worldwide. Our team consists of a superb blend
            of thinkers, strategists, designers, researchers, developers and
            organisers. Not too big, not too small, quite sensible and
            completely independent.
          </p>
        </div>
      </section>

      {/* Services: dark section with pill tags */}
      <section className="bg-foreground px-8 py-20">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-2xl font-semibold text-background">Our Service</h2>
          <div className="mt-10 flex flex-wrap gap-3">
            {services.map((service) => (
              <span
                key={service}
                className="rounded-full border-2 border-background/30 px-5 py-2.5 text-sm font-medium text-background transition-colors hover:border-accent hover:text-accent"
              >
                {service}
              </span>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
