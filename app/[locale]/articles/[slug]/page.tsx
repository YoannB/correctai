import { collectionEntry } from "@/components/content/CollectionPages";

// The articles = the default Markdown collection (components/content/CollectionPages.tsx).
const page = collectionEntry("articles");

export const generateMetadata = page.generateMetadata;
export default page.Page;
