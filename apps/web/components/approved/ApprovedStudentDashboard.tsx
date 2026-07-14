"use client";

import type { CSSProperties, ReactNode } from "react";
import { useMemo, useState } from "react";
import { Badge, Button, Card, ProgressBar, SectionHeader, StatusPill } from "@allchemist/ui";
import type { AssistantContextPayload, AssistantHint } from "@allchemist/ai-assistant";

import {
  subjectLabel,
  taskStatusLabel,
  taskTone,
  toModuleMetrics,
  type ApprovedStudentDashboardSource,
  type ApprovedStudentDashboardViewModel,
  type PopularContent,
  type SidebarChildItem,
  type SidebarItem,
  type StudentDashboardModuleMetric,
  type StudentSubject,
  type TeacherTask,
  type WeakTopic,
} from "../../lib/adapters/student-dashboard";
import { ApprovedAiAssistantWidget } from "./ApprovedAiAssistantWidget";
import styles from "./ApprovedStudentDashboard.module.css";

export interface ApprovedStudentDashboardProps {
  data: ApprovedStudentDashboardViewModel;
  mode?: "student" | "preview";
  currentPath?: string;
}

export function ApprovedStudentDashboard({ data, mode = "student", currentPath = "/design-preview/student-dashboard" }: ApprovedStudentDashboardProps) {
  return (
    <MobileResponsiveLayout>
      <StudentDashboardShell
        sidebar={<StudentSidebar data={data} mode={mode} currentPath={currentPath} />}
        topbar={<StudentTopbar data={data} />}
      >
        <div className={styles.approvedCanvas} id="overview">
          <HeroRow data={data} />
          <QuickAccessGrid data={data} />
          <section className={styles.middleGrid} aria-label="Учебные задачи и прогресс">
            <TeacherTasksCard tasks={data.upcomingTasks} />
            <ProgressRingGroup modules={toModuleMetrics(data)} />
            <WeakTopicsCard topics={data.weakTopics} />
          </section>
          <section className={styles.bottomGrid} aria-label="Дополнительные материалы">
            <PopularContentCard items={data.popularContent} />
            <WeeklyProgressCard data={data.weeklyProgress} />
            <LockedFeatureCard feature={data.lockedFeature} />
          </section>
        </div>
        <FloatingAssistant data={data} />
      </StudentDashboardShell>
    </MobileResponsiveLayout>
  );
}

export function MobileResponsiveLayout({ children }: { children: ReactNode }) {
  return <div className={styles.mobileFrame}>{children}</div>;
}

