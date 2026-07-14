"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { defaultShellUser, fixedStudentMenu } from "./menuConfig";
import { ShellIcon } from "./ShellIcon";
import type { BreadcrumbItem, MainLayoutProps, ModuleTab, ShellMenuChild, ShellMenuItem, ShellUser } from "./layoutTypes";
import styles from "./MainLayout.module.css";

export function MainLayout({
  activeHref = "/dashboard/student",
  eyebrow,
  title,
  description,
  breadcrumbs = [],
  tabs = [],
  activeTabId,
  rightAside,
  bottomBlocks,
  children,
  user = defaultShellUser,
}: MainLayoutProps) {
  return (
    <div className={styles.shell}>
      <Sidebar activeHref={activeHref} user={user} />
      <div className={styles.workspace}>
        <Topbar user={user} />
        <BackgroundPatternLayer />
        <main className={styles.contentScroll}>
          <ContentContainer>
            {breadcrumbs.length ? <Breadcrumbs items={breadcrumbs} /> : null}
            {title ? <PageHeader eyebrow={eyebrow} title={title} description={description} /> : null}
            {tabs.length ? <ModuleTabs tabs={tabs} activeTabId={activeTabId} /> : null}
            <div className={rightAside ? styles.contentWithAside : styles.contentOnly}>
              <section className={styles.mainContent}>{children}</section>
              {rightAside ? <RightAsidePanel>{rightAside}</RightAsidePanel> : null}
            </div>
            {bottomBlocks ? <div className={styles.bottomBlocks}>{bottomBlocks}</div> : null}
          </ContentContainer>
        </main>
      </div>
    </div>
  );
}

export function AppShell(props: MainLayoutProps) {
  return <MainLayout {...props} />;
}

