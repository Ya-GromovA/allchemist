import { AppShell, Sidebar, Topbar } from "@allchemist/ui";

const nav = [
  ["/dashboard", "Dashboard"],
  ["/schools", "Schools"],
  ["/users", "Users"],
  ["/roles-access", "Roles/access"],
  ["/licenses-payments", "Licenses/payments"],
  ["/content", "Content"],
  ["/content-qa", "Content QA"],
  ["/reaction-packs", "Reaction packs"],
  ["/physics-simulations", "Physics simulations"],
  ["/biology-microscope-packs", "Biology microscope"],
  ["/media-assets", "Media assets"],
  ["/analytics", "Analytics"],
  ["/audit", "Audit"],
] as const;

export function AdminShell({ children, active, title }: { children: React.ReactNode; active: string; title: string }) {
  return (
    <AppShell
      sidebar={<Sidebar title="?????????????? Admin" items={nav.map(([href, label]) => ({ href, label, active: href === active }))} />}
      topbar={<Topbar title={title} />}
    >
      {children}
    </AppShell>
  );
}
