import type { ReactNode } from "react";
import { requireAdmin } from "@/server/auth";
import { StudioShell } from "./components/StudioShell";

// Admin authorization must complete before any Studio UI is sent.
export const instant = false;

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return <StudioShell>{children}</StudioShell>;
}
