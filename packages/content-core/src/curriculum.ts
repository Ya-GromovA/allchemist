import type { CurriculumMap, Subject, Topic } from "./types";

export function topicsForCurriculum(map: CurriculumMap, topics: Topic[]): Topic[] {
  const allowed = new Set(map.topicIds);
  return topics.filter((topic) => topic.subject === map.subject && allowed.has(topic.id));
}

export function normalizeSubject(value: string): Subject {
  if (value === "chemistry" || value === "physics" || value === "biology" || value === "ai_mentor") return value;
  return "general";
}
