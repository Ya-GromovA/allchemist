import React, { useEffect, useMemo, useState } from "react";
import {
  Animated,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  TextInput,
  ListRenderItemInfo,
  Easing,
} from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useI18n } from "@app/i18n";
import { execSql } from "@app/db/database";
import { contentUpdateService } from "@app/services/contentUpdateService";
import type { RootStackParamList } from "@app/navigation/RootNavigator";
import { CHEMISTRY_CATALOG_TOPICS } from "@app/chemistry/chemistryLessonsCatalog";
import type { CatalogTopic } from "@app/chemistry/chemistryLessonsCatalog";
import type { ChemistryTheoryBlock, ChemistryTheoryMode } from "@app/chemistry/chemistryContentSchema";

type Nav = NativeStackNavigationProp<RootStackParamList, "ChemistryLessons">;
type R = RouteProp<RootStackParamList, "ChemistryLessons">;

type LessonRow = {
  id: number;
  title: string;
  description: string;
  tasks_json: string;
  order_index: number;
  payload_json?: string | null;
};

type TopicItem = {
  key: string;
  title: string;
  summary: string;
  grade: string;
  book: string;
  author: string;
  structured: CatalogTopic;
  source: "db" | "catalog";
  lessonId?: number;
  taskIds?: string[];
};

const FIXED_GRADES = ["7", "8", "9", "10", "11"];

