import Image from "next/image";
import Link from "next/link";
import { client } from "@/sanity/lib/client";
import { urlFor } from "@/sanity/lib/image";

// Static fallback shown when Sanity has no projects yet
const FALLBACK_PROJECTS = [
  {
    _id: "fallback-1",
    title: "Branding Design",
    description: "Build a unique website Teamollo.Webflow template",
    tags: ["Website", "Branding", "Application"],
    image: "https://picsum.photos/seed/brand1/600/500",
    projectUrl: null,
    slug: null,
    thumbnail: null,
  },
  {
    _id: "fallback-2",
    title: "Application Design",
    description: "Build a unique website Teamollo.Webflow template",
    tags: ["Website", "Branding", "Application"],
    image: "https://picsum.photos/seed/app1/600/500",
    projectUrl: null,
    slug: null,
    thumbnail: null,
  },
  {
    _id: "fallback-3",
    title: "Branding Identity",
    description: "Build a unique website Teamollo.Webflow template",
    tags: ["Website", "Branding", "Application"],
    image: "https://picsum.photos/seed/identity1/600/500",
    projectUrl: null,
    slug: null,
    thumbnail: null,
  },
  {
    _id: "fallback-4",
    title: "Packaging Design",
    description: "Build a unique website Teamollo.Webflow template",
    tags: ["Website", "Branding", "Application"],
    image: "https://picsum.photos/seed/pack1/600/500",
    projectUrl: null,
    slug: null,
    thumbnail: null,
  },
  {
    _id: "fallback-5",
    title: "Website Design",
    description: "Build a unique website Teamollo.Webflow template",
    tags: ["Website", "Branding", "Application"],
    image: "https://picsum.photos/seed/web1/600/500",
    projectUrl: null,
    slug: null,
    thumbnail: null,
  },
  {
    _id: "fallback-6",
    title: "Website Design",
    description: "Build a unique website Teamollo.Webflow template",
    tags: ["Website", "Branding", "Application"],
    image: "https://picsum.photos/seed/web2/600/500",
    projectUrl: null,
    slug: null,
    thumbnail: null,
  },
];

function ArrowIcon() {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white transition-transform hover:scale-110">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="7" y1="17" x2="17" y2="7" />
        <polyline points="7 7 17 7 17 17" />
      </svg>
    </div>
  );
}

export default async function SelectedWork() {
  type SanityProject = {
    _id: string;
    title: string | null;
    description: string | null;
    tags: string[] | null;
    thumbnail: object | null;
    projectUrl: string | null;
    slug: { current: string } | null;
  };

  type DisplayProject = {
    _id: string;
    title: string;
    description: string | null;
    tags: string[] | null;
    image: string;
    projectUrl: string | null;
    slug: { current: string } | null;
    thumbnail: object | null;
  };

  // Fetch from Sanity — falls back to static data on error or empty
  let sanityProjects: SanityProject[] = [];
  try {
    sanityProjects = await client.fetch<SanityProject[]>(
      `*[_type == "project"] | order(order asc, _createdAt desc) {
        _id, title, slug, description, thumbnail, projectUrl, tags
      }`,
      {},
      { next: { revalidate: 30 } }
    );
  } catch (err) {
    console.error("[SelectedWork] Sanity fetch failed:", err);
  }

  const projects: DisplayProject[] =
    sanityProjects && sanityProjects.length > 0
      ? sanityProjects.map((p) => ({
          _id: p._id,
          title: p.title ?? "Untitled",
          description: p.description ?? null,
          tags: p.tags ?? null,
          image: p.thumbnail
            ? urlFor(p.thumbnail).width(600).height(500).fit("crop").url()
            : `https://picsum.photos/seed/${p._id}/600/500`,
          projectUrl: p.projectUrl ?? null,
          slug: p.slug ?? null,
          thumbnail: p.thumbnail ?? null,
        }))
      : FALLBACK_PROJECTS;

  return (
    <section id="work" className="bg-background px-8 py-20">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <h2 className="text-4xl font-bold text-foreground md:text-5xl">
          Selected work!
        </h2>
        <p className="mt-4 max-w-lg text-sm text-muted">
          We&apos;ve loved working with many fantastic companies, and are really
          proud of what we&apos;ve achieved together.
        </p>

        {/* Project grid */}
        <div className="mt-16 grid grid-cols-1 gap-x-6 gap-y-16 md:grid-cols-2">
          {projects.map((project) => {
            const card = (
              <div className="group cursor-pointer">
                {/* Image */}
                <div className="relative aspect-[6/5] w-full overflow-hidden rounded-2xl bg-[#e8e8e8]">
                  <Image
                    src={project.image}
                    alt={project.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 flex items-end justify-center pb-6 opacity-0 transition-opacity group-hover:opacity-100">
                    <ArrowIcon />
                  </div>
                </div>

                {/* Text */}
                <div className="mt-5 space-y-3">
                  <h3 className="text-xl font-bold text-foreground">
                    {project.title}
                  </h3>
                  {project.description && (
                    <p className="text-sm text-muted">{project.description}</p>
                  )}
                  {project.tags && project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {project.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-muted/40 px-4 py-1.5 text-xs text-muted"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );

            // Wrap in a link if there's a URL
            if (project.projectUrl) {
              return (
                <Link
                  key={project._id}
                  href={project.projectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {card}
                </Link>
              );
            }

            return <div key={project._id}>{card}</div>;
          })}
        </div>
      </div>
    </section>
  );
}