export function StudentDashboardShell({
  sidebar,
  topbar,
  children,
}: {
  sidebar: ReactNode;
  topbar: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={styles.shell}>
      {sidebar}
      <div className={styles.main}>
        {topbar}
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}

export function StudentSidebar({
  data,
  currentPath,
}: {
  data: ApprovedStudentDashboardViewModel;
  mode: ApprovedStudentDashboardProps["mode"];
  currentPath: string;
}) {
  const initiallyOpen = useMemo(
    () =>
      data.sidebarItems
        .filter((item) => item.children?.some((child) => isItemActive(child, currentPath)) || isItemActive(item, currentPath))
        .map((item) => item.id),
    [currentPath, data.sidebarItems],
  );
  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set(initiallyOpen));

  const toggleSection = (id: string) => {
    setOpenSections((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <aside className={styles.sidebar} aria-label="Навигация ученика">
      <div className={styles.brand}>
        <img src={data.assets.logo} alt="" />
        <div>
          <strong>АЛХИМИК</strong>
          <span>STEM-платформа</span>
        </div>
      </div>
      <nav className={styles.nav}>
        {data.sidebarItems.map((item) => {
          const isOpen = openSections.has(item.id);
          const hasChildren = Boolean(item.children?.length);
          const active = isItemActive(item, currentPath) || item.children?.some((child) => isItemActive(child, currentPath));

          return (
            <div key={item.id} className={styles.navItemBlock}>
              {hasChildren ? (
                <button
                  type="button"
                  className={active ? styles.navActive : undefined}
                  aria-expanded={isOpen}
                  aria-controls={`sidebar-submenu-${item.id}`}
                  onClick={() => toggleSection(item.id)}
                >
                  <img src={item.icon} alt="" />
                  <span>{item.label}</span>
                  {item.badge ? <em>{item.badge}</em> : null}
                  <b className={isOpen ? styles.chevronOpen : undefined}>⌄</b>
                </button>
              ) : (
                <a href={item.href} className={active ? styles.navActive : undefined} aria-current={active ? "page" : undefined}>
                  <img src={item.icon} alt="" />
                  <span>{item.label}</span>
                  {item.badge ? <em>{item.badge}</em> : null}
                </a>
              )}
              {hasChildren ? (
                <div id={`sidebar-submenu-${item.id}`} className={`${styles.submenu} ${isOpen ? styles.submenuOpen : ""}`}>
                  {item.children?.map((child) => {
                    const childActive = isItemActive(child, currentPath);
                    return (
                      <a key={child.id} href={child.href} className={childActive ? styles.submenuActive : undefined} aria-current={childActive ? "page" : undefined}>
                        {child.label}
                      </a>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>
      <Card className={styles.licenseCard}>
        <span>Расширенная лицензия</span>
        <p>Открой все возможности платформы</p>
        <Button type="button" size="sm" variant="secondary">
          Подробнее
        </Button>
      </Card>
      <div className={styles.collapseControl}>
        <span>Свернуть меню</span>
        <span aria-hidden="true">‹‹</span>
      </div>
    </aside>
  );
}

function isItemActive(item: SidebarItem | SidebarChildItem, currentPath: string) {
  if ("active" in item && item.active && (currentPath === "/design-preview/student-dashboard" || currentPath === "/dashboard/student")) return true;
  return item.matchPaths?.some((path) => currentPath === path || currentPath.startsWith(`${path}/`)) ?? false;
}

export function StudentTopbar({ data }: { data: ApprovedStudentDashboardViewModel }) {
  return (
    <header className={styles.topbar}>
      <div className={styles.greeting}>
        <h1>{data.topbar.greeting}</h1>
        <p>{data.topbar.subtitle}</p>
      </div>
      <label className={styles.searchBox}>
        <img src="/design-assets/student-dashboard/clean/icons/search.svg" alt="" />
        <input type="search" placeholder={data.topbar.searchPlaceholder} aria-label="Поиск" />
        <kbd>/</kbd>
      </label>
      <div className={styles.topbarActions}>
        <IconButton icon="/design-assets/student-dashboard/clean/icons/bell.svg" label="Уведомления" badge={String(data.topbar.notificationCount)} />
        <IconButton icon="/design-assets/student-dashboard/clean/icons/calendar.svg" label="Календарь" />
        <div className={styles.profileMini}>
          <img src={data.learner.avatarImage} alt="" />
          <div>
            <strong>{data.learner.name}</strong>
            <span>{data.learner.grade}</span>
          </div>
          <span className={styles.profileChevron} aria-hidden="true">
            ⌄
          </span>
        </div>
      </div>
    </header>
  );
}

function IconButton({ icon, label, badge }: { icon: string; label: string; badge?: string }) {
  return (
    <button className={styles.iconButton} type="button" aria-label={label}>
      <img src={icon} alt="" />
      {badge ? <span>{badge}</span> : null}
    </button>
  );
}

function HeroRow({ data }: { data: ApprovedStudentDashboardViewModel }) {
  return (
    <section className={styles.heroRow} id="courses">
      <ContinueLearningCard course={data.nextCourse} />
      <LiveLessonCard data={data.liveLesson} />
      <AIRecommendationCard data={data} />
    </section>
  );
}

export function ContinueLearningCard({ course }: { course: ApprovedStudentDashboardViewModel["nextCourse"] }) {
  return (
    <Card className={`${styles.heroCard} ${styles.continueCard}`}>
      <div className={styles.cardCopy}>
        <div className={styles.cardHeader}>
          <span>Продолжить обучение</span>
          <Badge tone="info">{subjectLabel(course.subject)}</Badge>
        </div>
        <h2>
          {course.title}.<br />
          {course.lessonTitle}
        </h2>
        <div className={styles.progressLine}>
          <strong>{course.progress}%</strong>
          <span>Прогресс темы</span>
        </div>
        <ProgressBar value={course.progress} />
        <Button type="button">{course.nextAction}</Button>
      </div>
      <img className={styles.heroImage} src={course.image} alt="" />
    </Card>
  );
}

function LiveLessonCard({ data }: { data: ApprovedStudentDashboardSource["liveLesson"] }) {
  return (
    <Card className={`${styles.heroCard} ${styles.liveCard}`}>
      <div className={styles.cardCopy}>
        <div className={styles.cardHeader}>
          <span>{data.label}</span>
          <Badge tone="info">{subjectLabel(data.subject)}</Badge>
        </div>
        <h2>{data.title}</h2>
        <p>{data.subtitle}</p>
        <ul className={styles.lessonMeta}>
          <li>{data.timeLabel}</li>
          <li>Преподаватель: {data.teacher}</li>
        </ul>
        <Button type="button">{data.actionLabel}</Button>
      </div>
      <img className={styles.heroImage} src={data.image} alt="" />
    </Card>
  );
}

export function AIRecommendationCard({ data }: { data: ApprovedStudentDashboardViewModel }) {
  return (
    <Card className={styles.aiRecommendations}>
      <SectionHeader title="AI-рекомендации" />
      <div className={styles.recommendationList}>
        {data.aiRecommendations.map((item) => (
          <article key={item.id} data-subject={item.subject}>
            <img src={item.icon} alt="" />
            <div>
              <strong>{item.title}</strong>
              <span>{item.subtitle}</span>
            </div>
          </article>
        ))}
      </div>
      <a href="#assistant">Все рекомендации →</a>
    </Card>
  );
}

export function QuickAccessGrid({ data }: { data: ApprovedStudentDashboardViewModel }) {
  return (
    <section className={styles.quickAccess} id="quick-access" aria-label="Быстрый доступ">
      <h2>Быстрый доступ</h2>
      <div className={styles.quickGrid}>
        {data.quickAccess.map((item) => (
          <a key={item.id} href={item.route} data-status={item.status}>
            <img src={item.icon} alt="" />
            <span>{item.label}</span>
            {item.badge ? <em>{item.badge}</em> : null}
          </a>
        ))}
      </div>
    </section>
  );
}

export function TeacherTasksCard({ tasks }: { tasks: TeacherTask[] }) {
  return (
    <Card className={styles.teacherTasks} id="tasks">
      <div className={styles.sectionHeading}>
        <h2>Задания от учителя</h2>
        <a href="#tasks">Все задания →</a>
      </div>
      <div className={styles.taskList}>
        {tasks.map((task) => (
          <article key={task.id}>
            <span className={`${styles.topicIcon} ${styles[subjectClass(task.subject)]}`}>{subjectLabel(task.subject).slice(0, 1)}</span>
            <div>
              <small>{subjectLabel(task.subject)}</small>
              <strong>{task.title}</strong>
              <span>{task.dueLabel}</span>
            </div>
            <StatusPill status={taskStatusLabel(task.status)} tone={taskTone(task.status)} />
          </article>
        ))}
      </div>
    </Card>
  );
}

export function ProgressRingGroup({ modules }: { modules: StudentDashboardModuleMetric[] }) {
  return (
    <Card className={styles.progressCard} id="progress">
      <div className={styles.sectionHeading}>
        <h2>Мой прогресс</h2>
        <a href="#progress">Подробнее →</a>
      </div>
      <div className={styles.ringGroup}>
        {modules.map((module) => (
          <div key={module.id}>
            <div className={`${styles.progressRing} ${styles[subjectClass(module.id)]}`} style={{ "--value": `${module.progress}%` } as CSSProperties}>
              <strong>{module.progress}%</strong>
              <span>Освоено</span>
            </div>
            <strong>{module.label}</strong>
            <span>{module.completedLabel}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function WeakTopicsCard({ topics }: { topics: WeakTopic[] }) {
  return (
    <Card className={styles.weakTopics} id="weak-topics">
      <div className={styles.sectionHeading}>
        <h2>Слабые темы</h2>
        <a href="#weak-topics">Как это определяется?</a>
      </div>
      <div className={styles.weakList}>
        {topics.map((topic) => (
          <article key={topic.id}>
            <span className={`${styles.topicIcon} ${styles[subjectClass(topic.subject)]}`}>{subjectLabel(topic.subject).slice(0, 1)}</span>
            <div>
              <strong>{topic.title}</strong>
              <span>{subjectLabel(topic.subject)}</span>
            </div>
            <Button type="button" size="sm" variant="secondary">
              {topic.actionLabel}
            </Button>
          </article>
        ))}
      </div>
    </Card>
  );
}

export function PopularContentCard({ items }: { items: PopularContent[] }) {
  return (
    <Card className={styles.popularCard}>
      <div className={styles.sectionHeading}>
        <h2>Популярные сейчас</h2>
        <a href="#popular">Смотреть все →</a>
      </div>
      <div className={styles.popularGrid}>
        {items.map((item) => (
          <article key={item.id}>
            <img src={item.image} alt="" />
            <strong>{item.title}</strong>
            <span>{item.meta}</span>
          </article>
        ))}
      </div>
    </Card>
  );
}

export function WeeklyProgressCard({ data }: { data: ApprovedStudentDashboardSource["weeklyProgress"] }) {
  const path = data.points.map((point, index) => `${index === 0 ? "M" : "L"} ${index * 44 + 10} ${100 - point.value}`).join(" ");

  return (
    <Card className={styles.weeklyCard}>
      <h2>{data.title}</h2>
      <strong>{data.delta}</strong>
      <span>{data.caption}</span>
      <svg viewBox="0 0 280 110" role="img" aria-label={data.title}>
        <path d={path} />
        {data.points.map((point, index) => (
          <circle key={point.day} cx={index * 44 + 10} cy={100 - point.value} r="3.5" />
        ))}
      </svg>
      <div className={styles.weekDays}>
        {data.points.map((point) => (
          <span key={point.day}>{point.day}</span>
        ))}
      </div>
    </Card>
  );
}

export function LockedFeatureCard({ feature }: { feature: ApprovedStudentDashboardSource["lockedFeature"] }) {
  return (
    <Card className={styles.lockedCard}>
      <div>
        <Badge tone="warning">Заблокировано в базовой лицензии</Badge>
        <h2>{feature.title}</h2>
        <p>{feature.subtitle}</p>
        <small>{feature.requiredLicense}</small>
        <Button type="button" variant="secondary">
          {feature.actionLabel}
        </Button>
      </div>
      <img src={feature.image} alt="" />
    </Card>
  );
}

function FloatingAssistant({ data }: { data: ApprovedStudentDashboardViewModel }) {
  const primaryHint = data.aiHints[0];
  const hint: AssistantHint = {
    intent: "recommendNext",
    priority: primaryHint?.priority ?? "normal",
    title: primaryHint?.title ?? "AI-наставник",
    body: primaryHint?.body ?? "Я рядом, если нужна подсказка.",
  };
  const context: AssistantContextPayload = {
    ...data.assistantContext,
    role: "student",
    locale: "ru",
    safetyLevel: "notice",
    metadata: {
      learnerId: data.learner.id,
      streakDays: data.learner.streakDays,
    },
  };

  return (
    <div id="assistant">
      <ApprovedAiAssistantWidget
        title={hint.title ?? "AI-наставник"}
        state={primaryHint?.state ?? "hint"}
        hint={hint}
        context={context}
        robotImage={data.assets.assistantRobot}
      />
    </div>
  );
}

function subjectClass(subject: StudentSubject) {
  return `subject-${subject}`;
}
