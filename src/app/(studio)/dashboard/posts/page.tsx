import type { Metadata } from "next";
import { StudioCollectionPage } from "@/features/studio/StudioCollectionPage";
import { studioCollections } from "@/features/studio/fixtures";

export const metadata: Metadata = { title: "普通文章" };
export default function Page() { return <StudioCollectionPage collection={studioCollections.posts} />; }
