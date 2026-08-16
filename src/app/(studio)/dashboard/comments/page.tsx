import type { Metadata } from "next";
import { StudioCollectionPage } from "@/features/studio/StudioCollectionPage";
import { studioCollections } from "@/features/studio/fixtures";

export const metadata: Metadata = { title: "评论" };
export default function Page() { return <StudioCollectionPage collection={studioCollections.comments} />; }
