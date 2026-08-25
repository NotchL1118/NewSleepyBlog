import type { Metadata } from "next";
import { Suspense } from "react";
import { listPostGroups } from "@/server/taxonomy/queries";
import { TaxonomyManager } from "../components/TaxonomyManager";

export const metadata: Metadata = { title: "专栏" };

async function Columns() {
  const rows = await listPostGroups("heartwork");
  return <TaxonomyManager mode="heartwork" rows={rows} />;
}

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">正在加载专栏…</p>}>
      <Columns />
    </Suspense>
  );
}
