const testimonials = [
  {
    name: "Ashley Cooper",
    text: "While the company wishes they had more time to work out the kinks with the Teamollo, they are quite happy with the result of the project. The resulting website that the team developed is fast and the communication with the vendor was very good. The company will work with them again.",
  },
  {
    name: "Anton de Swardt",
    text: "Teamollo delivered the site within the timeline as they requested. In the end, the client found a 50% increase in traffic within days since its launch. They also had an impressive ability to use technologies that the company hadn't used, which have also proved to be easy to use and reliable.",
  },
  {
    name: "Anton de Swardt",
    text: "Teamollo of work, our brand now has the image we were looking for — playful yet professionals. We have received positive feedback from partners, the team, and our community to the new look of our Brand!",
  },
];

export default function Testimonials() {
  return (
    <section className="bg-background px-8 py-20">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-3xl font-bold text-foreground md:text-4xl">
          What our Clients are
          <br />
          saying about us!
        </h2>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="rounded-[40px] p-8"
              style={{ backgroundColor: "#F1F4F8" }}
            >
              <p className="text-sm leading-relaxed text-foreground">
                {t.text}
              </p>
              <div className="mt-8 flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-full"
                  style={{ backgroundColor: "#D9D9D9" }}
                />
                <span className="text-sm font-semibold text-foreground">
                  {t.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
