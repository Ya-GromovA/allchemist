import type { ReactNode } from "react";
import { MainLayout } from "../platform-layout";

export interface StudentShellProps {
  activeHref?: string;
  children: ReactNode;
}

export function StudentShell({ activeHref = "/dashboard/student", children }: StudentShellProps) {
  return <MainLayout activeHref={activeHref}>{children}</MainLayout>;
}
