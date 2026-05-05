import { notFound } from "next/navigation";
import { client } from "@/sanity/lib/client";
import { pageBySlugQuery } from "@/sanity/lib/queries";

export const dynamic = "force-dynamic";

type ModuleData = {
  _type: string;
  _key: string;
};

type PageDoc = {
  _id: string;
  title: string;
  slug: { current: string };
  modules: ModuleData[] | null;
};

export default async function DynamicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const pageDoc = await client.fetch<PageDoc | null>(
    pageBySlugQuery,
    { slug },
    { cache: "no-store" }
  );

  if (!pageDoc) notFound();

  return (
    <main>
      {pageDoc.modules?.map((mod) => {
        switch (mod._type) {
          default:
            return null;
        }
      })}
    </main>
  );
}
