"use client";

import { useMemo, useState } from "react";
import type { SubjectTheme } from "@allchemist/design-tokens";
import { studentDashboardDemoData as demoData } from "../lib/demo/student-dashboard-demo-data";

type IconName =
  | "home"
  | "courses"
  | "theory"
  | "assignments"
  | "lab"
  | "visualization"
  | "references"
  | "exams"
  | "diagnostics"
  | "ai"
  | "progress"
  | "messages"
  | "settings"
  | "search"
  | "bell"
  | "calendar"
  | "repeat"
  | "close"
  | "chemistry"
  | "physics"
  | "biology"
  | "molecule"
  | "periodic"
  | "simulator"
  | "microscope"
  | "lock";

const sidebarItems: Array<{ label: string; icon: IconName; badge?: string }> = [
  { label: "Главная", icon: "home" },
  { label: "Мои курсы", icon: "courses" },
  { label: "Теория", icon: "theory" },
  { label: "Задания", icon: "assignments" },
  { label: "Лаборатории", icon: "lab" },
  { label: "Визуализация", icon: "visualization" },
  { label: "Справочники", icon: "references" },
  { label: "Экзамены", icon: "exams" },
  { label: "Диагностика", icon: "diagnostics" },
  { label: "AI-наставник", icon: "ai" },
  { label: "Прогресс", icon: "progress" },
  { label: "Сообщения", icon: "messages", badge: "3" },
  { label: "Настройки", icon: "settings" },
];

const quickAccess = demoData.quickAccess;
const assignments = demoData.assignments;
const subjectProgress = demoData.subjectProgress as ReadonlyArray<{ subject: SubjectTheme; title: string; value: number; meta: string }>;
const weakTopics = demoData.weakTopics;
const recommendations = demoData.aiRecommendations;
const popular = demoData.popularContent;

export function StudentDashboardPreview({ showOverlay = false }: { showOverlay?: boolean }) {
  return <StudentDashboardPage showOverlay={showOverlay} />;
}

