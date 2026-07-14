import type { ModuleProgress, ProgressEvent } from "./types";

export function calculateProgressPct(completedCount: number, totalCount: number): number {
  if (totalCount <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((completedCount / totalCount) * 100)));
}

export function aggregateModuleProgress(userId: string, moduleId: string, totalCount: number, events: ProgressEvent[]): ModuleProgress {
  const completed = new Set(
    events
      .filter((event) => event.userId === userId && event.moduleId === moduleId && event.result === "completed" && event.contentId)
      .map((event) => event.contentId as string),
  );

  return {
    userId,
    moduleId,
    completedCount: completed.size,
    totalCount,
    progressPct: calculateProgressPct(completed.size, totalCount),
    weakSkillIds: [],
  };
}
