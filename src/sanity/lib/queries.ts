import { defineQuery } from "next-sanity";

export const projectsQuery = defineQuery(`
  *[_type == "project"] | order(order asc, _createdAt desc) {
    _id,
    title,
    slug,
    description,
    thumbnail,
    projectUrl,
    tags,
  }
`);

export const projectBySlugQuery = defineQuery(`
  *[_type == "project" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    description,
    thumbnail,
    projectUrl,
    tags,
    body,
  }
`);