export function Sidebar({ activeHref, user }: { activeHref: string; user: ShellUser }) {
  const initiallyOpen = useMemo(() => {
    const ids = fixedStudentMenu.filter((item) => item.children?.some((child) => isActive(child.href, activeHref)) || isActive(item.href, activeHref)).map((item) => item.id);
    return new Set(ids.length ? ids : ["visualization", "references"]);
  }, [activeHref]);
  const [openSections, setOpenSections] = useState<Set<string>>(initiallyOpen);

  const toggle = (id: string) => {
    setOpenSections((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <aside className={styles.sidebar} aria-label="Боковая навигация платформы">
      <SidebarLogo />
      <SidebarMenu activeHref={activeHref} openSections={openSections} onToggle={toggle} />
      <SidebarUserBlock user={user} />
    </aside>
  );
}

export function SidebarLogo() {
  return (
    <a className={styles.logo} href="/dashboard/student" aria-label="Алхимик">
      <img src="/design-assets/shared/logo/allchemist-mark.svg" alt="" />
      <strong>Алхимик</strong>
      <span>STEM-платформа</span>
    </a>
  );
}

export function SidebarMenu({
  activeHref,
  openSections,
  onToggle,
}: {
  activeHref: string;
  openSections: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <nav className={styles.menu} aria-label="Основное меню ученика">
      {fixedStudentMenu.map((item) => (
        <SidebarMenuItem key={item.id} item={item} activeHref={activeHref} isOpen={openSections.has(item.id)} onToggle={onToggle} />
      ))}
    </nav>
  );
}

export function SidebarMenuItem({
  item,
  activeHref,
  isOpen,
  onToggle,
}: {
  item: ShellMenuItem;
  activeHref: string;
  isOpen: boolean;
  onToggle: (id: string) => void;
}) {
  const hasChildren = Boolean(item.children?.length);
  const active = isActive(item.href, activeHref) || Boolean(item.children?.some((child) => isActive(child.href, activeHref)));
  const className = `${styles.menuItem} ${active ? styles.menuItemActive : ""}`.trim();

  return (
    <div className={styles.menuBlock}>
      {hasChildren ? (
        <button type="button" className={className} aria-expanded={isOpen} aria-controls={`submenu-${item.id}`} onClick={() => onToggle(item.id)}>
          <span className={styles.menuIcon}>
            <ShellIcon name={item.icon} />
          </span>
          <span>{item.label}</span>
          {item.badge ? <em>{item.badge}</em> : null}
          <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`}>
            <ShellIcon name="chevron" />
          </span>
        </button>
      ) : (
        <a href={item.href} className={className} aria-current={active ? "page" : undefined}>
          <span className={styles.menuIcon}>
            <ShellIcon name={item.icon} />
          </span>
          <span>{item.label}</span>
          {item.badge ? <em>{item.badge}</em> : null}
        </a>
      )}
      {hasChildren ? <SidebarSubmenu id={`submenu-${item.id}`} items={item.children ?? []} activeHref={activeHref} open={isOpen} /> : null}
    </div>
  );
}

export function SidebarSubmenu({ id, items, activeHref, open }: { id: string; items: ShellMenuChild[]; activeHref: string; open: boolean }) {
  return (
    <div id={id} className={`${styles.submenu} ${open ? styles.submenuOpen : ""}`}>
      {items.map((item) => {
        const active = isActive(item.href, activeHref);
        return (
          <a key={item.id} href={item.href} className={active ? styles.submenuActive : undefined} aria-current={active ? "page" : undefined}>
            {item.label}
          </a>
        );
      })}
    </div>
  );
}

export function SidebarUserBlock({ user }: { user: ShellUser }) {
  return (
    <section className={styles.sidebarUser} aria-label="Текущий профиль и подписка">
      <span className={styles.sidebarUserIcon}>
        <ShellIcon name="exams" />
      </span>
      <div>
        <strong>9 класс</strong>
        <span>Премиум-план</span>
        <small>Подписка активна</small>
      </div>
      <button type="button" aria-label={`Профиль: ${user.name}`}>
        <ShellIcon name="chevron" />
      </button>
    </section>
  );
}

export function Topbar({ user }: { user: ShellUser }) {
  return (
    <header className={styles.topbar}>
      <button className={styles.layoutButton} type="button" aria-label="Состояние меню">
        <ShellIcon name="menu" />
      </button>
      <SearchBar />
      <div className={styles.topbarActions}>
        <button className={styles.aiButton} type="button">
          <ShellIcon name="sparkles" />
          <span>AI</span>
        </button>
        <NotificationButton count={3} />
        <UserProfileBlock user={user} />
      </div>
    </header>
  );
}

export function SearchBar() {
  return (
    <label className={styles.search}>
      <ShellIcon name="search" />
      <input type="search" placeholder="Поиск по платформе, курсам, темам и заданиям..." aria-label="Поиск по платформе" />
      <kbd>⌘K</kbd>
    </label>
  );
}

export function NotificationButton({ count }: { count: number }) {
  return (
    <button className={styles.notification} type="button" aria-label={`Уведомления: ${count}`}>
      <ShellIcon name="bell" />
      <span>{count}</span>
    </button>
  );
}

export function UserProfileBlock({ user }: { user: ShellUser }) {
  return (
    <button className={styles.userProfile} type="button" aria-label={`Профиль пользователя: ${user.name}, ${user.role}`}>
      {user.avatarSrc ? <img src={user.avatarSrc} alt="" /> : <span>{user.initials}</span>}
      <strong>{user.name}</strong>
      <small>{user.role}</small>
      <ShellIcon name="chevron" />
    </button>
  );
}

export function BackgroundPatternLayer() {
  return <div className={styles.backgroundPattern} aria-hidden="true" />;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`}>
          {item.href ? <a href={item.href}>{item.label}</a> : <strong>{item.label}</strong>}
          {index < items.length - 1 ? <em>/</em> : null}
        </span>
      ))}
    </nav>
  );
}

export function PageHeader({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return (
    <header className={styles.pageHeader}>
      <span className={styles.pageIcon}>
        <ShellIcon name="shield" />
      </span>
      <div>
        {eyebrow ? <span className={styles.pageEyebrow}>{eyebrow}</span> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
    </header>
  );
}

export function ModuleTabs({ tabs, activeTabId }: { tabs: ModuleTab[]; activeTabId?: string }) {
  return (
    <nav className={styles.tabs} aria-label="Вкладки модуля">
      {tabs.map((tab) => {
        const active = activeTabId === tab.id;
        return (
          <a key={tab.id} href={tab.href ?? "#"} aria-current={active ? "page" : undefined} className={active ? styles.tabActive : undefined}>
            {tab.label}
          </a>
        );
      })}
    </nav>
  );
}

export function ContentContainer({ children }: { children: ReactNode }) {
  return <div className={styles.contentContainer}>{children}</div>;
}

export function RightAsidePanel({ children }: { children: ReactNode }) {
  return <aside className={styles.rightAside}>{children}</aside>;
}

function isActive(href: string, activeHref: string) {
  if (href === activeHref) return true;
  return href !== "/" && activeHref.startsWith(`${href}/`);
}
