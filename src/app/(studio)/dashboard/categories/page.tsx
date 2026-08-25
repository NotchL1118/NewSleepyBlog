import type { Metadata } from "next";
import { Suspense } from "react";
import { listPostGroups } from "@/server/taxonomy/queries";
import { TaxonomyManager } from "../components/TaxonomyManager";

export const metadata: Metadata = { title: "分类" };

async function Categories() {
  const rows = await listPostGroups("regular");
  return <TaxonomyManager mode="regular" rows={rows} />;
}

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">正在加载分类…</p>}>
      <Categories />
    </Suspense>
  );
}
