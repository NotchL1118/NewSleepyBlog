import type { Metadata } from "next";
import { StudioCollectionPage } from "../components/StudioCollectionPage";
import { studioCollections } from "../lib/fixtures";

export const metadata: Metadata = { title: "评论" };
export default function Page() { return <StudioCollectionPage collection={studioCollections.comments} />; }