function safeJsonParse(s: string | null | undefined): any {
  try {
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
}

function normalizeGrade(raw: any): string {
  const s = String(raw ?? "").trim();
  const m = s.match(/(7|8|9|10|11)/);
  if (m?.[1]) return m[1];
  return "8";
}

function pickGradeFromLesson(lesson: LessonRow): string {
  const p = safeJsonParse(lesson.payload_json);
  if (p.grade || p.class || p.class_name) return normalizeGrade(p.grade ?? p.class ?? p.class_name);

  const fromText = `${lesson.title} ${lesson.description}`.match(/(7|8|9|10|11)\s*класс/i);
  if (fromText?.[1]) return fromText[1];

  return "8";
}

function pickBookAuthor(lesson: LessonRow): { book: string; author: string } {
  const p = safeJsonParse(lesson.payload_json);
  const book = String(p.book ?? p.textbook ?? "Базовый курс химии").trim();
  const author = String(p.author ?? p.authors ?? "Коллектив авторов").trim();
  return { book: book || "Базовый курс химии", author: author || "Коллектив авторов" };
}

function extractTaskIds(lesson: LessonRow): string[] {
  const p = safeJsonParse(lesson.payload_json);
  const fromPayload = Array.isArray(p.task_ids) ? p.task_ids.map(String) : [];
  if (fromPayload.length) return fromPayload;

  try {
    const arr = JSON.parse(lesson.tasks_json);
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}

async function loadLessons(lang: "ru" | "en"): Promise<LessonRow[]> {
  const rows = await execSql(
    `SELECT id, title, COALESCE(description,'') AS description, COALESCE(tasks_json,'[]') AS tasks_json,
            COALESCE(order_index,0) AS order_index, payload_json
     FROM lesson_blocks
     WHERE module_id='chemistry' AND (lang=? OR lang IS NULL OR lang='')
     ORDER BY order_index ASC, id ASC;`,
    [lang]
  );

  return rows.map((r: any) => ({
    id: Number(r.id),
    title: String(r.title ?? ""),
    description: String(r.description ?? ""),
    tasks_json: String(r.tasks_json ?? "[]"),
    order_index: Number(r.order_index ?? 0),
    payload_json: r.payload_json ?? null,
  }));
}

function lessonsToTopics(rows: LessonRow[]): TopicItem[] {
  return rows.map((l) => {
    const p = safeJsonParse(l.payload_json);
    const { book, author } = pickBookAuthor(l);
    const grade = pickGradeFromLesson(l);
    const content = String(p.content ?? l.description ?? "").trim() || "Теоретический материал будет добавлен в следующем обновлении.";
    const summary = String(l.description ?? "").trim() || String(p.type ?? "").trim() || "Тема урока";
    const structured: CatalogTopic = {
      id: `db-${l.id}`,
      grade,
      title: l.title,
      summary,
      bookLine: {
        id: `${grade}-${author}-${book}`.toLowerCase().replace(/[^a-zа-я0-9]+/gi, "-"),
        book,
        author,
      },
      theory: {
        gradeMode: {
          short: summary,
          full: content,
          explanation: String(p.explanation ?? `Разбираем тему через связи между понятиями, примерами и школьными реакциями. ${content}`),
          examples: Array.isArray(p.examples) ? p.examples.map(String) : ["Приведи один пример применения темы в задаче.", "Объясни тему на конкретном веществе или реакции."],
          keyTerms: Array.isArray(p.key_terms) ? p.key_terms.map(String) : [],
          formulaBlock: Array.isArray(p.formula_block) ? p.formula_block.map(String) : [],
          commonMistakes: Array.isArray(p.common_mistakes) ? p.common_mistakes.map(String) : ["Связывай определение темы с примером или уравнением."],
          miniCheck: Array.isArray(p.mini_check) ? p.mini_check.map(String) : ["Сможешь ли ты объяснить основную идею темы без подсказки?"],
        },
        bookLineMode: {
          short: `Тема по линии ${author}: ${summary}`,
          full: `В учебной линии ${author} тема раскрывается через структуру ${book}. ${content}`,
          explanation: String(p.explanation ?? `Сначала связываем тему с логикой учебной линии, потом показываем примеры и типовые задачи. ${content}`),
          examples: Array.isArray(p.examples) ? p.examples.map(String) : ["Найди пример в текущей теме учебной линии.", "Свяжи тему с предыдущим параграфом."],
          keyTerms: Array.isArray(p.key_terms) ? p.key_terms.map(String) : [],
          formulaBlock: Array.isArray(p.formula_block) ? p.formula_block.map(String) : [],
          commonMistakes: Array.isArray(p.common_mistakes) ? p.common_mistakes.map(String) : ["Не смешивай язык учебной линии с простым пересказом без проверки смысла."],
          miniCheck: Array.isArray(p.mini_check) ? p.mini_check.map(String) : ["Какая формулировка темы чаще всего встречается в школьном курсе?"],
        },
      },
      visuals: Array.isArray(p.visuals) ? p.visuals.map(String) : ["Схема темы", "Мини-анимация", "Карточка терминов"],
      examHints: Array.isArray(p.exam_hints)
        ? p.exam_hints
        : [
            { exam: "ОГЭ", prompt: "Проверь, какие задания по этой теме встречаются в базовой части." },
            { exam: "МЦКО", prompt: "Используй тему как материал для короткой проверочной работы." },
          ],
      parentNote: String(p.parent_note ?? "Попросите ученика объяснить тему простыми словами и привести один жизненный пример."),
      teacherNote: String(p.teacher_note ?? "Используйте тему как объяснительный блок перед задачами или лабораторной демонстрацией."),
    };

    return {
      key: `db-${l.id}`,
      title: l.title,
      summary,
      grade,
      book,
      author,
      structured,
      source: "db",
      lessonId: l.id,
      taskIds: extractTaskIds(l),
    };
  });
}

function catalogToTopics(): TopicItem[] {
  return CHEMISTRY_CATALOG_TOPICS.map((x) => ({
    key: `catalog-${x.id}`,
    title: x.title,
    summary: x.summary,
    grade: x.grade,
    book: x.bookLine.book,
    author: x.bookLine.author,
    structured: x,
    source: "catalog",
  }));
}

function blockForMode(topic: TopicItem, mode: ChemistryTheoryMode): ChemistryTheoryBlock {
  return mode === "bookline" ? topic.structured.theory.bookLineMode : topic.structured.theory.gradeMode;
}

export default function ChemistryLessonsScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<R>();
  const insets = useSafeAreaInsets();
  const { lang } = useI18n();
  const L = (lang === "ru" ? "ru" : "en") as "ru" | "en";

  const [loading, setLoading] = useState(false);
  const [topics, setTopics] = useState<TopicItem[]>([]);

  const [selectedTheoryMode, setSelectedTheoryMode] = useState<ChemistryTheoryMode>(route.params?.theoryMode ?? "grade");
  const [selectedGrade, setSelectedGrade] = useState<string>(route.params?.initialGrade ?? "8");
  const [selectedBookKey, setSelectedBookKey] = useState<string>("");
  const [activeTopicKey, setActiveTopicKey] = useState<string>("");
  const [search, setSearch] = useState("");
  const reveal = useState(new Animated.Value(0))[0];

  const focusLessonId = route.params?.focusLessonId;

  const reload = async () => {
    setLoading(true);
    try {
      const dbRows = await loadLessons(L);
      const merged = [...lessonsToTopics(dbRows), ...catalogToTopics()];

      const uniq = new Map<string, TopicItem>();
      for (const t of merged) {
        const k = `${t.grade}|${t.book}|${t.author}|${t.title}`.toLowerCase();
        if (!uniq.has(k) || t.source === "db") uniq.set(k, t);
      }

      const final = Array.from(uniq.values());
      setTopics(final);

      if (focusLessonId) {
        const hit = final.find((x) => x.lessonId === Number(focusLessonId));
        if (hit) {
          setSelectedGrade(hit.grade);
          setSelectedBookKey(`${hit.book}__${hit.author}`);
          setSelectedTheoryMode(route.params?.theoryMode ?? "grade");
          setActiveTopicKey(hit.key);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, [L]);

  useEffect(() => {
    Animated.timing(reveal, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [reveal]);

  const availableGrades = useMemo(() => {
    const present = new Set(topics.map((x) => x.grade));
    const all = [...FIXED_GRADES, ...Array.from(present)].filter((v, i, arr) => arr.indexOf(v) === i);
    return all.sort((a, b) => Number(a) - Number(b));
  }, [topics]);

  useEffect(() => {
    if (!availableGrades.includes(selectedGrade)) {
      setSelectedGrade(availableGrades[0] ?? "8");
    }
  }, [availableGrades.join("|"), selectedGrade]);

  const booksForGrade = useMemo(() => {
    const m = new Map<string, { book: string; author: string }>();
    for (const t of topics) {
      if (t.grade !== selectedGrade) continue;
      const key = `${t.book}__${t.author}`;
      if (!m.has(key)) m.set(key, { book: t.book, author: t.author });
    }
    return Array.from(m.entries()).map(([key, val]) => ({ key, ...val }));
  }, [topics, selectedGrade]);

  useEffect(() => {
    if (!booksForGrade.length) {
      setSelectedBookKey("");
      return;
    }
    if (!booksForGrade.some((x) => x.key === selectedBookKey)) {
      setSelectedBookKey(booksForGrade[0].key);
    }
  }, [booksForGrade.map((x) => x.key).join("|"), selectedBookKey]);

  const filteredTopics = useMemo(() => {
    const q = search.trim().toLowerCase();
    const source = topics.filter((t) => {
      if (t.grade !== selectedGrade) return false;
      if (selectedTheoryMode === "bookline" && selectedBookKey && `${t.book}__${t.author}` !== selectedBookKey) return false;
      if (!q) return true;
      const theoryBlock = blockForMode(t, selectedTheoryMode);
      const hay = `${t.title} ${t.summary} ${theoryBlock.short} ${theoryBlock.full}`.toLowerCase();
      return hay.includes(q);
    });
    if (selectedTheoryMode === "bookline") return source;
    const uniq = new Map<string, TopicItem>();
    for (const item of source) {
      const key = `${item.grade}|${item.title}`.toLowerCase();
      if (!uniq.has(key) || item.source === "db") uniq.set(key, item);
    }
    return Array.from(uniq.values());
  }, [topics, selectedGrade, selectedBookKey, search, selectedTheoryMode]);

  const activeTopic = useMemo(() => filteredTopics.find((x) => x.key === activeTopicKey) ?? null, [filteredTopics, activeTopicKey]);

  useEffect(() => {
    if (!filteredTopics.length) {
      setActiveTopicKey("");
      return;
    }
    if (!filteredTopics.some((topic) => topic.key === activeTopicKey)) {
      setActiveTopicKey(filteredTopics[0].key);
    }
  }, [filteredTopics, activeTopicKey]);

  const onDownloadOffline = async () => {
    setLoading(true);
    try {
      await contentUpdateService.downloadSubjectOffline("chemistry");
      await reload();
    } finally {
      setLoading(false);
    }
  };

  const renderTopic = ({ item, index }: ListRenderItemInfo<TopicItem>) => {
    const selected = item.key === activeTopicKey;
    return (
      <Animated.View
        style={{
          opacity: reveal,
          transform: [
            {
              translateY: reveal.interpolate({
                inputRange: [0, 1],
                outputRange: [16 + index * 3, 0],
              }),
            },
          ],
        }}
      >
        <TouchableOpacity style={[styles.topicCard, selected && styles.topicCardSelected]} onPress={() => setActiveTopicKey(item.key)}>
          <Text style={styles.topicTitle}>{item.title}</Text>
          <Text style={styles.topicSummary} numberOfLines={3}>{item.summary}</Text>
          <Text style={styles.topicMeta}>{selectedTheoryMode === "bookline" ? `${item.book} • ${item.author}` : `${item.grade} класс • базовая теория`}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const activeBlock = activeTopic ? blockForMode(activeTopic, selectedTheoryMode) : null;

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 10,
            opacity: reveal,
            transform: [
              {
                translateY: reveal.interpolate({
                  inputRange: [0, 1],
                  outputRange: [14, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.title}>Уроки химии</Text>
        <Text style={styles.headerSubtitle}>Собираем новый chemistry flow: сначала режим теории, затем класс, тема и практика.</Text>

        <Text style={styles.stepTitle}>1) Выбери режим теории</Text>
        <View style={styles.rowWrap}>
          <TouchableOpacity style={[styles.modeChip, selectedTheoryMode === "grade" && styles.modeChipActive]} onPress={() => setSelectedTheoryMode("grade")}>
            <Text style={[styles.modeChipText, selectedTheoryMode === "grade" && styles.modeChipTextActive]}>Базовая теория по классу</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modeChip, selectedTheoryMode === "bookline" && styles.modeChipActive]} onPress={() => setSelectedTheoryMode("bookline")}>
            <Text style={[styles.modeChipText, selectedTheoryMode === "bookline" && styles.modeChipTextActive]}>По учебной линии</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.stepTitle}>2) Выбери класс</Text>
        <View style={styles.rowWrap}>
          {availableGrades.map((g) => (
            <TouchableOpacity key={g} style={[styles.chip, selectedGrade === g && styles.chipActive]} onPress={() => setSelectedGrade(g)}>
              <Text style={[styles.chipText, selectedGrade === g && styles.chipTextActive]}>{g} класс</Text>
            </TouchableOpacity>
          ))}
        </View>

        {selectedTheoryMode === "bookline" ? (
          <>
            <Text style={styles.stepTitle}>3) Выбери учебник и автора</Text>
            <View style={styles.rowWrap}>
              {booksForGrade.map((b) => (
                <TouchableOpacity key={b.key} style={[styles.bookChip, selectedBookKey === b.key && styles.bookChipActive]} onPress={() => setSelectedBookKey(b.key)}>
                  <Text style={[styles.bookTitle, selectedBookKey === b.key && styles.bookTitleActive]}>{b.book}</Text>
                  <Text style={[styles.bookAuthor, selectedBookKey === b.key && styles.bookTitleActive]}>{b.author}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Базовая теория по классу</Text>
            <Text style={styles.infoText}>В этом режиме показываем каноничное объяснение по уровню класса, без обязательной привязки к конкретному учебнику.</Text>
          </View>
        )}

        <Text style={styles.stepTitle}>{selectedTheoryMode === "bookline" ? "4) Выбери тему" : "3) Выбери тему"}</Text>
        <View style={styles.searchWrap}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            placeholder="Поиск темы"
            placeholderTextColor="#94a3b8"
          />
          {search.trim().length > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={() => setSearch("")}>
              <Text style={styles.clearBtnText}>x</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={[styles.refreshBtn, loading && { opacity: 0.65 }]} disabled={loading} onPress={onDownloadOffline}>
          <Text style={styles.refreshBtnText}>{loading ? "Обновление..." : "Обновить оффлайн-пакет химии"}</Text>
        </TouchableOpacity>
      </Animated.View>

      <FlatList
        data={filteredTopics}
        keyExtractor={(x) => x.key}
        renderItem={renderTopic}
        contentContainerStyle={{ padding: 14, paddingBottom: Math.max(16, insets.bottom + 14) }}
        ListEmptyComponent={<Text style={styles.empty}>Для выбранных параметров темы пока не найдены.</Text>}
      />

      {activeTopic && (
        <Animated.View
          style={[
            styles.topicDrawer,
            {
              opacity: reveal,
              transform: [
                {
                  translateY: reveal.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <ScrollView style={styles.drawerScroll} contentContainerStyle={styles.drawerScrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.drawerTitle}>{activeTopic.title}</Text>
          <Text style={styles.drawerMeta}>
            {selectedTheoryMode === "bookline" ? `${activeTopic.book} • ${activeTopic.author}` : `${activeTopic.grade} класс • базовая теория`}
          </Text>
          <View style={styles.modeBadgeRow}>
            <Text style={styles.modeBadge}>{selectedTheoryMode === "bookline" ? "Теория по учебной линии" : "Базовая теория по классу"}</Text>
          </View>
          <Text style={styles.sectionHeader}>Кратко</Text>
          <Text style={styles.drawerBody}>{activeBlock?.short}</Text>
          <Text style={styles.sectionHeader}>Подробно</Text>
          <Text style={styles.drawerBody}>{activeBlock?.full}</Text>

          {!!activeBlock?.explanation && (
            <>
              <Text style={styles.sectionHeader}>Объяснение</Text>
              <Text style={styles.drawerBody}>{activeBlock.explanation}</Text>
            </>
          )}

          {!!activeBlock?.examples.length && (
            <>
              <Text style={styles.sectionHeader}>Примеры</Text>
              {activeBlock.examples.map((item) => (
                <Text key={item} style={styles.drawerBullet}>• {item}</Text>
              ))}
            </>
          )}

          {!!activeBlock?.keyTerms.length && (
            <>
              <Text style={styles.sectionHeader}>Ключевые термины</Text>
              <View style={styles.inlineWrap}>
                {activeBlock.keyTerms.map((term) => (
                  <View key={term} style={styles.inlineChip}><Text style={styles.inlineChipText}>{term}</Text></View>
                ))}
              </View>
            </>
          )}

          {!!activeBlock?.formulaBlock.length && (
            <>
              <Text style={styles.sectionHeader}>Формулы и обозначения</Text>
              <View style={styles.inlineWrap}>
                {activeBlock.formulaBlock.map((formula) => (
                  <View key={formula} style={styles.inlineChip}><Text style={styles.inlineChipText}>{formula}</Text></View>
                ))}
              </View>
            </>
          )}

          {!!activeBlock?.commonMistakes.length && (
            <>
              <Text style={styles.sectionHeader}>Частые ошибки</Text>
              {activeBlock.commonMistakes.map((item) => (
                <Text key={item} style={styles.drawerBullet}>• {item}</Text>
              ))}
            </>
          )}

          {!!activeBlock?.miniCheck.length && (
            <>
              <Text style={styles.sectionHeader}>Мини-проверка после теории</Text>
              {activeBlock.miniCheck.map((item) => (
                <Text key={item} style={styles.drawerBullet}>• {item}</Text>
              ))}
            </>
          )}

          {!!activeTopic.structured.visuals.length && (
            <>
              <Text style={styles.sectionHeader}>Что должно быть в визуализации</Text>
              {activeTopic.structured.visuals.map((item) => (
                <Text key={item} style={styles.drawerBullet}>• {item}</Text>
              ))}
              <TouchableOpacity
                style={styles.visualBtn}
                onPress={() =>
                  nav.navigate("ChemistryVisual", {
                    topicTitle: activeTopic.title,
                    visuals: activeTopic.structured.visuals,
                    theoryMode: selectedTheoryMode,
                    grade: activeTopic.grade,
                    bookLabel: `${activeTopic.book} • ${activeTopic.author}`,
                  })
                }
              >
                <Text style={styles.visualBtnText}>Открыть иллюстрации и схемы</Text>
              </TouchableOpacity>
            </>
          )}

          {!!activeTopic.structured.examHints.length && (
            <>
              <Text style={styles.sectionHeader}>Связь с проверочными и экзаменами</Text>
              {activeTopic.structured.examHints.map((item) => (
                <Text key={`${item.exam}-${item.prompt}`} style={styles.drawerBullet}>• {item.exam}: {item.prompt}</Text>
              ))}
            </>
          )}

          <Text style={styles.sectionHeader}>Родителю</Text>
          <Text style={styles.drawerBody}>{activeTopic.structured.parentNote}</Text>
          <Text style={styles.sectionHeader}>Учителю</Text>
          <Text style={styles.drawerBody}>{activeTopic.structured.teacherNote}</Text>

          {activeTopic.lessonId && activeTopic.taskIds && activeTopic.taskIds.length > 0 && (
            <TouchableOpacity
              style={styles.openTasksBtn}
              onPress={() =>
                nav.navigate("ChemistryTask", {
                  lessonId: activeTopic.lessonId!,
                  taskIds: activeTopic.taskIds,
                  topicTitle: activeTopic.title,
                  theoryMode: selectedTheoryMode,
                  theoryShort: activeBlock?.short,
                  keyTerms: activeBlock?.keyTerms,
                })
              }
            >
              <Text style={styles.openTasksText}>Перейти к заданиям по теме</Text>
            </TouchableOpacity>
          )}
          {activeTopic.lessonId && activeTopic.taskIds && activeTopic.taskIds.length > 0 && (
            <TouchableOpacity
              style={styles.openFlowBtn}
              onPress={() =>
                nav.navigate("ChemistryTask", {
                  lessonId: activeTopic.lessonId!,
                  taskIds: activeTopic.taskIds!.slice(0, 5),
                  flowMode: "demo5",
                  topicTitle: activeTopic.title,
                  theoryMode: selectedTheoryMode,
                  theoryShort: activeBlock?.short,
                  keyTerms: activeBlock?.keyTerms,
                })
              }
            >
              <Text style={styles.openFlowText}>Demo flow: урок → 5 задач → разбор ошибок</Text>
            </TouchableOpacity>
          )}
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050816" },
  header: { paddingHorizontal: 14, paddingBottom: 10 },
  title: { color: "#e5e7eb", fontSize: 24, fontWeight: "900", marginBottom: 10 },
  headerSubtitle: { color: "#9ca3af", lineHeight: 18, marginBottom: 10 },
  stepTitle: { color: "#cbd5e1", fontWeight: "800", marginTop: 6, marginBottom: 6 },

  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  modeChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(52,211,153,0.28)",
    backgroundColor: "rgba(16,185,129,0.08)",
  },
  modeChipActive: { borderColor: "rgba(52,211,153,0.6)", backgroundColor: "rgba(16,185,129,0.18)" },
  modeChipText: { color: "#d1fae5", fontWeight: "800", fontSize: 12 },
  modeChipTextActive: { color: "#ecfdf5" },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  chipActive: { backgroundColor: "rgba(56,189,248,0.22)", borderColor: "rgba(56,189,248,0.6)" },
  chipText: { color: "#cbd5e1", fontWeight: "700" },
  chipTextActive: { color: "#e0f2fe" },

  bookChip: {
    minWidth: 152,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  bookChipActive: { backgroundColor: "rgba(34,197,94,0.18)", borderColor: "rgba(34,197,94,0.55)" },
  bookTitle: { color: "#e5e7eb", fontWeight: "800", fontSize: 12 },
  bookAuthor: { color: "#9ca3af", marginTop: 2, fontSize: 11 },
  bookTitleActive: { color: "#dcfce7" },
  infoCard: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.28)",
    backgroundColor: "rgba(30,41,59,0.4)",
    padding: 12,
  },
  infoTitle: { color: "#dbeafe", fontWeight: "900", fontSize: 13 },
  infoText: { color: "#cbd5e1", marginTop: 6, lineHeight: 18, fontSize: 12 },

  searchWrap: { marginTop: 8, position: "relative" },
  searchInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.06)",
    color: "#ffffff",
    fontFamily: "sans-serif",
    paddingHorizontal: 12,
    paddingRight: 42,
    paddingVertical: 10,
  },
  clearBtn: {
    position: "absolute",
    right: 10,
    top: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(2,6,23,0.55)",
  },
  clearBtnText: { color: "#cbd5e1", fontWeight: "900" },

  refreshBtn: {
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(51,195,255,0.24)",
    backgroundColor: "rgba(51,195,255,0.14)",
  },
  refreshBtnText: { color: "#e0f2fe", fontWeight: "800", textAlign: "center" },

  topicCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.06)",
    padding: 12,
    marginBottom: 10,
  },
  topicCardSelected: { borderColor: "rgba(125,211,252,0.7)", backgroundColor: "rgba(14,55,81,0.45)" },
  topicTitle: { color: "#e5e7eb", fontSize: 15, fontWeight: "900" },
  topicSummary: { color: "#9ca3af", marginTop: 5, lineHeight: 18 },
  topicMeta: { color: "#67e8f9", marginTop: 6, fontSize: 11 },
  empty: { color: "#9ca3af", textAlign: "center", marginTop: 20 },

  topicDrawer: {
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(7,10,24,0.98)",
    maxHeight: "52%",
  },
  drawerScroll: { paddingHorizontal: 14, paddingTop: 12 },
  drawerScrollContent: { paddingBottom: 14 },
  drawerTitle: { color: "#e5e7eb", fontSize: 16, fontWeight: "900" },
  drawerMeta: { color: "#93c5fd", marginTop: 4, fontSize: 12 },
  drawerBody: { color: "#cbd5e1", marginTop: 10, lineHeight: 20 },
  modeBadgeRow: { marginTop: 10 },
  modeBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(52,211,153,0.4)",
    backgroundColor: "rgba(16,185,129,0.18)",
    color: "#dcfce7",
    fontWeight: "900",
    fontSize: 11,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sectionHeader: { color: "#f8fafc", marginTop: 12, fontWeight: "900", fontSize: 13 },
  inlineWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  inlineChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.24)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inlineChipText: { color: "#e2e8f0", fontSize: 11, fontWeight: "800" },
  drawerBullet: { color: "#cbd5e1", marginTop: 8, lineHeight: 18 },
  openTasksBtn: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.45)",
    backgroundColor: "rgba(96,165,250,0.18)",
    alignItems: "center",
  },
  openTasksText: { color: "#dbeafe", fontWeight: "800" },
  visualBtn: {
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.5)",
    backgroundColor: "rgba(245,158,11,0.16)",
    alignItems: "center",
  },
  visualBtnText: { color: "#fef3c7", fontWeight: "900", fontSize: 12 },
  openFlowBtn: {
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.55)",
    backgroundColor: "rgba(34,197,94,0.18)",
    alignItems: "center",
  },
  openFlowText: { color: "#dcfce7", fontWeight: "900", fontSize: 12 },
});
