import type { Metadata } from "next";
import { Suspense } from "react";
import { listTags } from "@/server/taxonomy/queries";
import { TaxonomyManager } from "../components/TaxonomyManager";

export const metadata: Metadata = { title: "标签" };

async function Tags() {
  const rows = await listTags();
  return <TaxonomyManager mode="tag" rows={rows} />;
}

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">正在加载标签…</p>}>
      <Tags />
    </Suspense>
  );
}
