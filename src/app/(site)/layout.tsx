import { Suspense, type ReactNode } from "react";
import { SiteHeader } from "./components/SiteHeader";
import { getViewer } from "@/server/auth";

function HeaderFallback() {
  return (
    <div
      aria-hidden="true"
      className="min-h-[76px] min-[821px]:min-h-[92px]"
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
