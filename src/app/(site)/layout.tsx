import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { getViewer } from "@/features/auth/server";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const viewer = await getViewer();

  return (
    <div className="min-h-dvh">
      <SiteHeader viewer={viewer} />
      {children}
    </div>
  );
}
