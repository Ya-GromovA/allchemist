import type { AssistantVisualState } from "@allchemist/ai-assistant";

export type StudentSubject = "chemistry" | "physics" | "biology";
export type TaskStatus = "todo" | "in_progress" | "done";
export type ModuleStatus = "active" | "locked" | "review";
export type DashboardTone = "info" | "success" | "warning" | "neutral";

export interface DashboardAssetSet {
  logo: string;
  chemistryHero: string;
  liveLesson: string;
  lockedAnatomy: string;
  assistantRobot: string;
}

export interface SidebarItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  active?: boolean;
  badge?: string;
  matchPaths?: string[];
  children?: SidebarChildItem[];
}

export interface SidebarChildItem {
  id: string;
  label: string;
  href: string;
  matchPaths?: string[];
}

export interface QuickAccessItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  badge?: string;
  status?: "available" | "new" | "locked";
}

export interface TeacherTask {
  id: string;
  subject: StudentSubject;
  title: string;
  dueLabel: string;
  status: TaskStatus;
}

export interface WeakTopic {
  id: string;
  subject: StudentSubject;
  title: string;
  actionLabel: string;
  reason: string;
}

export interface PopularContent {
  id: string;
  subject: StudentSubject;
  type: "experiment" | "simulation" | "model" | "lesson";
  title: string;
  meta: string;
  image: string;
  route: string;
}

export interface WeeklyProgressPoint {
  day: string;
  value: number;
}

export interface ApprovedStudentDashboardSource {
  generatedAt: string;
  learner: {
    id: string;
    name: string;
    grade: string;
    school: string;
    avatarInitials: string;
    avatarImage: string;
    streakDays: number;
  };
  topbar: {
    greeting: string;
    subtitle: string;
    searchPlaceholder: string;
    notificationCount: number;
  };
  assets: DashboardAssetSet;
  sidebarItems: SidebarItem[];
  modules: Array<{ id: StudentSubject; title: string; status: ModuleStatus; progress: number; completed: number; total: number }>;
  currentCourses: Array<{
    id: string;
    subject: StudentSubject;
    title: string;
    lessonTitle: string;
    progress: number;
    nextAction: string;
    image: string;
  }>;
  liveLesson: {
    id: string;
    subject: StudentSubject;
    label: string;
    title: string;
    subtitle: string;
    timeLabel: string;
    teacher: string;
    actionLabel: string;
    image: string;
  };
  aiRecommendations: Array<{ id: string; subject: StudentSubject; title: string; subtitle: string; icon: string }>;
  quickAccess: QuickAccessItem[];
  recommendedLessons: Array<{ id: string; subject: StudentSubject; title: string; meta: string; reason: string }>;
  upcomingTasks: TeacherTask[];
  weakTopics: WeakTopic[];
  popularContent: PopularContent[];
  weeklyProgress: {
    title: string;
    delta: string;
    caption: string;
    explanation: string;
    points: WeeklyProgressPoint[];
  };
  lockedFeature: {
    title: string;
    requiredLicense: string;
    subtitle: string;
    actionLabel: string;
    image: string;
  };
  labs: Array<{ id: string; subject: StudentSubject; title: string; status: "available" | "locked"; durationMin: number; safety: string }>;
  aiHints: Array<{ id: string; state: AssistantVisualState; title: string; body: string; cta: string; priority: "normal" | "high" }>;
  achievements: Array<{ id: string; title: string; value: string; tone: "info" | "success" | "warning" }>;
}

export interface ApprovedStudentDashboardViewModel extends ApprovedStudentDashboardSource {
  greeting: string;
  progressAverage: number;
  nextCourse: ApprovedStudentDashboardSource["currentCourses"][number];
  nextTaskCount: number;
  availableLabCount: number;
  assistantContext: {
    subject: StudentSubject;
    moduleId: string;
    topicTitle: string;
    taskId?: string;
  };
}

export interface StudentDashboardModuleMetric {
  id: StudentSubject;
  title: string;
  label: string;
  status: ModuleStatus;
  progress: number;
  completedLabel: string;
  accentClass: string;
}

export function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function subjectLabel(subject: StudentSubject): string {
  return subject === "chemistry" ? "Химия" : subject === "physics" ? "Физика" : "Биология";
}

export function subjectAccentClass(subject: StudentSubject): string {
  return `subject-${subject}`;
}

export function taskStatusLabel(status: TaskStatus): string {
  if (status === "done") return "Выполнено";
  if (status === "in_progress") return "В процессе";
  return "Не выполнено";
}

export function taskTone(status: TaskStatus): DashboardTone {
  if (status === "done") return "success";
  if (status === "in_progress") return "warning";
  return "info";
}

export function adaptApprovedStudentDashboard(source: ApprovedStudentDashboardSource): ApprovedStudentDashboardViewModel {
  const modules = source.modules.map((module) => ({ ...module, progress: clampPercent(module.progress) }));
  const progressAverage = clampPercent(modules.reduce((sum, module) => sum + module.progress, 0) / Math.max(1, modules.length));
  const nextCourse = source.currentCourses[0];
  if (!nextCourse) throw new Error("Student dashboard requires at least one current course.");
  const nextTask = source.upcomingTasks.find((task) => task.status !== "done");

  const assistantContext: ApprovedStudentDashboardViewModel["assistantContext"] = nextTask
    ? { subject: nextCourse.subject, moduleId: nextCourse.id, topicTitle: nextCourse.lessonTitle, taskId: nextTask.id }
    : { subject: nextCourse.subject, moduleId: nextCourse.id, topicTitle: nextCourse.lessonTitle };

  return {
    ...source,
    modules,
    currentCourses: source.currentCourses.map((course) => ({ ...course, progress: clampPercent(course.progress) })),
    progressAverage,
    nextCourse: { ...nextCourse, progress: clampPercent(nextCourse.progress) },
    greeting: source.topbar.greeting,
    nextTaskCount: source.upcomingTasks.filter((task) => task.status !== "done").length,
    availableLabCount: source.labs.filter((lab) => lab.status === "available").length,
    assistantContext,
  };
}

export function toModuleMetrics(data: ApprovedStudentDashboardViewModel): StudentDashboardModuleMetric[] {
  return data.modules.map((module) => ({
    ...module,
    label: subjectLabel(module.id),
    completedLabel: `${module.completed}/${module.total} тем`,
    accentClass: subjectAccentClass(module.id),
  }));
}
