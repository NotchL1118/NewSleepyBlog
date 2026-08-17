import type { ReactNode } from "react";
import { requireAdmin } from "@/features/auth/server";
import { StudioShell } from "@/features/studio/StudioShell";

// Admin authorization must complete before any Studio UI is sent.
export const instant = false;

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const viewer = await requireAdmin();
  return <StudioShell viewer={viewer}>{children}</StudioShell>;
}
