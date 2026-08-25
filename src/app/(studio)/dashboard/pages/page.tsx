import type { Metadata } from "next";
import { StudioCollectionPage } from "../components/StudioCollectionPage";
import { studioCollections } from "../lib/fixtures";

export const metadata: Metadata = { title: "页面" };
export default function Page() { return <StudioCollectionPage collection={studioCollections.pages} />; }
