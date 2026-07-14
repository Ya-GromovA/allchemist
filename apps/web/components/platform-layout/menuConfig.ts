import type { ShellMenuItem, ShellUser } from "./layoutTypes";

export const fixedStudentMenu: ShellMenuItem[] = [
  { id: "home", label: "Главная", href: "/dashboard/student", icon: "home" },
  { id: "courses", label: "Мои курсы", href: "/modules", icon: "courses" },
  { id: "theory", label: "Теория", href: "/theory", icon: "theory" },
  { id: "tasks", label: "Задания", href: "/tasks", icon: "tasks" },
  { id: "labs", label: "Лаборатории", href: "/labs", icon: "labs" },
  {
    id: "visualization",
    label: "Визуализация",
    href: "/modules/visualization",
    icon: "visualization",
    children: [
      { id: "molecules", label: "3D-молекулы", href: "/modules/visualization/molecules" },
      { id: "simulators", label: "Симуляторы", href: "/modules/physics" },
      { id: "microscope", label: "Микроскоп", href: "/modules/biology" },
      { id: "cell3d", label: "3D-клетка", href: "/modules/biology/cell" },
      { id: "anatomy", label: "Анатомия", href: "/modules/biology/anatomy" },
    ],
  },
  {
    id: "references",
    label: "Справочники",
    href: "/reference",
    icon: "references",
    children: [
      { id: "periodic", label: "Таблица элементов", href: "/reference/periodic-table" },
      { id: "formulas", label: "Формулы", href: "/reference/formulas" },
      { id: "bio-schemes", label: "Биологические схемы", href: "/reference/biology-schemes" },
      { id: "substances", label: "Справочник веществ", href: "/reference/substances" },
    ],
  },
  { id: "exams", label: "Экзамены", href: "/exams", icon: "exams" },
  { id: "diagnostics", label: "Диагностика", href: "/diagnostics", icon: "diagnostics" },
  { id: "ai", label: "AI-наставник", href: "/assistant", icon: "ai" },
  { id: "progress", label: "Прогресс", href: "/progress", icon: "progress" },
  { id: "messages", label: "Сообщения", href: "/messages", icon: "messages", badge: "3" },
  { id: "settings", label: "Настройки", href: "/settings", icon: "settings" },
];

export const defaultShellUser: ShellUser = {
  name: "Иван Петрович",
  role: "Ученик",
  initials: "ИП",
};