export function StudentDashboardPage({ showOverlay = false }: { showOverlay?: boolean }) {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [repeatedTopics, setRepeatedTopics] = useState<Set<string>>(() => new Set());
  const [lessonJoined, setLessonJoined] = useState(false);
  const [lockedRequested, setLockedRequested] = useState(false);
  const [lastAction, setLastAction] = useState("Дашборд готов к работе");

  const topicHint = useMemo(() => {
    if (repeatedTopics.size === 0) return "Как это определяется?";
    return "Повторение выбрано";
  }, [repeatedTopics.size]);

  function recordAction(action: string) {
    setLastAction(action);
  }

  function toggleTopic(title: string) {
    setRepeatedTopics((current) => {
      const next = new Set(current);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
    recordAction(`Тема "${title}" добавлена в повторение`);
  }

  return (
    <StudentAppShell
      topbar={<StudentTopbar onAction={recordAction} />}
      sidebar={<StudentSidebar onAction={recordAction} />}
      assistant={<AIAssistantWidget open={assistantOpen} onToggle={() => setAssistantOpen((value) => !value)} onAction={recordAction} />}
      overlay={showOverlay ? <StudentGoldenOverlay /> : null}
    >
      <section className="student-top-grid" aria-label="Основные карточки" data-testid="student-first-row-cards">
        <ContinueLearningCard onContinue={() => recordAction("Продолжение обучения открыто")} />
        <LiveLessonCard joined={lessonJoined} onJoin={() => { setLessonJoined(true); recordAction("Подключение к live-уроку подготовлено"); }} />
        <AIRecommendationsCard onAction={recordAction} />
      </section>

      <QuickAccessStrip onAction={recordAction} />

      <section className="student-dashboard-grid" aria-label="Учебная сводка">
        <AssignmentsCard onAction={recordAction} />
        <SubjectProgressCard onAction={recordAction} />
        <WeakTopicsCard topicHint={topicHint} repeatedTopics={repeatedTopics} onRepeat={toggleTopic} />
        <PopularNowCard onAction={recordAction} />
        <WeeklyProgressCard />
        <LockedFeatureCard requested={lockedRequested} onRequest={() => { setLockedRequested(true); recordAction("Запрос расширенной лицензии отправлен"); }} />
      </section>
      <div className="student-action-status" aria-live="polite">{lastAction}</div>
    </StudentAppShell>
  );
}

function StudentAppShell({ sidebar, topbar, assistant, overlay, children }: { sidebar: React.ReactNode; topbar: React.ReactNode; assistant: React.ReactNode; overlay?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="student-shell" data-testid="student-dashboard-page">
      {sidebar}
      <div className="student-shell__workspace">
        {topbar}
        <main className="student-main">{children}</main>
      </div>
      {assistant}
      {overlay}
    </div>
  );
}

function StudentGoldenOverlay() {
  return <div className="student-golden-overlay" aria-hidden="true" />;
}

function StudentSidebar({ onAction }: { onAction: (action: string) => void }) {
  return (
    <aside className="student-sidebar" aria-label="Навигация ученика" data-testid="student-sidebar">
      <a className="student-logo" href="/design-preview/student-dashboard" aria-label="Алхимик STEM-платформа">
        <span className="student-logo__mark" aria-hidden="true" />
        <span>
          <strong>Алхимик</strong>
          <small>STEM-платформа</small>
        </span>
      </a>
      <nav className="student-nav">
        {sidebarItems.map((item) => (
          <a key={item.label} href="/design-preview/student-dashboard" aria-current={item.label === "Главная" ? "page" : undefined} className={item.label === "Главная" ? "is-active" : undefined}>
            <span className="student-nav__icon"><ScienceIcon name={item.icon} variant="nav" /></span>
            <span>{item.label}</span>
            {item.badge ? <em>{item.badge}</em> : null}
          </a>
        ))}
      </nav>
      <section className="student-license-card" aria-label="Расширенная лицензия">
        <span>Расширенная лицензия</span>
        <strong>Открой все возможности платформы</strong>
        <i className="student-license-card__art" aria-hidden="true" />
        <button type="button" onClick={() => onAction("Открыта карточка расширенной лицензии")}>Подробнее</button>
      </section>
      <button className="student-collapse" type="button" onClick={() => onAction("Меню свернуто")}>Свернуть меню</button>
    </aside>
  );
}

function StudentTopbar({ onAction }: { onAction: (action: string) => void }) {
  return (
    <header className="student-topbar" aria-label="Верхняя панель" data-testid="student-topbar">
      <StudentGreeting />
      <label className="student-search">
        <span>Поиск</span>
        <ScienceIcon name="search" />
        <input type="search" placeholder="Поиск по темам, заданиям, курсам..." />
      </label>
      <div className="student-topbar__actions">
        <button type="button" aria-label="Уведомления" className="student-icon-button" onClick={() => onAction("Открыты уведомления")}><ScienceIcon name="bell" /><span>{demoData.notifications.count}</span></button>
        <button type="button" aria-label="Календарь" className="student-icon-button" onClick={() => onAction("Открыт календарь")}><ScienceIcon name="calendar" /></button>
        <button type="button" className="student-profile" onClick={() => onAction("Открыт профиль ученика")}><span aria-hidden="true">{demoData.user.name.slice(0, 1)}</span><strong>{demoData.user.name}</strong><small>{demoData.user.grade}</small></button>
      </div>
    </header>
  );
}

function StudentGreeting() {
  return (
    <div className="student-topbar__greeting" data-testid="student-greeting">
      <h1 id="student-greeting">{demoData.user.greeting} <span aria-hidden="true">👋</span></h1>
      <p>{demoData.user.subtitle}</p>
    </div>
  );
}

function ContinueLearningCard({ onContinue }: { onContinue: () => void }) {
  return (
    <article className="student-card student-card--feature student-card--chemistry" data-testid="continue-learning-card">
      <div className="student-card__content">
        <div className="student-card__eyebrow">{demoData.continueLearning.eyebrow} <Badge>{demoData.continueLearning.subject}</Badge></div>
        <h2>{demoData.continueLearning.title}</h2>
        <div className="student-progress-line"><strong>{demoData.continueLearning.progressPercent}%</strong><span><i style={{ width: `${demoData.continueLearning.progressPercent}%` }} /></span><small>{demoData.continueLearning.progressLabel}</small></div>
        <PrimaryButton onClick={onContinue}>{demoData.continueLearning.cta} <span>→</span></PrimaryButton>
      </div>
      <div className="student-science-visual student-science-visual--flask" aria-hidden="true">
        <span className="flask-bulb" />
        <span className="molecule-dot dot-1" />
        <span className="molecule-dot dot-2" />
        <span className="molecule-dot dot-3" />
      </div>
    </article>
  );
}

function LiveLessonCard({ joined, onJoin }: { joined: boolean; onJoin: () => void }) {
  return (
    <article className="student-card student-card--feature student-card--lesson" data-testid="live-lesson-card">
      <div className="student-card__content">
        <div className="student-card__eyebrow">{demoData.liveLesson.eyebrow} <Badge>{demoData.liveLesson.subject}</Badge></div>
        <h2>{demoData.liveLesson.title}</h2>
        <p>{demoData.liveLesson.time}</p>
        <p>{demoData.liveLesson.teacher}</p>
        <PrimaryButton onClick={onJoin}>{joined ? demoData.liveLesson.joinedCta : demoData.liveLesson.joinCta}</PrimaryButton>
      </div>
      <div className="student-science-visual student-science-visual--physics" aria-hidden="true">
        <span /><span /><span /><span />
      </div>
    </article>
  );
}

function AIRecommendationsCard({ onAction }: { onAction: (action: string) => void }) {
  return (
    <article className="student-card student-ai-card" aria-label="AI-рекомендации" data-testid="ai-recommendations-card">
      <header><h2>AI-рекомендации</h2></header>
      <ul>
        {recommendations.map((item, index) => (
          <li key={item.title}><span><ScienceIcon name={index === 1 ? "physics" : index === 2 ? "chemistry" : "ai"} /></span><div><strong>{item.title}</strong><small>{item.meta}</small></div></li>
        ))}
      </ul>
      <a href="/design-preview/student-dashboard" onClick={(event) => { event.preventDefault(); onAction("Открыты все AI-рекомендации"); }}>Все рекомендации →</a>
    </article>
  );
}

function QuickAccessStrip({ onAction }: { onAction: (action: string) => void }) {
  return (
    <section className="student-card student-quick" aria-label="Быстрый доступ" data-testid="quick-access-strip">
      <header><h2>Быстрый доступ</h2></header>
      <div className="student-quick__grid">
        {quickAccess.map((item) => (
          <button type="button" key={item.label} className="student-quick__item" onClick={() => onAction(`Быстрый доступ: ${item.label}`)}>
            {item.badge ? <span className="student-quick__badge">{item.badge}</span> : null}
            <i><ScienceIcon name={item.icon as IconName} variant="quick" /></i>
            <strong>{item.label}</strong>
          </button>
        ))}
        <button type="button" className="student-quick__item student-quick__item--ai" onClick={() => onAction("Быстрый доступ: AI-наставник")}><i><ScienceIcon name="ai" variant="quick" /></i><strong>AI-наставник</strong><span>→</span></button>
      </div>
    </section>
  );
}

function AssignmentsCard({ onAction }: { onAction: (action: string) => void }) {
  return (
    <article className="student-card student-assignments" data-testid="assignments-card">
      <CardTitle title="Задания от учителя" action="Все задания →" onAction={() => onAction("Открыты все задания")} />
      <ul>
        {assignments.map((item) => (
          <li key={item.title}>
            <span className={`student-subject-dot student-subject-dot--${item.tone}`}><ScienceIcon name={item.subject === "Химия" ? "chemistry" : item.subject === "Физика" ? "physics" : "biology"} /></span>
            <div><strong>{item.title}</strong><small>{item.subject} · {item.meta}</small></div>
            <em className={`student-status student-status--${item.tone}`}>{item.status}</em>
          </li>
        ))}
      </ul>
      <a href="/design-preview/student-dashboard" onClick={(event) => { event.preventDefault(); onAction("Открыты все задания"); }}>Все задания →</a>
    </article>
  );
}

function SubjectProgressCard({ onAction }: { onAction: (action: string) => void }) {
  return (
    <article className="student-card student-progress-card" data-testid="subject-progress-card">
      <CardTitle title="Мой прогресс" action="Подробнее →" onAction={() => onAction("Открыт подробный прогресс")} />
      <div className="student-progress-rings">
        {subjectProgress.map((item) => (
          <ProgressRing item={item} key={item.title} />
        ))}
      </div>
    </article>
  );
}

function WeakTopicsCard({ topicHint, repeatedTopics, onRepeat }: { topicHint: string; repeatedTopics: Set<string>; onRepeat: (topic: string) => void }) {
  return (
    <article className="student-card student-weak" data-testid="weak-topics-card">
      <CardTitle title="Слабые темы" action={topicHint} />
      <ul>
        {weakTopics.map((topic) => {
          const active = repeatedTopics.has(topic.title);
          return (
            <li key={topic.title}>
              <span><ScienceIcon name={topic.subject === "Химия" ? "chemistry" : topic.subject === "Физика" ? "physics" : "biology"} /></span>
              <div><strong>{topic.title}</strong><small>{topic.subject}</small></div>
              <button type="button" onClick={() => onRepeat(topic.title)}><ScienceIcon name="repeat" />{active ? "Повторяется" : "Повторить"}</button>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

function PopularNowCard({ onAction }: { onAction: (action: string) => void }) {
  return (
    <article className="student-card student-popular" data-testid="popular-now-card">
      <CardTitle title="Популярные сейчас" action="Смотреть все →" onAction={() => onAction("Открыт каталог популярного контента")} />
      <div className="student-popular__grid">
        {popular.map((item, index) => (
          <a href="/design-preview/student-dashboard" key={item.title} onClick={(event) => { event.preventDefault(); onAction(`Открыт популярный материал: ${item.title}`); }}>
            <span className={`student-popular__image student-popular__image--${index + 1}`} />
            <strong>{item.title}</strong>
            <small>{item.meta}</small>
          </a>
        ))}
      </div>
    </article>
  );
}

function WeeklyProgressCard() {
  return (
    <article className="student-card student-week" data-testid="weekly-progress-card">
      <h2>{demoData.weeklyProgress.title}</h2>
      <strong>{demoData.weeklyProgress.deltaLabel}</strong>
      <small>{demoData.weeklyProgress.subtitle}</small>
      <div className="student-week__chart" aria-label="График недельного прогресса">
        {demoData.weeklyProgress.bars.map((height, index) => <span key={index} style={{ height: `${height}%` }} />)}
      </div>
    </article>
  );
}

function LockedFeatureCard({ requested, onRequest }: { requested: boolean; onRequest: () => void }) {
  return (
    <article className="student-card student-locked" data-testid="locked-feature-card">
      <div>
        <span className="student-lock"><ScienceIcon name="lock" /></span>
        <h2>{demoData.lockedFeature.eyebrow}</h2>
        <h3>{demoData.lockedFeature.title}</h3>
        <p>{demoData.lockedFeature.subtitle}</p>
        <button type="button" onClick={onRequest}>{requested ? demoData.lockedFeature.requestedCta : demoData.lockedFeature.cta}</button>
      </div>
      <div className="student-anatomy-preview" aria-hidden="true" />
    </article>
  );
}

function AIAssistantWidget({ open, onToggle, onAction }: { open: boolean; onToggle: () => void; onAction: (action: string) => void }) {
  return (
    <aside className={`student-assistant ${open ? "is-open" : ""}`} aria-label="AI-наставник" data-testid="ai-assistant-widget">
      <button type="button" className="student-assistant__bubble" onClick={onToggle} aria-expanded={open}>
        <span className="student-assistant__face" aria-hidden="true" />
        <strong>{demoData.assistantState.bubbleText}</strong>
      </button>
      {open ? (
        <div className="student-assistant__panel">
          <header><strong>{demoData.assistantState.title}</strong><button type="button" onClick={onToggle} aria-label="Закрыть"><ScienceIcon name="close" /></button></header>
          <p>{demoData.assistantState.message}</p>
          <button type="button" onClick={() => onAction("AI-наставник открыл подсказку")}>{demoData.assistantState.cta}</button>
        </div>
      ) : null}
    </aside>
  );
}

function ProgressRing({ item }: { item: { subject: SubjectTheme; title: string; value: number; meta: string } }) {
  return (
    <div className={`student-progress-ring student-progress-ring--${item.subject}`} style={{ "--progress": `${item.value}%` } as React.CSSProperties}>
      <span>{item.value}%</span>
      <strong>{item.title}</strong>
      <small>{item.meta}</small>
    </div>
  );
}

function PrimaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button type="button" className="student-primary-button" onClick={onClick}>{children}</button>;
}

function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`student-badge ${className}`.trim()}>{children}</span>;
}

function CardTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <header className="student-card-title">
      <h2>{title}</h2>
      {action ? <a href="/design-preview/student-dashboard" onClick={(event) => { event.preventDefault(); onAction?.(); }}>{action}</a> : null}
    </header>
  );
}

function ScienceIcon({ name, variant = "status" }: { name: IconName; variant?: "nav" | "quick" | "status" }) {
  const cleanIconRoot = "/design-assets/student-dashboard/clean/icons";
  const navPaths: Partial<Record<IconName, string>> = {
    home: "nav-home.svg",
    courses: "nav-courses.svg",
    theory: "nav-theory.svg",
    assignments: "nav-tasks.svg",
    lab: "nav-labs.svg",
    visualization: "nav-visualization.svg",
    references: "nav-references.svg",
    exams: "nav-exams.svg",
    diagnostics: "nav-diagnostics.svg",
    ai: "nav-ai-mentor.svg",
    progress: "nav-progress.svg",
    messages: "nav-messages.svg",
    settings: "nav-settings.svg",
  };
  const quickPaths: Partial<Record<IconName, string>> = {
    theory: "quick-theory.svg",
    assignments: "quick-tasks.svg",
    lab: "quick-labs.svg",
    molecule: "quick-3d-molecules.svg",
    periodic: "quick-periodic-table.svg",
    simulator: "quick-simulators.svg",
    microscope: "quick-microscope.svg",
    exams: "quick-exams.svg",
    ai: "quick-ai-mentor.svg",
  };
  const statusPaths: Partial<Record<IconName, string>> = {
    search: "search.svg",
    bell: "bell.svg",
    calendar: "calendar.svg",
    chemistry: "quick-labs.svg",
    physics: "quick-simulators.svg",
    biology: "quick-microscope.svg",
    molecule: "quick-3d-molecules.svg",
    periodic: "quick-periodic-table.svg",
    simulator: "quick-simulators.svg",
    microscope: "quick-microscope.svg",
    lock: "lock.svg",
    repeat: "repeat.svg",
    close: "close.svg",
    ai: "quick-ai-mentor.svg",
  };
  const fileName = (variant === "nav" ? navPaths[name] : variant === "quick" ? quickPaths[name] : statusPaths[name]) ?? statusPaths[name] ?? navPaths[name] ?? quickPaths[name];

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <use href={`${cleanIconRoot}/${fileName}#icon`} />
    </svg>
  );
}
