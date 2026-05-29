export function scoreOpenAnswer(answer: string, rubric?: any): number {
  if (!rubric || !rubric.criteria || !Array.isArray(rubric.criteria)) return answer.trim() ? 0.6 : 0;

  const a = answer.toLowerCase();
  const max = Number(rubric.max_score ?? 1) || 1;

  let s = 0;
  for (const c of rubric.criteria) {
    const weight = Number(c.weight ?? 0);
    const keys: string[] = Array.isArray(c.keywords_any) ? c.keywords_any : [];
    const hit = keys.some((k) => a.includes(String(k).toLowerCase()));
    if (hit) s += weight;
  }

  // нормируем к max_score
  if (s > 1) s = 1;
  return Math.max(0, Math.min(max, s * max));
}
