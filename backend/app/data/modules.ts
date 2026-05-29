// app/data/modules.ts

export interface Module {
  id: string;
  title: string;
  description: string;
  available: boolean;
}

/**
 * Локальный список модулей, который всегда доступен офлайн.
 * Позже сюда можно добавлять дополнительные поля (иконки, прогресс и т.п.).
 */
export const LOCAL_MODULES: Module[] = [
  {
    id: "chemistry",
    title: "Chemistry Lab",
    description:
      "Интерактивные молекулы, реакции и конструктор химических структур.",
    available: true
  },
  {
    id: "physics",
    title: "Physics Playground",
    description:
      "Симуляции движения тел, гравитации и эксперименты по механике.",
    available: true
  },
  {
    id: "ai_mentor",
    title: "AI Mentor",
    description:
      "Персональный помощник по STEM-вопросам с адаптивными подсказками.",
    available: true
  },
  {
    id: "biology",
    title: "Biology Explorer",
    description:
      "Клетки, ДНК, генетика и визуализация живых систем (в разработке).",
    available: false
  },
  {
    id: "math",
    title: "Math Studio",
    description:
      "Визуальная математика, графики, уравнения и тренажёры (в разработке).",
    available: false
  }
];
