import { Suspense, type ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { getViewer } from "@/features/auth/server";

function HeaderFallback() {
  return (
    <div
      aria-hidden="true"
      className="min-h-16 border-b border-border bg-background"
    />
  );
}

async function ViewerHeader() {
  const viewer = await getViewer();

  return (
    <Suspense fallback={<HeaderFallback />}>
      <SiteHeader viewer={viewer} />
    </Suspense>
  );
}

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <Suspense fallback={<HeaderFallback />}>
        <ViewerHeader />
      </Suspense>
      {children}
    </div>
  );
}
