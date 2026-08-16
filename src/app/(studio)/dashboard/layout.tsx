import type { ReactNode } from "react";
import { requireAdmin } from "@/features/auth/server";
import { StudioShell } from "@/features/studio/StudioShell";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const viewer = await requireAdmin();
  return <StudioShell viewer={viewer}>{children}</StudioShell>;
}
