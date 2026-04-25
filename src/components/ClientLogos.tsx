const clients = [
  "Spotify",
  "Stripe",
  "Zoom",
  "Mercedes",
  "Google",
  "Airbnb",
  "Notion",
];

export default function ClientLogos() {
  return (
    <section className="bg-background px-8 py-20">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-3xl font-bold text-foreground md:text-4xl">
          Our Clients!
        </h2>
        <div className="mt-12 flex flex-wrap items-center gap-x-16 gap-y-8">
          {clients.map((name) => (
            <span
              key={name}
              className="text-xl font-bold tracking-tight text-foreground/20"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
