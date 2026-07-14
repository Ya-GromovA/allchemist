import type { ReactNode } from "react";

export interface ShellUser {
  name: string;
  role: string;
  avatarSrc?: string;
  initials: string;
}

export interface ShellMenuChild {
  id: string;
  label: string;
  href: string;
}

export interface ShellMenuItem {
  id: string;
  label: string;
  href: string;
  icon: ShellIconName;
  badge?: string;
  children?: ShellMenuChild[];
}

export type ShellIconName =
  | "home"
  | "courses"
  | "theory"
  | "tasks"
  | "labs"
  | "visualization"
  | "references"
  | "exams"
  | "diagnostics"
  | "ai"
  | "progress"
  | "messages"
  | "settings"
  | "menu"
  | "search"
  | "bell"
  | "shield"
  | "sparkles"
  | "chevron"
  | "book"
  | "cube"
  | "flask"
  | "chart";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface ModuleTab {
  id: string;
  label: string;
  href?: string;
}

export interface MainLayoutProps {
  activeHref?: string;
  title?: string;
  description?: string;
  eyebrow?: string;
  breadcrumbs?: BreadcrumbItem[];
  tabs?: ModuleTab[];
  activeTabId?: string;
  rightAside?: ReactNode;
  bottomBlocks?: ReactNode;
  children: ReactNode;
  user?: ShellUser;
}
