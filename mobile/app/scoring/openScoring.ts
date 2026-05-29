function norm(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9\s]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s: string): string[] {
  const t = norm(s).split(" ").filter(Boolean);
  // выкидываем очень короткие “шумы”
  return t.filter((x) => x.length >= 3);
}

function ngrams(arr: string[], n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i + n <= arr.length; i++) out.push(arr.slice(i, i + n).join("_"));
  return out;
}

function dice(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return (2 * inter) / (a.size + b.size);
}

function containsSoft(hay: string, needle: string): boolean {
  const h = norm(hay);
  const n = norm(needle);
  if (!n) return false;
  return h.includes(n);
}

export type OpenRubric = {
  max_score?: number; // обычно 1
  criteria?: Array<{
    id: string;
    weight: number;           // 0..1
    keywords_any?: string[];  // любые совпадения
    phrases_any?: string[];   // фразы
    desc?: string;
  }>;
};

export function scoreOpenAnswer(answerText: string, payload: any): { score: number; completed: 0 | 1; debug: any } {
  const text = answerText?.trim() ?? "";
  const completed: 0 | 1 = text ? 1 : 0;
  if (!completed) return { score: 0, completed, debug: { reason: "empty" } };

  const rubric: OpenRubric | undefined = payload?.rubric;
  const expectedAny: string[] = Array.isArray(payload?.expected_text_any) ? payload.expected_text_any : [];

  // 1) rubric score
  let rubricScore = 0;
  let rubricMax = 0;

  if (rubric?.criteria?.length) {
    const aNorm = norm(text);

    for (const c of rubric.criteria) {
      const w = Number(c.weight ?? 0);
      if (w <= 0) continue;
      rubricMax += w;

      const keys = Array.isArray(c.keywords_any) ? c.keywords_any : [];
      const phrases = Array.isArray(c.phrases_any) ? c.phrases_any : [];

      const hitKey = keys.some((k) => containsSoft(aNorm, k));
      const hitPhrase = phrases.some((p) => containsSoft(aNorm, p));

      if (hitKey || hitPhrase) rubricScore += w;
    }

    if (rubricMax > 0) rubricScore = Math.min(1, rubricScore / rubricMax);
  } else {
    // если рубрики нет — считаем “внятный ответ” как 0.6
    rubricScore = 0.6;
  }

  // 2) similarity to expected fragments
  let simScore = 0;
  if (expectedAny.length) {
    const aTok = tokens(text);
    const aSet = new Set([...aTok, ...ngrams(aTok, 2)]);

    let best = 0;
    for (const exp of expectedAny) {
      const eTok = tokens(exp);
      const eSet = new Set([...eTok, ...ngrams(eTok, 2)]);
      best = Math.max(best, dice(aSet, eSet));
    }
    simScore = best; // 0..1
  }

  // 3) combine
  // rubric — основное (0.7), similarity — дополнительное (0.3)
  let score = 0.7 * rubricScore + 0.3 * simScore;

  // лёгкий “буст”, если ответ достаточно длинный
  const len = tokens(text).length;
  if (len >= 18) score = Math.min(1, score + 0.05);

  score = Math.max(0, Math.min(1, score));

  const maxScore = Number(rubric?.max_score ?? 1) || 1;
  score = Math.max(0, Math.min(maxScore, score));

  return {
    score,
    completed,
    debug: { rubricScore, simScore, tokenCount: len }
  };
}
