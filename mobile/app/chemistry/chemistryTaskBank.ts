export type ChemistryTaskTrack = "school" | "exam" | "advanced" | "quiz";
export type ChemistryTaskDifficulty = "basic" | "standard" | "advanced";
export type ChemistryTaskType =
  | "single_choice"
  | "multi_choice"
  | "open_answer"
  | "equation"
  | "calculation"
  | "matching"
  | "lab_case"
  | "timed_quiz";

export type ChemistryTaskItem = {
  id: string;
  grade: string;
  branch: string;
  track: ChemistryTaskTrack;
  topicId: string;
  title: string;
  taskType: ChemistryTaskType;
  difficulty: ChemistryTaskDifficulty;
  question: string;
  correctAnswer: string | string[];
  explanation: string;
  mistakeTags: string[];
  timedExpectedSeconds: number;
  sourceType: "official" | "editorial" | "generated";
  verified: boolean;
};

export const CHEMISTRY_TASK_BANK_SEED: ChemistryTaskItem[] = [
  {
    id: "chem7-mixtures-basic-1",
    grade: "7",
    branch: "intro",
    track: "school",
    topicId: "g7-intro-3",
    title: "Чистое вещество или смесь",
    taskType: "single_choice",
    difficulty: "basic",
    question: "Что из перечисленного является смесью: вода, кислород, воздух или железо?",
    correctAnswer: "Воздух",
    explanation: "Воздух состоит из нескольких газов, поэтому это смесь. Вода, кислород и железо в школьной модели рассматриваются как отдельные вещества.",
    mistakeTags: ["mixtures", "pure_substances"],
    timedExpectedSeconds: 25,
    sourceType: "editorial",
    verified: true,
  },
  {
    id: "chem8-valency-basic-1",
    grade: "8",
    branch: "inorganic",
    track: "school",
    topicId: "g8-core-2",
    title: "Формула по валентности",
    taskType: "open_answer",
    difficulty: "basic",
    question: "Составь формулу оксида алюминия, если валентность Al = III, O = II.",
    correctAnswer: "Al2O3",
    explanation: "Наименьшее общее кратное для III и II равно 6. Тогда нужно 2 атома алюминия и 3 атома кислорода.",
    mistakeTags: ["valency", "formula_building"],
    timedExpectedSeconds: 40,
    sourceType: "editorial",
    verified: true,
  },
  {
    id: "chem8-balance-water-basic-1",
    grade: "8",
    branch: "inorganic",
    track: "school",
    topicId: "g8-core-3",
    title: "Уравнивание реакции образования воды",
    taskType: "equation",
    difficulty: "basic",
    question: "Уравняй реакцию: H2 + O2 -> H2O",
    correctAnswer: "2H2 + O2 -> 2H2O",
    explanation: "Сначала уравниваем атомы водорода, затем проверяем кислород. После постановки коэффициента 2 перед H2O нужно поставить 2 и перед H2.",
    mistakeTags: ["balancing", "stoichiometry"],
    timedExpectedSeconds: 45,
    sourceType: "editorial",
    verified: true,
  },
  {
    id: "chem8-solutions-standard-1",
    grade: "8",
    branch: "inorganic",
    track: "school",
    topicId: "g8-core-6",
    title: "Массовая доля в растворе",
    taskType: "calculation",
    difficulty: "standard",
    question: "В 200 г раствора содержится 20 г соли. Найди массовую долю соли.",
    correctAnswer: "0.1",
    explanation: "Массовая доля равна отношению массы растворенного вещества к массе раствора: 20/200 = 0,1, то есть 10%.",
    mistakeTags: ["solutions", "mass_fraction"],
    timedExpectedSeconds: 55,
    sourceType: "editorial",
    verified: true,
  },
  {
    id: "chem9-ions-basic-1",
    grade: "9",
    branch: "inorganic",
    track: "school",
    topicId: "g9-core-5",
    title: "Сокращенное ионное уравнение для осадка",
    taskType: "open_answer",
    difficulty: "standard",
    question: "Запиши сокращенное ионное уравнение реакции образования осадка хлорида серебра.",
    correctAnswer: "Ag+ + Cl- = AgCl↓",
    explanation: "В сокращенное ионное уравнение включают только частицы, реально участвующие в образовании нового вещества. Ионы-спутники не записывают.",
    mistakeTags: ["ionic_equation", "precipitate"],
    timedExpectedSeconds: 60,
    sourceType: "editorial",
    verified: true,
  },
  {
    id: "chem9-redox-standard-1",
    grade: "9",
    branch: "inorganic",
    track: "school",
    topicId: "g9-core-2",
    title: "Определи окислитель",
    taskType: "single_choice",
    difficulty: "standard",
    question: "Кто является окислителем в реакции 2Mg + O2 -> 2MgO?",
    correctAnswer: "Кислород",
    explanation: "Окислитель принимает электроны. В этой реакции кислород меняет степень окисления с 0 до -2, значит он принимает электроны и является окислителем.",
    mistakeTags: ["redox", "oxidizer"],
    timedExpectedSeconds: 35,
    sourceType: "editorial",
    verified: true,
  },
  {
    id: "chem9-qualitative-standard-1",
    grade: "9",
    branch: "inorganic",
    track: "school",
    topicId: "g9-core-8",
    title: "Качественная реакция на хлорид-ион",
    taskType: "single_choice",
    difficulty: "standard",
    question: "Какой реактив используют, чтобы обнаружить хлорид-ион в растворе?",
    correctAnswer: "Нитрат серебра",
    explanation: "При добавлении AgNO3 образуется белый осадок AgCl. Это типичная качественная реакция на хлорид-ион.",
    mistakeTags: ["qualitative_analysis", "chloride"],
    timedExpectedSeconds: 30,
    sourceType: "editorial",
    verified: true,
  },
  {
    id: "chem10-organic-standard-1",
    grade: "10",
    branch: "organic",
    track: "school",
    topicId: "g10-org-2",
    title: "Реакция присоединения у алкенов",
    taskType: "single_choice",
    difficulty: "standard",
    question: "Какой тип реакции характерен для алкенов благодаря двойной связи?",
    correctAnswer: "Реакция присоединения",
    explanation: "Двойная связь в алкенах содержит более реакционноспособный участок, поэтому для них характерны реакции присоединения по месту двойной связи.",
    mistakeTags: ["organic_reactivity", "alkenes"],
    timedExpectedSeconds: 35,
    sourceType: "editorial",
    verified: true,
  },
  {
    id: "chem10-polyalcohol-standard-1",
    grade: "10",
    branch: "organic",
    track: "school",
    topicId: "g10-org-6",
    title: "Признак многоатомных спиртов",
    taskType: "single_choice",
    difficulty: "standard",
    question: "Какая реакция помогает отличить многоатомный спирт от одноатомного на школьном уровне?",
    correctAnswer: "Реакция с гидроксидом меди(II)",
    explanation: "Многоатомные спирты дают ярко-синий растворимый комплекс с гидроксидом меди(II), что используют как качественный признак.",
    mistakeTags: ["organic_identification", "polyhydric_alcohol"],
    timedExpectedSeconds: 35,
    sourceType: "editorial",
    verified: true,
  },
  {
    id: "chem11-mole-advanced-1",
    grade: "11",
    branch: "general",
    track: "school",
    topicId: "g11-gen-6",
    title: "Количество вещества по массе",
    taskType: "calculation",
    difficulty: "advanced",
    question: "Найди количество вещества в 98 г серной кислоты H2SO4. М(H2SO4)=98 г/моль.",
    correctAnswer: "1",
    explanation: "Используем формулу n = m/M. 98 / 98 = 1 моль.",
    mistakeTags: ["mole", "calculation"],
    timedExpectedSeconds: 45,
    sourceType: "editorial",
    verified: true,
  },
  {
    id: "chem11-review-quiz-1",
    grade: "11",
    branch: "general",
    track: "quiz",
    topicId: "g11-gen-7",
    title: "Быстрый повтор: что ведет реакцию до конца",
    taskType: "timed_quiz",
    difficulty: "standard",
    question: "Что чаще всего является признаком того, что обменная реакция в растворе идет до конца?",
    correctAnswer: ["образование осадка", "выделение газа", "образование слабого электролита"],
    explanation: "В школьной химии обменную реакцию считают идущей до конца, если появляется осадок, газ или слабый электролит, например вода.",
    mistakeTags: ["reaction_driving_force", "review"],
    timedExpectedSeconds: 25,
    sourceType: "editorial",
    verified: true,
  },
];
