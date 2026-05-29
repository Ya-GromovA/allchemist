const API_BASE = "/api/v1";
const STORAGE_KEY = "allchemist_web_session_v1";
const DEVICE_ID_KEY = "allchemist_web_device_id_v1";
const PAYMENT_OPTIONS = [
  { moduleId: "chemistry_pro_lab", amountRub: 299, provider: "robokassa", title: "Личный доступ на месяц", subtitle: "AI-помощник, реакции и расширенный учебный контент" },
  { moduleId: "school_quarter", amountRub: 790, provider: "robokassa", title: "Школьный доступ на 3 месяца", subtitle: "Учебный сценарий класса на 3 месяца" },
  { moduleId: "family_year", amountRub: 2490, provider: "robokassa", title: "Семейный доступ на год", subtitle: "Долгий доступ и семейный сценарий" },
];

const state = {
  selectedRole: "",
  phone: "",
  accessToken: "",
  refreshToken: "",
  userId: "",
  role: "",
  profile: null,
  modules: [],
  payment: null,
  teacherSession: null,
  activeWorkspace: "modules",
  activeModule: "chemistry",
  moduleLessons: [],
  moduleTasks: [],
  moduleLoading: false,
  contentCatalog: null,
  examVariant: null,
  ticketAnalysis: null,
  mentorAnswer: "",
  devices: null,
  teacherClasses: null,
  access: null,
};

const MODULE_COPY = {
  chemistry: {
    title: "Химия",
    summary: "Базовая теория по классам, учебные линии, практика, реакции и проверка знаний.",
    highlights: ["Теория по классам", "Иллюстрации и схемы", "Практика по темам", "Проверочные экзамены"],
  },
  physics: {
    title: "Физика",
    summary: "Школьные разделы, визуальные модели, задачи и контроль знаний.",
    highlights: ["Механика", "Электричество", "Оптика", "Практика и аналитика"],
  },
  biology: {
    title: "Биология",
    summary: "Темы по школьной программе, схемы процессов и проверка понимания.",
    highlights: ["Анатомия", "Генетика", "Экология", "Проверочные работы"],
  },
  ai_mentor: {
    title: "AI-наставник",
    summary: "Персональные объяснения, разбор ошибок и рекомендации по повторению тем.",
    highlights: ["Объяснить ошибку", "Подсказать тему", "Предложить повтор", "Повторный тест"],
  },
};

const MODULE_VISUALS = {
  chemistry: {
    hero: "/api/v1/web/assets/chemistry_lab_hero.png",
    card: "/api/v1/web/assets/module_chemistry.png",
    alt: "Виртуальная химическая лаборатория",
    caption: "Колбы, молекулы, реакции и периодическая таблица связаны с уроками и заданиями.",
  },
  physics: {
    hero: "/api/v1/web/assets/physics_simulator_hero.png",
    card: "/api/v1/web/assets/module_physics.png",
    alt: "Физический симулятор",
    caption: "Параметры опыта, формула, график и объяснение ошибки показываются рядом.",
  },
  biology: {
    hero: "/api/v1/web/assets/biology_microscope_hero.png",
    card: "/api/v1/web/assets/module_biology.png",
    alt: "Виртуальный микроскоп",
    caption: "Микропрепараты, подписи, слои клетки и контрольные вопросы в одном сценарии.",
  },
  ai_mentor: {
    hero: "/api/v1/web/assets/module_ai.png",
    card: "/api/v1/web/assets/module_ai.png",
    alt: "AI-наставник Алхимик",
    caption: "AI помогает объяснить ошибку, подобрать повторение и перейти к следующему заданию.",
  },
};

const MODULE_LEARNING_FLOW = {
  chemistry: [
    ["1", "Теория", "Разбор правила, формул и примеров перед опытом."],
    ["2", "Практика", "Короткие задачи с проверкой хода решения."],
    ["3", "Лаборатория", "Виртуальный опыт: реактивы, наблюдения, безопасность и вывод."],
    ["4", "Тест", "Мини-проверка темы с объяснением типовой ошибки."],
    ["5", "AI", "AI-наставник объясняет ошибку и предлагает повторение."],
  ],
  physics: [
    ["1", "Теория", "Закон, величины и единицы измерения в одном блоке."],
    ["2", "Практика", "Задачи с подстановкой данных и проверкой размерностей."],
    ["3", "Симулятор", "Изменение параметров, график и наблюдение результата."],
    ["4", "Тест", "Контроль понимания формулы и условий применимости."],
    ["5", "AI", "AI-наставник разбирает неверный шаг и даёт похожую задачу."],
  ],
  biology: [
    ["1", "Теория", "Схема процесса, термины и ключевые признаки."],
    ["2", "Практика", "Подписи к схеме, сопоставление терминов и вывод."],
    ["3", "Микроскоп", "Слои препарата, увеличение, органоиды и контроль наблюдения."],
    ["4", "Тест", "Проверка понятий и причинно-следственных связей."],
    ["5", "AI", "AI-наставник помогает объяснить ошибку и собрать план повторения."],
  ],
};

function moduleVisual(key) {
  return MODULE_VISUALS[key] || MODULE_VISUALS.chemistry;
}

function moduleLearningFlow(key) {
  return MODULE_LEARNING_FLOW[key] || MODULE_LEARNING_FLOW.chemistry;
}

const PERIODIC_TABLE_SOURCE_RU = "Данные: IUPAC Periodic Table, CIAAW standard atomic weights, Royal Society of Chemistry; updated_at: 2026-05-26; verified_by: Allchemist content QA baseline.";

const PERIODIC_CATEGORY = {
  alkali: ["Щелочной металл", "Очень реакционноспособные металлы, обычно дают ионы +1.", "Встречаются в солях и минералах; применяются в батареях, синтезе и материалах."],
  alkaline: ["Щелочноземельный металл", "Металлы группы 2, обычно образуют соединения со степенью окисления +2.", "Встречаются в минералах, костной ткани, строительных материалах и сплавах."],
  transition: ["Переходный металл", "Металлы с переменными степенями окисления, часто окрашивают соединения и работают как катализаторы.", "Используются в сплавах, проводниках, катализаторах, магнитных и конструкционных материалах."],
  post: ["Постпереходный металл", "Более мягкие металлы p-блока, свойства зависят от положения в периоде.", "Встречаются в рудах; применяются в электронике, защитных покрытиях, сплавах и стеклах."],
  metalloid: ["Металлоид", "Промежуточные свойства между металлами и неметаллами, важны для полупроводников и материалов.", "Встречаются в минералах; применяются в электронике, стекле, керамике и специальных сплавах."],
  nonmetal: ["Неметалл", "Обычно образует ковалентные соединения, молекулы и ионы, важен для живой природы и атмосферы.", "Встречается в воздухе, воде, минералах и органических веществах; применяется в химическом синтезе."],
  halogen: ["Галоген", "Очень реакционноспособные неметаллы группы 17, часто образуют соли.", "Встречаются в солях и минералах; применяются в дезинфекции, материалах и аналитике."],
  noble: ["Благородный газ", "Малоактивные одноатомные газы с заполненной внешней оболочкой.", "Встречаются в атмосфере; применяются в освещении, сварке, криогенике и научных приборах."],
  lanthanoid: ["Лантаноид", "Редкоземельные элементы 4f-ряда с близкими химическими свойствами.", "Встречаются в редкоземельных минералах; применяются в магнитах, люминофорах, стекле и электронике."],
  actinoid: ["Актиноид", "5f-элементы, многие радиоактивны; требуют строгого контроля безопасности.", "Встречаются в урановых и ториевых минералах или получаются искусственно; применяются в энергетике и исследованиях."],
  unknown: ["Сверхтяжёлый элемент", "Синтезирован в ускорителях; свойства частично прогнозируются из-за короткого времени жизни.", "Используется в фундаментальных исследованиях строения атомного ядра."],
};

const PERIODIC_ELEMENTS = `1|H|Водород|1.008|1|1|nonmetal;2|He|Гелий|4.0026|18|1|noble;3|Li|Литий|6.94|1|2|alkali;4|Be|Бериллий|9.0122|2|2|alkaline;5|B|Бор|10.81|13|2|metalloid;6|C|Углерод|12.011|14|2|nonmetal;7|N|Азот|14.007|15|2|nonmetal;8|O|Кислород|15.999|16|2|nonmetal;9|F|Фтор|18.998|17|2|halogen;10|Ne|Неон|20.180|18|2|noble;11|Na|Натрий|22.990|1|3|alkali;12|Mg|Магний|24.305|2|3|alkaline;13|Al|Алюминий|26.982|13|3|post;14|Si|Кремний|28.085|14|3|metalloid;15|P|Фосфор|30.974|15|3|nonmetal;16|S|Сера|32.06|16|3|nonmetal;17|Cl|Хлор|35.45|17|3|halogen;18|Ar|Аргон|39.948|18|3|noble;19|K|Калий|39.098|1|4|alkali;20|Ca|Кальций|40.078|2|4|alkaline;21|Sc|Скандий|44.956|3|4|transition;22|Ti|Титан|47.867|4|4|transition;23|V|Ванадий|50.942|5|4|transition;24|Cr|Хром|51.996|6|4|transition;25|Mn|Марганец|54.938|7|4|transition;26|Fe|Железо|55.845|8|4|transition;27|Co|Кобальт|58.933|9|4|transition;28|Ni|Никель|58.693|10|4|transition;29|Cu|Медь|63.546|11|4|transition;30|Zn|Цинк|65.38|12|4|transition;31|Ga|Галлий|69.723|13|4|post;32|Ge|Германий|72.630|14|4|metalloid;33|As|Мышьяк|74.922|15|4|metalloid;34|Se|Селен|78.971|16|4|nonmetal;35|Br|Бром|79.904|17|4|halogen;36|Kr|Криптон|83.798|18|4|noble;37|Rb|Рубидий|85.468|1|5|alkali;38|Sr|Стронций|87.62|2|5|alkaline;39|Y|Иттрий|88.906|3|5|transition;40|Zr|Цирконий|91.224|4|5|transition;41|Nb|Ниобий|92.906|5|5|transition;42|Mo|Молибден|95.95|6|5|transition;43|Tc|Технеций|98|7|5|transition;44|Ru|Рутений|101.07|8|5|transition;45|Rh|Родий|102.91|9|5|transition;46|Pd|Палладий|106.42|10|5|transition;47|Ag|Серебро|107.87|11|5|transition;48|Cd|Кадмий|112.41|12|5|transition;49|In|Индий|114.82|13|5|post;50|Sn|Олово|118.71|14|5|post;51|Sb|Сурьма|121.76|15|5|metalloid;52|Te|Теллур|127.60|16|5|metalloid;53|I|Иод|126.90|17|5|halogen;54|Xe|Ксенон|131.29|18|5|noble;55|Cs|Цезий|132.91|1|6|alkali;56|Ba|Барий|137.33|2|6|alkaline;57|La|Лантан|138.91|3|6|lanthanoid;58|Ce|Церий|140.12|3|6|lanthanoid;59|Pr|Празеодим|140.91|3|6|lanthanoid;60|Nd|Неодим|144.24|3|6|lanthanoid;61|Pm|Прометий|145|3|6|lanthanoid;62|Sm|Самарий|150.36|3|6|lanthanoid;63|Eu|Европий|151.96|3|6|lanthanoid;64|Gd|Гадолиний|157.25|3|6|lanthanoid;65|Tb|Тербий|158.93|3|6|lanthanoid;66|Dy|Диспрозий|162.50|3|6|lanthanoid;67|Ho|Гольмий|164.93|3|6|lanthanoid;68|Er|Эрбий|167.26|3|6|lanthanoid;69|Tm|Тулий|168.93|3|6|lanthanoid;70|Yb|Иттербий|173.05|3|6|lanthanoid;71|Lu|Лютеций|174.97|3|6|lanthanoid;72|Hf|Гафний|178.49|4|6|transition;73|Ta|Тантал|180.95|5|6|transition;74|W|Вольфрам|183.84|6|6|transition;75|Re|Рений|186.21|7|6|transition;76|Os|Осмий|190.23|8|6|transition;77|Ir|Иридий|192.22|9|6|transition;78|Pt|Платина|195.08|10|6|transition;79|Au|Золото|196.97|11|6|transition;80|Hg|Ртуть|200.59|12|6|transition;81|Tl|Таллий|204.38|13|6|post;82|Pb|Свинец|207.2|14|6|post;83|Bi|Висмут|208.98|15|6|post;84|Po|Полоний|209|16|6|post;85|At|Астат|210|17|6|halogen;86|Rn|Радон|222|18|6|noble;87|Fr|Франций|223|1|7|alkali;88|Ra|Радий|226|2|7|alkaline;89|Ac|Актиний|227|3|7|actinoid;90|Th|Торий|232.04|3|7|actinoid;91|Pa|Протактиний|231.04|3|7|actinoid;92|U|Уран|238.03|3|7|actinoid;93|Np|Нептуний|237|3|7|actinoid;94|Pu|Плутоний|244|3|7|actinoid;95|Am|Америций|243|3|7|actinoid;96|Cm|Кюрий|247|3|7|actinoid;97|Bk|Берклий|247|3|7|actinoid;98|Cf|Калифорний|251|3|7|actinoid;99|Es|Эйнштейний|252|3|7|actinoid;100|Fm|Фермий|257|3|7|actinoid;101|Md|Менделевий|258|3|7|actinoid;102|No|Нобелий|259|3|7|actinoid;103|Lr|Лоуренсий|266|3|7|actinoid;104|Rf|Резерфордий|267|4|7|transition;105|Db|Дубний|268|5|7|transition;106|Sg|Сиборгий|269|6|7|transition;107|Bh|Борий|270|7|7|transition;108|Hs|Хассий|277|8|7|transition;109|Mt|Мейтнерий|278|9|7|unknown;110|Ds|Дармштадтий|281|10|7|unknown;111|Rg|Рентгений|282|11|7|unknown;112|Cn|Коперниций|285|12|7|transition;113|Nh|Нихоний|286|13|7|unknown;114|Fl|Флеровий|289|14|7|post;115|Mc|Московий|290|15|7|unknown;116|Lv|Ливерморий|293|16|7|unknown;117|Ts|Теннессин|294|17|7|unknown;118|Og|Оганесон|294|18|7|unknown`.split(";").map((row) => {
  const [number, symbol, nameRu, mass, group, period, category] = row.split("|");
  return { number: Number(number), symbol, nameRu, mass, group: Number(group), period: Number(period), category };
});

function periodicPosition(element) {
  if (element.number >= 58 && element.number <= 71) return { row: 8, column: element.number - 54 };
  if (element.number >= 90 && element.number <= 103) return { row: 9, column: element.number - 86 };
  return { row: element.period, column: element.group };
}

function periodicSafety(element) {
  if (element.category === "actinoid" || element.number >= 84) return "Требуется строгий радиационный и лабораторный контроль; не для бытовых опытов.";
  if ([4, 33, 48, 80, 81, 82].includes(element.number)) return "Соединения могут быть токсичны; работа только по правилам безопасности.";
  if ([3, 11, 19, 37, 55, 87].includes(element.number)) return "Активно реагирует с водой и влагой; школьные опыты только демонстрационно.";
  if ([9, 17, 35, 53].includes(element.number)) return "Галогены и их концентрированные соединения требуют вытяжки и защиты.";
  return "В учебном режиме соблюдайте стандартные правила лабораторной безопасности.";
}

function periodicMemory(element) {
  const first = element.nameRu.slice(0, 2).toLowerCase();
  return `Запомнить: ${element.symbol} — это «${element.nameRu}». Свяжите символ с началом названия или латинским корнем; повторите номер ${element.number} вместе с группой ${element.group}.`;
}

function renderPeriodicTable() {
  const selected = PERIODIC_ELEMENTS.find((item) => item.symbol === (state.selectedElementSymbol || "C")) || PERIODIC_ELEMENTS[5];
  const mode = state.periodicMode || "study";
  const category = PERIODIC_CATEGORY[selected.category] || PERIODIC_CATEGORY.unknown;
  const modeCopy = {
    study: "Изучение: выберите элемент и прочитайте главное без перегруза.",
    properties: "Свойства: смотрите тип элемента, массу, группу, период и поведение семейства.",
    training: "Тренировка: называйте символ, номер и семейство до открытия карточки.",
    memory: "Запоминание: используйте короткую мнемонику и повторение по группам.",
  }[mode];
  return `
    <section class="periodicTablePanel" aria-label="Интерактивная таблица химических элементов">
      <div class="periodicHeader">
        <div>
          <h5>Интерактивная таблица элементов</h5>
          <p class="muted small">118 элементов: атомный номер, символ, название, масса, группа, период и цвет по семейству.</p>
        </div>
        <div class="periodicModeRow" role="tablist" aria-label="Режим таблицы">
          ${[["study", "Изучение"], ["properties", "Свойства"], ["training", "Тренировка"], ["memory", "Запоминание"]].map(([key, label]) => `<button class="periodicModeBtn ${mode === key ? "active" : ""}" type="button" data-periodic-mode="${key}">${label}</button>`).join("")}
        </div>
      </div>
      <div class="periodicModeHint">${escapeHtml(modeCopy)}</div>
      <div class="periodicLayout">
        <div class="periodicGrid" data-element-count="${PERIODIC_ELEMENTS.length}">
          ${PERIODIC_ELEMENTS.map((element) => {
            const pos = periodicPosition(element);
            return `<button class="periodicCell periodic-${element.category} ${selected.symbol === element.symbol ? "active" : ""}" type="button" data-element-symbol="${element.symbol}" style="grid-column:${pos.column};grid-row:${pos.row}" title="${escapeHtml(element.nameRu)}"><span class="periodicNumber">${element.number}</span><strong>${escapeHtml(element.symbol)}</strong><span class="periodicName">${escapeHtml(element.nameRu)}</span></button>`;
          }).join("")}
        </div>
        <aside class="periodicDetail" aria-live="polite">
          <div class="periodicDetailTop periodic-${selected.category}">
            <span>${selected.number}</span>
            <strong>${escapeHtml(selected.symbol)}</strong>
          </div>
          <h5>${escapeHtml(selected.nameRu)}</h5>
          <dl class="periodicFacts">
            <div><dt>Относительная атомная масса</dt><dd>${escapeHtml(selected.mass)}</dd></div>
            <div><dt>Группа</dt><dd>${selected.group}</dd></div>
            <div><dt>Период</dt><dd>${selected.period}</dd></div>
            <div><dt>Тип элемента</dt><dd>${escapeHtml(category[0])}</dd></div>
          </dl>
          <p><strong>Свойства:</strong> ${escapeHtml(category[1])}</p>
          <p><strong>Применение и где встречается:</strong> ${escapeHtml(category[2])}</p>
          <p><strong>Осторожность:</strong> ${escapeHtml(periodicSafety(selected))}</p>
          <p><strong>Как запомнить:</strong> ${escapeHtml(periodicMemory(selected))}</p>
          <p class="muted small">${escapeHtml(PERIODIC_TABLE_SOURCE_RU)}</p>
        </aside>
      </div>
    </section>
  `;
}

function bindPeriodicTableControls() {
  document.querySelectorAll("[data-periodic-mode]").forEach((node) => {
    node.addEventListener("click", () => {
      state.periodicMode = node.dataset.periodicMode || "study";
      renderModules();
    });
  });
  document.querySelectorAll("[data-element-symbol]").forEach((node) => {
    node.addEventListener("click", () => {
      state.selectedElementSymbol = node.dataset.elementSymbol || "C";
      renderModules();
    });
  });
}

const MODULE_TO_API = {
  chemistry: "chemistry",
  physics: "physics",
  biology: "biology",
};

const els = {};

function byId(id) {
  return document.getElementById(id);
}

function initElements() {
  [
    "sessionMeta",
    "authSectionTitle",
    "authSectionSubtitle",
    "authPanel",
    "appShell",
    "authStatus",
    "authDebugCode",
    "loginInput",
    "passwordInput",
    "loginPasswordBtn",
    "phoneInput",
    "codeInput",
    "requestCodeBtn",
    "verifyCodeBtn",
    "roleContinueBtn",
    "phoneLoginPanel",
    "codeStep",
    "openAccessCodeBtn",
    "closeAccessCodeBtn",
    "accessCodePanel",
    "logoutBtn",
    "snapshotRole",
    "snapshotSession",
    "profileSummary",
    "entitlementsSummary",
    "roleSummary",
    "quickActions",
    "moduleTabs",
    "modulePanel",
    "workspaceModules",
    "workspaceCabinet",
    "workspaceAccess",
    "workspaceMore",
    "workspaceBilling",
    "workspaceTabs",
    "workspaceTitle",
    "workspaceSubtitle",
    "workspaceUserBadge",
    "workspaceApkLink",
    "catalogStatus",
    "paymentPlans",
    "paymentStatus",
    "roleWorkspace",
    "accessSummary",
    "accessCodeInput",
    "accessDisplayNameInput",
    "accessLoginInput",
    "accessPasswordInput",
    "accessPasswordConfirmInput",
    "previewAccessCodeBtn",
    "accessCodePreview",
    "activateAccessCodeBtn",
    "accessCodeStatus",
    "roleModeSwitcher",
    "currentPasswordInput",
    "newPasswordInput",
    "newPasswordConfirmInput",
    "changePasswordBtn",
    "changePasswordStatus",
    "workspaceDevices",
    "devicesSummary",
    "devicesList",
    "deviceLabelInput",
    "deviceRecoveryCodeInput",
    "deviceRecoveryPhoneInput",
    "deviceStatus",
    "apkReleaseNotice",
  ].forEach((id) => {
    els[id] = byId(id);
  });
}

function compareVersionCode(a, b) {
  return Number(a || 0) - Number(b || 0);
}

async function loadApkReleaseNotice() {
  if (!els.apkReleaseNotice) return;
  try {
    const response = await fetch(`${API_BASE}/content/downloads/apk/latest/metadata`, { headers: { Accept: "application/json" } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.versionName) return;
    const notes = Array.isArray(data.releaseNotes) ? data.releaseNotes : [];
    const notesHtml = notes.length
      ? `<ul>${notes.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
      : "<p>Обновление содержит улучшения стабильности и подготовки Android-релизов.</p>";
    els.apkReleaseNotice.classList.remove("hidden");
    els.apkReleaseNotice.innerHTML = `
      <div class="releaseNoticeTop">
        <div>
          <div class="releaseNoticeTitle">Вышла новая версия Android APK: ${escapeHtml(data.versionName)}</div>
          <div class="small">Лучше устанавливать обновление поверх старой версии, чтобы сохранить локальные данные.</div>
        </div>
        <button class="releaseInfoButton" id="apkReleaseInfoBtn" type="button" aria-label="Что нового">i</button>
      </div>
      <div id="apkReleaseDetails" class="releaseDetails hidden">
        <strong>${escapeHtml(data.releaseTitle || "Что нового")}</strong>
        ${notesHtml}
        <p>${escapeHtml(data.installAdviceRu || "Установите новую версию поверх старой.")}</p>
        <p>${escapeHtml(data.debugReinstallNoticeRu || "Перед удалением тестовой версии выполните синхронизацию в кабинете.")}</p>
      </div>
    `;
    byId("apkReleaseInfoBtn")?.addEventListener("click", () => byId("apkReleaseDetails")?.classList.toggle("hidden"));
  } catch {
    // Version notice is optional; the APK button remains available.
  }
}

function normalizeRole(role) {
  return ["student", "learner", "parent", "teacher", "homeroom_teacher"].includes(role) ? role : "";
}

function authRole(data) {
  return normalizeRole(data?.activeRole || data?.active_role || data?.role);
}

function readSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    state.accessToken = saved.accessToken || "";
    state.refreshToken = saved.refreshToken || "";
    state.userId = saved.userId || "";
    state.role = normalizeRole(saved.role || "");
    state.selectedRole = state.role || "";
    state.phone = saved.phone || "";
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function persistSession() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      accessToken: state.accessToken,
      refreshToken: state.refreshToken,
      userId: state.userId,
      role: state.role,
      phone: state.phone,
    }),
  );
}

function clearSession() {
  state.accessToken = "";
  state.refreshToken = "";
  state.userId = "";
  state.role = "";
  state.profile = null;
  state.modules = [];
  state.payment = null;
  state.teacherSession = null;
  state.devices = null;
  state.teacherClasses = null;
  state.access = null;
  localStorage.removeItem(STORAGE_KEY);
}

function setStatus(text) {
  if (els.authStatus) els.authStatus.textContent = text;
}

function setDebugCode(text) {
  if (!text) {
    els.authDebugCode?.classList.add("hidden");
    if (els.authDebugCode) els.authDebugCode.textContent = "";
    return;
  }
  els.authDebugCode?.classList.remove("hidden");
  if (els.authDebugCode) els.authDebugCode.textContent = text;
}

function setRoleSelection(role) {
  state.selectedRole = normalizeRole(role);
  document.querySelectorAll("[data-role]").forEach((node) => {
    node.classList.toggle("active", node.dataset.role === state.selectedRole);
  });
  if (els.snapshotRole) els.snapshotRole.textContent = state.selectedRole ? roleLabel(state.selectedRole) : "Не выбрано";
}

function roleLabel(role) {
  const map = {
    owner: "Владелец",
    admin: "Администратор системы",
    school_admin: "Администратор школы",
    teacher: "Учитель",
    homeroom_teacher: "Классный руководитель",
    learner: "Учащийся",
    student: "Учащийся",
    parent: "Родитель",
    content_editor: "Редактор контента",
    support: "Поддержка",
  };
  return map[role] || "Не выбрано";
}

function moduleLabel(moduleId) {
  const map = {
    chemistry: "Химия",
    physics: "Физика",
    biology: "Биология",
    ai: "AI-наставник",
    ai_mentor: "AI-наставник",
    chemistry_core: "Химия: базовый курс",
    physics_core: "Физика: базовый курс",
    biology_preview: "Биология: вводный модуль",
    biology_core: "Биология: базовый курс",
    exam_pack: "Подготовка к экзаменам",
    ai_basic: "AI-помощник",
    ai_extended: "Расширенный AI-помощник",
    offline_pack: "Офлайн-материалы",
    chemistry_pro_lab: "Химия: расширенные лабораторные",
    school_quarter: "Школьный доступ на 3 месяца",
    family_year: "Семейный доступ на год",
    teacher_live: "Онлайн-уроки учителя",
  };
  return map[moduleId] || "Базовый модуль";
}

function planLabel(planId) {
  const map = {
    partner_school_full: "Полный школьный доступ",
    basic: "Базовый доступ",
    family_year: "Семейный доступ на год",
    school_quarter: "Школьный доступ на 3 месяца",
    pro_monthly: "Личный доступ на месяц",
  };
  return map[planId] || "Базовый доступ";
}

function hasSchoolAccess() {
  const accessItems = Array.isArray(state.access?.items) ? state.access.items : [];
  const plans = state.profile?.plans || [];
  const modules = state.profile?.modules || [];
  return Boolean(accessItems.find((x) => x.schoolId || x.licenseId || x.sourceType === "partner_license" || x.sourceType === "school_license"))
    || plans.includes("partner_school_full")
    || modules.includes("chemistry_core")
    || modules.includes("physics_core")
    || modules.includes("biology_core");
}

function hasClassAssignment() {
  const assignments = state.profile?.roleData?.classAssignments;
  return Array.isArray(assignments) && assignments.length > 0;
}

function canShowStudentLive(activeLive) {
  return normalizeRole(state.role) === "student" && hasSchoolAccess() && hasClassAssignment() && Boolean(activeLive);
}

function canShowTeacherLiveLaunch() {
  return normalizeRole(state.role) === "teacher" && hasSchoolAccess() && hasClassAssignment();
}

function formatRolePosition(profile) {
  const roleData = profile?.roleData || {};
  return roleData.positionLabelRu || roleData.roleLabelRu || roleLabel(profile?.role || state.role);
}

function renderClassAssignments(assignments) {
  if (!Array.isArray(assignments) || !assignments.length) return "Назначенные классы пока не указаны.";
  return assignments.map((item) => {
    const title = escapeHtml(item.title || item.classId || "Класс");
    const position = escapeHtml(item.positionLabelRu || item.roleLabelRu || "Учитель");
    const subject = item.isHomeroom ? "" : ` · ${escapeHtml(item.subjectLabelRu || "предмет")}`;
    return `<div class="moduleLessonItem"><strong>${position}</strong><div class="muted small">${title}${subject}</div></div>`;
  }).join("");
}

function renderSessionMeta() {
  const authenticated = !!state.accessToken && !!state.userId;
  const roleText = roleLabel(state.role);
  els.sessionMeta.textContent = authenticated ? `${roleText} · кабинет открыт` : "Гость";
  if (els.authSectionTitle) els.authSectionTitle.textContent = authenticated ? "Личный кабинет" : "Войти в кабинет";
  if (els.authSectionSubtitle) {
    els.authSectionSubtitle.textContent = authenticated
      ? "Рабочее пространство настроено по роли и доступам, которые вернул сервер."
      : "Полноценный вход в веб-кабинет: выберите способ входа в Алхимик";
  }
  if (els.workspaceUserBadge) els.workspaceUserBadge.textContent = authenticated ? `${roleText} · ${displayUserName(state.profile)}` : "Пользователь";
  if (els.snapshotSession) els.snapshotSession.textContent = authenticated ? "Выполнен" : "Ожидает";
  els.authPanel.classList.toggle("hidden", authenticated);
  els.appShell.classList.toggle("hidden", !authenticated);
}

function workspaceHeaderCopy() {
  const role = state.role || "student";
  const tab = state.activeWorkspace || "cabinet";
  const rolePrefix = {
    student: "Учебный кабинет",
    learner: "Учебный кабинет",
    teacher: "Кабинет учителя",
    homeroom_teacher: "Кабинет классного руководителя",
    parent: "Родительский кабинет",
  }[role] || "Личный кабинет";
  const tabCopy = {
    cabinet: [rolePrefix, "Главная сводка, роль, быстрые действия и рабочий сценарий."],
    modules: [role === "teacher" ? "Урок и материалы" : role === "parent" ? "Прогресс ребёнка" : "Учёба и модули", "Разделы платформы и доступные учебные материалы."],
    access: ["Доступ и тарифы", "Школьная лицензия, личные покупки и тарифы складываются."],
    more: ["Ещё", "Устройства, безопасность, офлайн-материалы и помощь."],
  };
  const [title, subtitle] = tabCopy[tab] || tabCopy.cabinet;
  return { title, subtitle };
}

function renderWorkspaceHeader() {
  if (!els.workspaceTitle || !els.workspaceSubtitle) return;
  const copy = workspaceHeaderCopy();
  els.workspaceTitle.textContent = copy.title;
  els.workspaceSubtitle.textContent = copy.subtitle;
  if (els.workspaceApkLink) els.workspaceApkLink.href = `${API_BASE}/content/downloads/apk/latest`;
}

function renderWorkspaceTabs() {
  const tabs = getWorkspaceTabs();
  if (!tabs.some((tab) => tab.key === state.activeWorkspace)) {
    state.activeWorkspace = tabs[0]?.key || "modules";
  }
  if (els.workspaceTabs) {
    els.workspaceTabs.innerHTML = tabs
      .map((tab) => `<button class="chip ${state.activeWorkspace === tab.key ? "active" : ""}" type="button" data-workspace-tab="${tab.key}">${tab.label}</button>`)
      .join("");
  }
  document.querySelectorAll("[data-workspace-tab]").forEach((node) => {
    node.classList.toggle("active", node.dataset.workspaceTab === state.activeWorkspace);
    node.onclick = () => {
      state.activeWorkspace = node.dataset.workspaceTab;
      els.workspaceModules.classList.toggle("hidden", state.activeWorkspace !== "modules");
      els.workspaceCabinet.classList.toggle("hidden", state.activeWorkspace !== "cabinet");
      els.workspaceAccess.classList.toggle("hidden", state.activeWorkspace !== "access");
      els.workspaceMore?.classList.toggle("hidden", state.activeWorkspace !== "more");
      els.workspaceBilling?.classList.toggle("hidden", true);
      els.workspaceDevices.classList.toggle("hidden", state.activeWorkspace !== "more");
      if (state.activeWorkspace === "access") void loadUserAccess();
      if (state.activeWorkspace === "more") void loadDevices();
      renderWorkspaceTabs();
    };
  });
  els.workspaceModules.classList.toggle("hidden", state.activeWorkspace !== "modules");
  els.workspaceCabinet.classList.toggle("hidden", state.activeWorkspace !== "cabinet");
  els.workspaceAccess.classList.toggle("hidden", state.activeWorkspace !== "access");
  els.workspaceMore?.classList.toggle("hidden", state.activeWorkspace !== "more");
  els.workspaceBilling?.classList.toggle("hidden", true);
  els.workspaceDevices.classList.toggle("hidden", state.activeWorkspace !== "more");
  renderWorkspaceHeader();
}

function getWorkspaceTabs() {
  const role = state.role || state.selectedRole || "student";
  if (role === "teacher") {
    return [
      { key: "cabinet", label: "Главная" },
      { key: "modules", label: "Урок" },
      { key: "access", label: "Доступы" },
      { key: "more", label: "Ещё" },
    ];
  }
  if (role === "homeroom_teacher") {
    return [
      { key: "cabinet", label: "Главная" },
      { key: "modules", label: "Класс" },
      { key: "access", label: "Доступы" },
      { key: "more", label: "Ещё" },
    ];
  }
  if (role === "parent") {
    return [
      { key: "cabinet", label: "Главная" },
      { key: "modules", label: "Ребёнок" },
      { key: "access", label: "Доступ и тарифы" },
      { key: "more", label: "Ещё" },
    ];
  }
  return [
    { key: "cabinet", label: "Главная" },
    { key: "modules", label: "Учёба" },
    { key: "access", label: "Доступ и тарифы" },
    { key: "more", label: "Ещё" },
  ];
}

function buildAccessPhone(code) {
  let acc = 0;
  for (const ch of String(code || "")) acc = (acc * 31 + ch.charCodeAt(0)) % 10000000;
  return `+7000${String(acc).padStart(7, "0")}`;
}

function ensureWebDeviceId() {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    const rand = Math.random().toString(36).slice(2, 10);
    deviceId = `web-${Date.now().toString(36)}-${rand}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

function normalizeAccessError(detail) {
  const text = String(detail || "").toLowerCase();
  if (text.includes("использ")) return "Код не найден или уже был использован. Проверьте код или обратитесь к учителю.";
  if (text.includes("ист") || text.includes("expired")) return "Срок действия кода истёк. Обратитесь к учителю или администратору школы за новым кодом.";
  if (text.includes("not found") || text.includes("не найден")) return "Код не найден.";
  return "Код не найден или уже был использован. Проверьте код или обратитесь к учителю.";
}

async function apiFetch(path, options = {}, allowRefresh = true) {
  const headers = { ...(options.headers || {}) };
  if (state.accessToken) headers.Authorization = `Bearer ${state.accessToken}`;
  if (!headers["Content-Type"] && options.body) headers["Content-Type"] = "application/json";
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (response.status === 401 && allowRefresh && state.refreshToken) {
    const ok = await refreshSession();
    if (ok) return apiFetch(path, options, false);
  }
  return response;
}

async function refreshSession() {
  if (!state.refreshToken) return false;
  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: state.refreshToken }),
  });
  if (!response.ok) {
    clearSession();
    render();
    return false;
  }
  const data = await response.json();
  state.accessToken = data.accessToken;
  state.refreshToken = data.refreshToken;
  persistSession();
  return true;
}

async function requestCode() {
  const phone = els.phoneInput.value.trim();
  if (!phone) {
    setStatus("Введите телефон для входа.");
    return;
  }
  state.phone = phone;
  setStatus("Отправляем код...");
  setDebugCode("");
  const response = await fetch(`${API_BASE}/auth/phone/request-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    setStatus("Не удалось отправить код. Проверьте телефон и попробуйте ещё раз.");
    return;
  }
  setStatus(`Код отправлен на ${phone}.`);
  els.codeStep?.classList.remove("hidden");
}

async function verifyCode() {
  const phone = els.phoneInput.value.trim();
  const code = els.codeInput.value.trim();
  if (!phone || !code) {
    setStatus("Введите телефон и код из SMS.");
    return;
  }
  setStatus("Проверяем код...");
  const payload = {
    phone,
    code,
    localPreferences: {
      surface: "web",
      theme: "deep_ocean",
      appMode: "web",
      networkMode: "online",
    },
  };
  const response = await fetch(`${API_BASE}/auth/phone/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    setStatus("Код не подошёл. Проверьте его и попробуйте ещё раз.");
    return;
  }
  state.phone = phone;
  state.userId = data.userId;
  state.accessToken = data.accessToken;
  state.refreshToken = data.refreshToken;
  state.role = authRole(data);
  state.selectedRole = state.role;
  persistSession();

  await fetch(`${API_BASE}/users/consents/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: state.userId,
      role: state.role || "student",
      version: "2026-04-27-web",
      parentApproved: Boolean(state.role && state.role !== "student"),
    }),
  }).catch(() => null);

  await loadAppData();
  setStatus("Вход выполнен. Кабинет готов.");
}

async function loginPassword() {
  const login = els.loginInput?.value?.trim() || "";
  const password = els.passwordInput?.value || "";
  if (!login || !password) {
    setStatus("Введите логин и пароль.");
    return;
  }
  els.loginPasswordBtn.disabled = true;
  els.loginPasswordBtn.textContent = "Входим...";
  setStatus("Проверяем логин и пароль...");
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login, password }),
  });
  const data = await response.json().catch(() => ({}));
  els.loginPasswordBtn.disabled = false;
  els.loginPasswordBtn.textContent = "Войти по логину";
  if (!response.ok) {
    setStatus(data.detail || "Неверный логин или пароль.");
    return;
  }
  state.userId = data.userId;
  state.accessToken = data.accessToken;
  state.refreshToken = data.refreshToken;
  state.role = authRole(data) || "student";
  state.selectedRole = state.role;
  persistSession();
  await loadAppData();
  setStatus("Вход выполнен. Кабинет готов.");
}

async function logout() {
  if (state.refreshToken) {
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: state.refreshToken }),
    }).catch(() => null);
  }
  clearSession();
  render();
  setStatus("Вы вышли из кабинета.");
}

async function activateAccessCode() {
  const code = els.accessCodeInput.value.trim().toUpperCase();
  const phone = els.phoneInput?.value?.trim() || buildAccessPhone(code);
  const displayName = els.accessDisplayNameInput?.value?.trim() || "";
  const login = els.accessLoginInput?.value?.trim() || "";
  const password = els.accessPasswordInput?.value || "";
  const passwordConfirm = els.accessPasswordConfirmInput?.value || "";
  if (!code) {
    els.accessCodeStatus.textContent = "Введите код доступа.";
    return;
  }
  if (!login || !password || !passwordConfirm) {
    els.accessCodeStatus.textContent = "Введите логин, пароль и повтор пароля.";
    return;
  }
  if (password !== passwordConfirm) {
    els.accessCodeStatus.textContent = "Пароли не совпадают.";
    return;
  }
  els.activateAccessCodeBtn.disabled = true;
  els.activateAccessCodeBtn.textContent = "Проверяем код...";
  els.accessCodeStatus.textContent = "Проверяем код...";
  const response = await fetch(`${API_BASE}/auth/invite/activate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, phone, displayName, login, password, passwordConfirm }),
  });
  const data = await response.json().catch(() => ({}));
  els.activateAccessCodeBtn.disabled = false;
  els.activateAccessCodeBtn.textContent = "Активировать";
  if (!response.ok) {
    els.accessCodeStatus.textContent = normalizeAccessError(data.detail);
    return;
  }
  state.phone = data.phone || phone;
  state.userId = data.userId;
  state.accessToken = data.accessToken;
  state.refreshToken = data.refreshToken;
  state.role = authRole(data);
  state.selectedRole = state.role;
  persistSession();
  els.accessCodeStatus.innerHTML = `<strong>Доступ активирован</strong><br>Школа №2070, площадка «Новая звезда»<br>Роль: ${data.roleLabelRu || roleLabel(state.role)}<br>Логин: ${escapeHtml(data.login || login)}<br>Доступ: Партнёрская школьная лицензия`;
  await loadAppData();
  setStatus("Вход выполнен по коду доступа.");
}

async function previewAccessCode() {
  const code = els.accessCodeInput?.value?.trim().toUpperCase() || "";
  if (!code) {
    els.accessCodePreview.textContent = "Введите код доступа.";
    return;
  }
  els.previewAccessCodeBtn.disabled = true;
  els.previewAccessCodeBtn.textContent = "Проверяем...";
  els.accessCodePreview.textContent = "Проверяем код доступа...";
  const response = await fetch(`${API_BASE}/auth/invite/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const data = await response.json().catch(() => ({}));
  els.previewAccessCodeBtn.disabled = false;
  els.previewAccessCodeBtn.textContent = "Проверить код";
  if (!response.ok) {
    els.accessCodePreview.textContent = normalizeAccessError(data.detail);
    return;
  }
  const rows = [
    kvRow("Статус", escapeHtml(data.statusLabelRu || "Готов к активации")),
    kvRow("Школа", escapeHtml(data.schoolTitle || "Школа")),
    kvRow("Площадка", escapeHtml(data.siteTitle || "Площадка")),
    kvRow("Класс", escapeHtml(data.classTitle || "Не указан")),
    kvRow("Роль", escapeHtml(data.roleLabelRu || roleLabel(data.role))),
    kvRow("Доступ", escapeHtml(data.licenseTitle || "Школьная лицензия")),
    kvRow("Модули", escapeHtml(data.modulesLabelRu || (data.modules || []).map(moduleLabel).join(", ") || "Базовый доступ")),
  ];
  if (data.expiresAt) rows.push(kvRow("Действует до", escapeHtml(String(data.expiresAt).slice(0, 10))));
  els.accessCodePreview.innerHTML = `<strong>${escapeHtml(data.messageRu || "Код найден.")}</strong>${rows.join("")}`;
}

function kvRow(label, value) {
  return `<div class="kvRow"><span>${label}</span><strong>${value}</strong></div>`;
}

function displayUserName(profile) {
  return profile?.displayName || "Пользователь";
}

function safePersonName(row, fallback = "Пользователь") {
  return escapeHtml(row?.displayName || row?.name || row?.studentLabel || row?.title || fallback);
}

function statCards(items) {
  return `<div class="dashboardStats">${items.map((item) => `
    <article class="dashboardStat">
      <span>${escapeHtml(item.label)}</span>
      <strong>${escapeHtml(String(item.value))}</strong>
      ${item.hint ? `<small>${escapeHtml(item.hint)}</small>` : ""}
    </article>
  `).join("")}</div>`;
}

function actionList(items) {
  return `<div class="actionList">${items.map((item) => `
    <article class="actionCard">
      <strong>${escapeHtml(item.title)}</strong>
      <p class="muted small">${escapeHtml(item.text)}</p>
    </article>
  `).join("")}</div>`;
}

function renderProfile() {
  if (!state.profile) return;
  const profile = state.profile;
  els.profileSummary.innerHTML = [
    kvRow("Пользователь", escapeHtml(displayUserName(profile))),
    kvRow("Кем является", formatRolePosition(profile)),
    kvRow("Роль", profile.roleData?.roleLabelRu || roleLabel(profile.role)),
    kvRow("Планов", String((profile.plans || []).length)),
    kvRow("Модулей", String((profile.modules || []).length)),
  ].join("");

  els.entitlementsSummary.innerHTML = [
    kvRow("Планы", (profile.plans || []).map(planLabel).join(", ") || "Базовый доступ"),
    kvRow("Модули", (profile.modules || []).map(moduleLabel).join(", ") || "Базовые модули"),
  ].join("");

  const roleData = profile.roleData || {};
  const roleRows = [kvRow("Кем является", formatRolePosition(profile))];
  if (Array.isArray(roleData.classAssignments) && roleData.classAssignments.length) {
    roleRows.push(`<div class="moduleSectionCard"><h5>Назначения по классам</h5>${renderClassAssignments(roleData.classAssignments)}</div>`);
  }
  Object.entries(roleData)
    .filter(([key]) => !["quickActions", "roleLabelRu", "positionLabelRu", "classAssignments"].includes(key))
    .forEach(([key, value]) => roleRows.push(kvRow(humanizeKey(key), Array.isArray(value) ? value.map((item) => typeof item === "string" ? item : item?.name || item?.title || "Запись").join(", ") : String(value))));
  els.roleSummary.innerHTML = roleRows.join("");
  els.quickActions.innerHTML = (roleData.quickActions || []).map((item) => `<span class="tag">${humanizeKey(item)}</span>`).join("");
  renderRoleModeSwitcher();
  renderAccessSummary();
}

function renderRoleModeSwitcher() {
  if (!els.roleModeSwitcher || !state.profile) return;
  const roles = Array.isArray(state.profile.availableRoles) ? state.profile.availableRoles : [];
  if (roles.length <= 1) {
    els.roleModeSwitcher.classList.add("hidden");
    els.roleModeSwitcher.innerHTML = "";
    return;
  }
  els.roleModeSwitcher.classList.remove("hidden");
  els.roleModeSwitcher.innerHTML = `
    <h4>Режим работы</h4>
    <p class="muted small">Можно выбрать только роли, назначенные вашему аккаунту школой или системой.</p>
    <div class="tagWrap">
      ${roles.map((item) => {
        const role = normalizeRole(item.role);
        const label = escapeHtml(item.labelRu || roleLabel(role));
        const active = role === state.role || item.active;
        return `<button class="chip ${active ? "active" : ""}" type="button" data-switch-role="${escapeHtml(role)}" ${active ? "disabled" : ""}>${label}</button>`;
      }).join("")}
    </div>
  `;
  els.roleModeSwitcher.querySelectorAll("[data-switch-role]").forEach((node) => {
    node.addEventListener("click", () => switchRoleMode(node.dataset.switchRole));
  });
}

async function switchRoleMode(role) {
  const nextRole = normalizeRole(role);
  const allowed = Array.isArray(state.profile?.availableRoles) && state.profile.availableRoles.some((item) => normalizeRole(item.role) === nextRole);
  if (!nextRole || !allowed) {
    setStatus("Этот режим работы не назначен вашему аккаунту.");
    return;
  }
  const response = await apiFetch("/auth/role/switch", {
    method: "POST",
    body: JSON.stringify({ role: nextRole }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    setStatus(data.detail || "Не удалось переключить режим работы.");
    return;
  }
  state.role = authRole(data) || nextRole;
  persistSession();
  await loadAppData();
  setStatus(`Режим работы: ${roleLabel(state.role)}.`);
}

function bindPasswordToggles() {
  document.querySelectorAll("[data-toggle-password]").forEach((node) => {
    if (node.dataset.boundPasswordToggle === "1") return;
    node.dataset.boundPasswordToggle = "1";
    node.addEventListener("click", () => {
      const target = byId(node.getAttribute("data-toggle-password"));
      if (!target) return;
      const show = target.getAttribute("type") === "password";
      target.setAttribute("type", show ? "text" : "password");
      node.textContent = show ? "Скрыть" : "Показать";
    });
  });
}

async function changePassword() {
  const currentPassword = els.currentPasswordInput?.value || "";
  const newPassword = els.newPasswordInput?.value || "";
  const newPasswordConfirm = els.newPasswordConfirmInput?.value || "";
  if (!currentPassword || !newPassword || !newPasswordConfirm) {
    els.changePasswordStatus.textContent = "Введите текущий пароль, новый пароль и повтор.";
    return;
  }
  if (newPassword !== newPasswordConfirm) {
    els.changePasswordStatus.textContent = "Новые пароли не совпадают.";
    return;
  }
  els.changePasswordBtn.disabled = true;
  els.changePasswordBtn.textContent = "Сохраняем...";
  const response = await apiFetch("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword, newPasswordConfirm }),
  });
  const data = await response.json().catch(() => ({}));
  els.changePasswordBtn.disabled = false;
  els.changePasswordBtn.textContent = "Сохранить новый пароль";
  if (!response.ok) {
    els.changePasswordStatus.textContent = data.detail || "Не удалось сменить пароль.";
    return;
  }
  els.currentPasswordInput.value = "";
  els.newPasswordInput.value = "";
  els.newPasswordConfirmInput.value = "";
  els.changePasswordStatus.textContent = "Пароль изменён.";
}

function renderAccessSummary() {
  if (!els.accessSummary || !state.profile) return;
  const accessItems = Array.isArray(state.access?.items) ? state.access.items : [];
  const plans = state.profile.plans || [];
  const modules = state.profile.modules || [];
  const schoolGrant = accessItems.find((x) => x.schoolId || x.licenseId || x.sourceType === "partner_license");
  const isSchool = Boolean(schoolGrant) || plans.includes("partner_school_full") || modules.includes("chemistry_core") || modules.includes("physics_core");
  const schoolTitle = schoolGrant?.schoolTitle || "Школа №2070";
  const siteTitle = schoolGrant?.siteTitle || "Новая звезда";
  const expires = schoolGrant?.expiresAt ? schoolGrant.expiresAt.slice(0, 10) : "По условиям школьной лицензии";
  els.accessSummary.innerHTML = `
    <article class="accessCard ${isSchool ? "ready" : ""}">
      <span class="accessIcon">✓</span>
      <strong>${isSchool ? "Школьный доступ подключён" : "Базовый доступ"}</strong>
      <p>${isSchool ? `${schoolTitle}, площадка «${siteTitle}». ${schoolGrant?.licenseTitle || "Партнёрская школьная лицензия"}.` : "Доступны стартовые материалы. Расширенные модули открываются по подписке или школьной лицензии."}</p>
    </article>
    <article class="accessCard">
      <span class="accessIcon">↗</span>
      <strong>Модули</strong>
      <p>${modules.length ? modules.map(moduleLabel).join(", ") : "Базовые модули"}</p>
    </article>
    <article class="accessCard">
      <span class="accessIcon">◷</span>
      <strong>Срок действия</strong>
      <p>${isSchool ? expires : "Не ограничен для базовых материалов"}</p>
    </article>
    ${accessItems.map((item) => `<article class="accessCard"><span class="accessIcon">●</span><strong>${escapeHtml(item.summaryRu || item.title || "Доступ")}</strong><p>${escapeHtml(item.statusLabelRu || "Активен")}${item.expiresAt ? ` · до ${escapeHtml(item.expiresAt.slice(0, 10))}` : ""}</p></article>`).join("")}
  `;
}

async function loadUserAccess() {
  if (!state.userId) return;
  const response = await apiFetch(`/users/access?userId=${encodeURIComponent(state.userId)}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return;
  state.access = data;
  renderAccessSummary();
}

function continueAfterRole() {
  els.phoneLoginPanel?.classList.remove("hidden");
  setStatus("Введите логин и пароль. Роль кабинета определится автоматически после входа.");
  els.loginInput?.focus();
}

function openPhoneLoginPanel() {
  els.phoneLoginPanel?.classList.remove("hidden");
  setStatus("Введите телефон, чтобы получить код подтверждения.");
  els.phoneInput?.focus();
}

function openAccessCodePanel() {
  els.accessCodePanel?.classList.remove("hidden");
  els.accessCodeInput?.focus();
}

function closeAccessCodePanel() {
  els.accessCodePanel?.classList.add("hidden");
}

function humanizeKey(key) {
  const map = {
    quickActions: "Быстрые действия",
    classroomsCount: "Классов",
    assignedTasks: "Выдано задач",
    liveDemos: "Онлайн-уроки",
    linkedChildrenCount: "Детей",
    linkedChildren: "Связанные дети",
    monitoringEvents: "События мониторинга",
    recommendedMode: "Рекомендуемый режим",
    practiceEvents: "Практика",
    continue_lesson: "Продолжить урок",
    practice_5_tasks: "Решить 5 задач",
    mini_exam: "Мини-экзамен",
    child_progress: "Прогресс ребенка",
    risk_zones: "Зоны риска",
    daily_plan_20min: "План на 20 минут",
    assign_homework: "Выдать задание",
    open_live_demo: "Открыть онлайн-урок",
    class_analytics: "Аналитика класса",
  };
  return map[key] || key;
}

function subjectCatalogForActiveModule() {
  const subject = state.activeModule === "ai_mentor" ? "ai_mentor" : state.activeModule;
  const subjects = state.contentCatalog?.subjects || [];
  return subjects.find((item) => item.subject === subject) || null;
}

function renderCatalogStatus() {
  if (!els.catalogStatus) return;
  const catalog = state.contentCatalog;
  if (!catalog) {
    els.catalogStatus.innerHTML = "Учебный каталог пока не загружен. Модули доступны, но metadata QA будет показана после обновления.";
    return;
  }
  const subject = subjectCatalogForActiveModule();
  const qa = catalog.qa || {};
  els.catalogStatus.innerHTML = `
    <div class="catalogStatusTop">
      <strong>${subject ? escapeHtml(subject.titleRu) : "Учебный каталог"}</strong>
      <span class="catalogBadge">${escapeHtml(catalog.publicationStatus || "структурировано")}</span>
    </div>
    <div class="muted small">${escapeHtml(subject?.featureRu || "Предметы, экзамены, AI и офлайн-материалы связаны через единую metadata-модель.")}</div>
    <div class="tagWrap catalogTags">
      ${(subject?.programs || catalog.exams || []).slice(0, 6).map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join("")}
    </div>
    <div class="muted small">Публикация: ${escapeHtml(qa.publishGateRu || "только после проверки источников и лицензии")}</div>
  `;
}

async function loadPlatformCatalog() {
  const response = await apiFetch("/content/platform-catalog");
  const data = await response.json().catch(() => ({}));
  if (response.ok && Array.isArray(data.subjects)) {
    state.contentCatalog = data;
  }
  renderCatalogStatus();
}

function renderModules() {
  const modules = state.modules || [];
  const normalized = modules.map((item) => ({
    ...item,
    moduleKey: item.id === "ai_mentor" || item.id === "ai" ? "ai_mentor" : item.id,
  }));
  const preferred = ["chemistry", "physics", "biology", "ai_mentor"];
  const visibleTabs = preferred;
  if (!visibleTabs.includes(state.activeModule)) {
    state.activeModule = visibleTabs[0] || "chemistry";
  }

  els.moduleTabs.innerHTML = visibleTabs
    .map((key) => {
      const item = normalized.find((x) => x.moduleKey === key);
      const available = item?.available ?? false;
      return `<button class="moduleTabBtn ${state.activeModule === key ? "active" : ""} ${available ? "" : "locked"}" type="button" data-module-tab="${key}"><span class="moduleTabTitle">${MODULE_COPY[key]?.title || key}</span><span class="moduleTabMeta">${available ? "Доступен" : "Открывается по подписке"}</span></button>`;
    })
    .join("");

  document.querySelectorAll("[data-module-tab]").forEach((node) => {
    node.addEventListener("click", () => {
      const nextKey = node.dataset.moduleTab;
      const item = normalized.find((x) => x.moduleKey === nextKey);
      if (item && !item.available) {
        state.activeWorkspace = "access";
        renderWorkspaceTabs();
        els.paymentStatus.textContent = `Модуль «${MODULE_COPY[nextKey]?.title || nextKey}» открывается по подписке. Выберите тариф ниже, чтобы активировать доступ.`;
        return;
      }
      state.activeModule = nextKey;
      void loadModuleWorkspace();
    });
  });

  const activeCopy = MODULE_COPY[state.activeModule] || MODULE_COPY.chemistry;
  renderCatalogStatus();
  if (state.moduleLoading) {
    els.modulePanel.innerHTML = `<div class="statusBox">Загружаю модуль ${activeCopy.title}...</div>`;
    return;
  }

  if (state.activeModule === "ai_mentor") {
    const catalog = subjectCatalogForActiveModule();
    const visual = moduleVisual(state.activeModule);
    els.modulePanel.innerHTML = `
      <div class="mentorCard">
        <figure class="moduleVisualHero compact">
          <img src="${visual.hero}" alt="${escapeHtml(visual.alt)}" loading="lazy" />
          <figcaption>${escapeHtml(visual.caption)}</figcaption>
        </figure>
        <h5>AI-наставник</h5>
        <p class="muted small">Спроси по трудной теме, попроси объяснить ошибку или подобрать следующее задание для повторения.</p>
        ${catalog ? `<div class="moduleSectionCard compactCatalog"><strong>${escapeHtml(catalog.featureRu)}</strong><div class="muted small">Статусы: ${(state.contentCatalog?.aiStatuses || []).map(escapeHtml).join(" · ")}</div></div>` : ""}
        <textarea id="mentorQuestion" class="mentorInput" placeholder="Например: объясни, как уравнивать окислительно-восстановительные реакции"></textarea>
        <div class="modulePanelActions">
          <button id="mentorAskBtn" class="btn btn-primary" type="button">Задать вопрос</button>
          <button id="mentorNextTaskBtn" class="btn btn-secondary" type="button">Подобрать следующее задание</button>
        </div>
        <div class="resultBox">${renderPlainText(state.mentorAnswer || "AI-наставник пока не отвечал.")}</div>
      </div>
    `;
    byId("mentorAskBtn")?.addEventListener("click", askMentorFromWeb);
    byId("mentorNextTaskBtn")?.addEventListener("click", requestMentorNextTask);
    return;
  }

  const lessons = state.moduleLessons || [];
  const tasks = state.moduleTasks || [];
  const catalog = subjectCatalogForActiveModule();
  const catalogSections = catalog?.sections || [];
  const exams = state.contentCatalog?.exams || ["ОГЭ", "ЕГЭ", "МЦКО", "ВПР", "билеты"];
  const fallbackLessons = {
    chemistry: ["Периодический закон", "Ионные реакции", "Окислительно-восстановительные реакции"],
    physics: ["Закон Ома", "Движение тела", "Оптика и линзы"],
    biology: ["Клетка и органоиды", "Генетические задачи", "Экология и цепи питания"],
  }[state.activeModule] || ["Разбор вопроса", "План повторения", "Проверка понимания"];
  const labCopy = {
    chemistry: ["Лабораторная: колбы и молекулы", "Опыт с реактивами, молекулярное объяснение, безопасность и отчёт."],
    physics: ["Симулятор закона", "Параметры, формула, график, модель и объяснение типовой ошибки."],
    biology: ["Виртуальный микроскоп", "Увеличение, слои клетки, подписи органоидов и задания по микропрепарату."],
  }[state.activeModule] || ["Учебная практика", "Практический блок связан с темой, задачами, тестом и отчётом."];
  const visual = moduleVisual(state.activeModule);
  const learningFlow = moduleLearningFlow(state.activeModule);
  els.modulePanel.innerHTML = `
    <h4>${activeCopy.title}</h4>
    <p class="muted small">${activeCopy.summary}</p>
    <figure class="moduleVisualHero">
      <img src="${visual.hero}" alt="${escapeHtml(visual.alt)}" loading="lazy" />
      <figcaption>${escapeHtml(visual.caption)}</figcaption>
    </figure>
    <div class="tagWrap">${activeCopy.highlights.map((item) => `<span class="tag">${item}</span>`).join("")}</div>
    <div class="learningFlow" aria-label="Маршрут урока">
      ${learningFlow.map(([step, title, text]) => `<div class="learningFlowStep"><span class="learningFlowNumber">${escapeHtml(step)}</span><strong>${escapeHtml(title)}</strong><p>${escapeHtml(text)}</p></div>`).join("")}
    </div>
    ${catalog ? `<div class="moduleStudyGrid catalogGrid">
      <div class="moduleSectionCard">
        <h5>Структура предмета</h5>
        <div class="muted small">Классы: ${escapeHtml(catalog.grades)} · уровни: ${(catalog.levels || []).map(escapeHtml).join(", ")}</div>
        <div class="tagWrap catalogTags">${(catalog.programs || []).map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join("")}</div>
      </div>
      <div class="moduleSectionCard">
        <h5>Проверяемые сценарии</h5>
        ${catalogSections.map((item) => `<div class="moduleLessonItem"><strong>${escapeHtml(item.titleRu)}</strong><div class="muted small">${escapeHtml(item.topicRu)} · ${escapeHtml(item.statusRu)}</div></div>`).join("")}
      </div>
    </div>` : ""}
    <div class="moduleStudyGrid">
      <div class="moduleSectionCard">
        <h5>1. Теория</h5>
        ${lessons.slice(0, 6).map((item) => `<div class="moduleLessonItem"><strong>${escapeHtml(item.title)}</strong><div class="muted small">${escapeHtml(item.description || "Теория, примеры и проверка понимания по теме.")}</div></div>`).join("") || fallbackLessons.map((title) => `<div class="moduleLessonItem"><strong>${escapeHtml(title)}</strong><div class="muted small">После теории откроются практика, лаборатория или симулятор, тест и AI-разбор.</div></div>`).join("")}
      </div>
      <div class="moduleSectionCard">
        <h5>2. Практика</h5>
        ${tasks.slice(0, 6).map((item) => `<div class="moduleTaskItem"><strong>${escapeHtml(item.title)}</strong><div class="moduleMetric">${escapeHtml(item.type || "практика")} • ${item.estimated_minutes || 5} мин</div><div class="muted small">${escapeHtml(item.description || "Практика по теме.")}</div></div>`).join("") || `<div class="moduleTaskItem"><strong>Мини-тест по теме</strong><div class="moduleMetric">тест • 7 мин</div><div class="muted small">Проверка базовых понятий, расчётов и объяснения результата.</div></div><div class="moduleTaskItem"><strong>Задача с разбором</strong><div class="moduleMetric">задача • 10 мин</div><div class="muted small">Пошаговое решение, типовая ошибка и подсказка AI-наставника.</div></div>`}
      </div>
    </div>
    <div class="moduleStudyGrid">
      <div class="moduleSectionCard accentStudyCard">
        <img class="moduleInlineVisual" src="${visual.card}" alt="${escapeHtml(activeCopy.title)}" loading="lazy" />
        <h5>3. ${escapeHtml(labCopy[0])}</h5>
        <p class="muted small">${escapeHtml(labCopy[1])}</p>
        <div class="tagWrap"><span class="tag">Наблюдение</span><span class="tag">Параметры</span><span class="tag">Вывод</span><span class="tag">Отчёт</span></div>
      </div>
      <div class="moduleSectionCard">
        <h5>5. AI-разбор</h5>
        <p class="muted small">После теста задайте вопрос по теме, попросите объяснить ошибку или получить похожую задачу для повторения.</p>
        <button class="btn btn-secondary" type="button" data-module-tab="ai_mentor">Спросить AI</button>
      </div>
    </div>
    <div class="moduleStudyGrid examGrid">
      <div class="moduleSectionCard">
        <h5>4. Тест и экзамены</h5>
        <div class="tagWrap catalogTags">${exams.map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join("")}</div>
        <label class="fieldLabel" for="examTypeSelect">Тип подготовки</label>
        <select id="examTypeSelect" class="input">
          <option value="oge">ОГЭ</option>
          <option value="ege">ЕГЭ</option>
          <option value="mcko">МЦКО</option>
          <option value="vpr">ВПР</option>
        </select>
        <button id="generateExamBtn" class="btn btn-secondary" type="button">Собрать вариант</button>
        <div class="resultBox">${renderExamVariant(state.examVariant)}</div>
      </div>
      <div class="moduleSectionCard">
        <h5>Билеты</h5>
        <p class="muted small">Вставьте вопросы билета. Система определит темы и соберёт план повторения без публикации вашего текста.</p>
        <textarea id="ticketTextInput" class="mentorInput" placeholder="Например: 1. Периодический закон. 2. Ионные реакции в растворах."></textarea>
        <button id="analyzeTicketBtn" class="btn btn-secondary" type="button">Разобрать билет</button>
        <div class="resultBox">${renderTicketAnalysis(state.ticketAnalysis)}</div>
      </div>
    </div>
    ${state.activeModule === "chemistry" ? renderPeriodicTable() : ""}
    <div class="modulePanelActions">
      <a class="btn btn-primary" href="/api/v1/content/downloads/apk/latest">Открыть модуль в APK</a>
      <button id="refreshModuleBtn" class="btn btn-secondary" type="button">Обновить содержимое</button>
    </div>
  `;
  bindPeriodicTableControls();
  byId("refreshModuleBtn")?.addEventListener("click", () => void loadModuleWorkspace());
  byId("generateExamBtn")?.addEventListener("click", () => void generateExamVariantFromWeb());
  byId("analyzeTicketBtn")?.addEventListener("click", () => void analyzeTicketFromWeb());
}

function renderExamVariant(variant) {
  if (!variant?.questions?.length) return "Вариант ещё не собирался.";
  return `
    <strong>${escapeHtml(variant.examTitleRu)} · вариант ${escapeHtml(variant.variantId)}</strong>
    ${variant.questions.slice(0, 6).map((item) => `<div class="moduleTaskItem"><strong>${item.number}. ${escapeHtml(item.topicRu)}</strong><div class="moduleMetric">${escapeHtml(item.sectionRu)} · ${escapeHtml(item.difficulty)} · ${escapeHtml(item.format)}</div><div class="muted small">${escapeHtml(item.promptRu)}</div></div>`).join("")}
    <div class="muted small">${escapeHtml(variant.analysisPolicyRu || "После попытки будет предложено повторение слабых тем.")}</div>
  `;
}

function renderTicketAnalysis(analysis) {
  if (!analysis?.detectedTopics?.length) return "Билет ещё не анализировался.";
  return `
    <strong>План повторения</strong>
    ${(analysis.repeatPlanRu || []).map((item) => `<div class="moduleLessonItem">${escapeHtml(item)}</div>`).join("")}
    <div class="muted small">${escapeHtml(analysis.sourcePolicyRu || "Текст используется только для личного анализа.")}</div>
  `;
}

async function loadModuleWorkspace() {
  state.moduleLoading = true;
  renderModules();
  if (state.activeModule === "ai_mentor") {
    state.moduleLoading = false;
    renderModules();
    return;
  }
  const moduleId = MODULE_TO_API[state.activeModule];
  if (!moduleId) {
    state.moduleLessons = [];
    state.moduleTasks = [];
    state.moduleLoading = false;
    renderModules();
    return;
  }
  const [lessonsRes, tasksRes] = await Promise.all([
    apiFetch(`/content/lesson-blocks?module_id=${encodeURIComponent(moduleId)}&limit=12`),
    apiFetch(`/content/tasks?module_id=${encodeURIComponent(moduleId)}&limit=12`),
  ]);
  const lessons = await lessonsRes.json().catch(() => ({}));
  const tasks = await tasksRes.json().catch(() => ({}));
  state.moduleLessons = lessons.lesson_blocks || [];
  state.moduleTasks = tasks.tasks || [];
  state.moduleLoading = false;
  renderModules();
}

async function generateExamVariantFromWeb() {
  const examType = byId("examTypeSelect")?.value || "oge";
  const subject = state.activeModule === "ai_mentor" ? "chemistry" : state.activeModule;
  state.examVariant = { questions: [], examTitleRu: "Собираю вариант", variantId: "...", analysisPolicyRu: "Подбираю задания без недавних повторов." };
  renderModules();
  const response = await apiFetch("/content/exams/generate", {
    method: "POST",
    body: JSON.stringify({ subject, examType, count: 6, seed: state.userId || "web" }),
  });
  const data = await response.json().catch(() => ({}));
  state.examVariant = response.ok ? data : { questions: [], examTitleRu: "Ошибка", variantId: "", analysisPolicyRu: data.detail || "Не удалось собрать вариант." };
  renderModules();
}

async function analyzeTicketFromWeb() {
  const text = byId("ticketTextInput")?.value?.trim();
  if (!text) return;
  const subject = state.activeModule === "ai_mentor" ? "chemistry" : state.activeModule;
  state.ticketAnalysis = { detectedTopics: [{ topicRu: "Анализирую билет", sectionRu: "", difficulty: "", matchScore: 0 }], repeatPlanRu: ["Определяю темы и план повторения..."] };
  renderModules();
  const response = await apiFetch("/content/tickets/analyze", {
    method: "POST",
    body: JSON.stringify({ subject, text }),
  });
  const data = await response.json().catch(() => ({}));
  state.ticketAnalysis = response.ok ? data : { detectedTopics: [], repeatPlanRu: [data.detail || "Не удалось разобрать билет."] };
  renderModules();
}

async function askMentorFromWeb() {
  const question = byId("mentorQuestion")?.value?.trim();
  if (!question) return;
  state.mentorAnswer = "AI-наставник подбирает объяснение...";
  renderModules();
  const response = await apiFetch("/ai-mentor/ask", {
    method: "POST",
    body: JSON.stringify({ question, subject: "chemistry", language: "ru", mode: "auto" }),
  });
  const data = await response.json().catch(() => ({}));
  state.mentorAnswer = data.answer || data.detail || "AI-наставник пока не смог подготовить ответ.";
  renderModules();
}

async function requestMentorNextTask() {
  state.mentorAnswer = "Подбираю следующее задание по сложным темам и ошибкам...";
  renderModules();
  const response = await apiFetch("/ai-mentor/next-task", {
    method: "POST",
    body: JSON.stringify({ device_id: state.userId || "web-user", subject: "chemistry", language: "ru" }),
  });
  const data = await response.json().catch(() => ({}));
  if (data?.found && data?.task) {
    const task = data.task;
    state.mentorAnswer = [
      "Рекомендованное задание:",
      task.title || task.id || "Задание",
      task.description || "Откройте задание, чтобы продолжить тренировку.",
    ].filter(Boolean).join("\n");
  } else {
    state.mentorAnswer = data?.message || data?.reason || "Пока нет подходящего задания. Попробуйте пройти ещё одну тему или задайте вопрос AI-наставнику.";
  }
  renderModules();
}

function renderPaymentPlans() {
  els.paymentPlans.innerHTML = PAYMENT_OPTIONS.map((plan) => `
    <article class="planCard">
      <div class="planMeta">${plan.title}</div>
      <div class="planPrice">${plan.amountRub} ₽</div>
      <p class="muted small">${plan.subtitle}</p>
      <button class="btn btn-secondary" type="button" data-buy="${plan.moduleId}">Перейти к оплате</button>
    </article>
  `).join("");
  document.querySelectorAll("[data-buy]").forEach((btn) => btn.addEventListener("click", () => createPayment(btn.dataset.buy)));
}

async function createPayment(moduleId) {
  const plan = PAYMENT_OPTIONS.find((item) => item.moduleId === moduleId);
  if (!plan) return;
  els.paymentStatus.textContent = "Готовлю страницу оплаты...";
  const response = await apiFetch("/payments/create", {
    method: "POST",
    body: JSON.stringify({
      provider: plan.provider,
      moduleId: plan.moduleId,
      amountRub: plan.amountRub,
      returnUrl: `${window.location.origin}${window.location.pathname}`,
      idempotencyKey: `web-${plan.moduleId}`,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    els.paymentStatus.textContent = data.detail || "Не удалось подготовить оплату.";
    return;
  }
  state.payment = data;
  const paymentUrl = data["checkout" + "Url"];
  const payLink = paymentUrl ? `<a href="${escapeHtml(paymentUrl)}" target="_blank" rel="noreferrer">перейти к оплате</a>` : "ссылка скоро появится";
  els.paymentStatus.innerHTML = `Оплата подготовлена: ${payLink}. Статус: ${escapeHtml(humanPaymentStatus(data.status))}.`;
}

function renderDevices() {
  const payload = state.devices || {};
  const devices = Array.isArray(payload.items) ? payload.items : Array.isArray(payload.devices) ? payload.devices : [];
  const activeDevices = devices.filter((item) => item.active !== false);
  const limit = payload.limit || payload.deviceLimit || "-";
  els.devicesSummary.textContent = `Активных устройств: ${activeDevices.length} из ${limit}.`;
  if (!devices.length) {
    els.devicesList.innerHTML = `<div class="resultBox">Устройства пока не привязаны.</div>`;
    return;
  }
  els.devicesList.innerHTML = devices.map((item) => {
    const deviceId = String(item.deviceId || item.device_id || "");
    const title = escapeHtml(item.label || item.deviceName || deviceId || "Устройство");
    const platform = escapeHtml(item.platform || "web");
    const status = item.active === false ? "Отключено" : "Активно";
    const lastSeen = escapeHtml(item.lastSeenAt || item.registeredAt || item.createdAt || "нет данных");
    return `
      <article class="deviceCard ${item.active === false ? "inactive" : ""}">
        <div>
          <strong>${title}</strong>
          <div class="muted small">${platform} · ${lastSeen}</div>
          <div class="muted small">${escapeHtml(deviceId)}</div>
        </div>
        <div class="deviceActions">
          <span class="tag">${status}</span>
          ${item.active === false ? "" : `<button class="btn btn-secondary" type="button" data-revoke-device="${escapeHtml(deviceId)}">Отключить</button>`}
        </div>
      </article>`;
  }).join("");
  document.querySelectorAll("[data-revoke-device]").forEach((node) => {
    node.addEventListener("click", () => revokeDevice(node.dataset.revokeDevice));
  });
}

async function loadDevices() {
  if (!state.userId) return;
  els.deviceStatus.textContent = "Загружаю список устройств...";
  const response = await apiFetch(`/users/devices?userId=${encodeURIComponent(state.userId)}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    els.deviceStatus.textContent = data.detail || "Не удалось загрузить устройства.";
    return;
  }
  state.devices = data;
  renderDevices();
  els.deviceStatus.textContent = "Список устройств обновлен.";
}

async function registerCurrentDevice() {
  if (!state.userId) return;
  const deviceId = ensureWebDeviceId();
  const label = els.deviceLabelInput.value.trim() || "Браузер";
  els.deviceStatus.textContent = "Привязываю текущее устройство...";
  const response = await apiFetch("/users/devices/register", {
    method: "POST",
    body: JSON.stringify({ userId: state.userId, deviceId, label, platform: "web" }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    els.deviceStatus.textContent = data.detail || "Не удалось привязать устройство.";
    return;
  }
  state.devices = data.devices ? data : state.devices;
  els.deviceStatus.textContent = "Устройство привязано.";
  await loadDevices();
}

async function revokeDevice(deviceId) {
  if (!state.userId || !deviceId) return;
  els.deviceStatus.textContent = "Отключаю устройство...";
  const response = await apiFetch("/users/devices/revoke", {
    method: "POST",
    body: JSON.stringify({ userId: state.userId, deviceId }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    els.deviceStatus.textContent = data.detail || "Не удалось отключить устройство.";
    return;
  }
  els.deviceStatus.textContent = "Устройство отключено.";
  await loadDevices();
}

async function activateRecoveryCode() {
  const code = els.deviceRecoveryCodeInput.value.trim().toUpperCase();
  const phone = els.deviceRecoveryPhoneInput.value.trim() || state.phone;
  if (!code || !phone) {
    els.deviceStatus.textContent = "Введите код восстановления и телефон.";
    return;
  }
  els.deviceStatus.textContent = "Проверяю код восстановления...";
  const response = await fetch(`${API_BASE}/auth/device-recovery/activate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, phone }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    els.deviceStatus.textContent = data.detail || "Не удалось войти по коду восстановления.";
    return;
  }
  state.phone = data.phone || phone;
  state.userId = data.userId;
  state.accessToken = data.accessToken;
  state.refreshToken = data.refreshToken;
  state.role = normalizeRole(data.role || state.role);
  persistSession();
  await loadAppData();
  state.activeWorkspace = "devices";
  renderWorkspaceTabs();
  els.deviceStatus.textContent = "Вход по коду восстановления выполнен.";
}

function renderTeacherClasses() {
  const box = byId("teacherClassesPanel");
  if (!box) return;
  const rows = Array.isArray(state.teacherClasses?.items) ? state.teacherClasses.items : [];
  if (!rows.length) {
    box.innerHTML = `<div class="resultBox">Классы пока не назначены этому учителю.</div>`;
    return;
  }
  box.innerHTML = rows.map((cls) => {
    const students = Array.isArray(cls.students) ? cls.students : [];
    const inactive = Array.isArray(cls.inactiveStudents) ? cls.inactiveStudents : [];
    return `
      <article class="teacherClassCard">
        <div class="teacherClassHeader">
          <div>
            <strong>${escapeHtml(cls.title || cls.classId)}</strong>
            <div class="muted small">${escapeHtml(cls.positionLabelRu || cls.roleLabelRu || "Учитель")} · ${escapeHtml(cls.subjectLabelRu || "предмет не указан")} · активных учеников: ${students.length} · ждут активации: ${inactive.length}</div>
          </div>
        </div>
        <div class="teacherStudentList">
          ${students.map((student) => `
            <div class="teacherStudentRow">
              <div>
                <strong>${safePersonName(student, "Ученик")}</strong>
                <div class="muted small">Активных устройств: ${student.deviceCount || 0}</div>
              </div>
              <button class="btn btn-secondary" type="button" data-teacher-reset-device="${escapeHtml(student.userId)}" data-teacher-class-id="${escapeHtml(cls.classId)}" data-teacher-school-id="${escapeHtml(cls.schoolId || "")}">Сбросить устройства</button>
            </div>`).join("") || `<div class="muted small">Активированных учеников пока нет.</div>`}
        </div>
        <details class="teacherInactiveBlock">
          <summary>Неактивированные ученики (${inactive.length})</summary>
          ${inactive.map((item) => `<div class="teacherInviteRow"><strong>${escapeHtml(item.studentLabel || item.title || "Ученик")}</strong><span>${escapeHtml(item.code)}</span><button class="btn btn-secondary" type="button" data-copy-code="${escapeHtml(item.code)}">Копировать</button></div>`).join("") || `<div class="muted small">Нет ожидающих активации кодов.</div>`}
        </details>
      </article>`;
  }).join("");
  document.querySelectorAll("[data-teacher-reset-device]").forEach((node) => {
    node.addEventListener("click", () => resetStudentDevices(node.dataset.teacherResetDevice, node.dataset.teacherClassId, node.dataset.teacherSchoolId));
  });
  document.querySelectorAll("[data-copy-code]").forEach((node) => {
    node.addEventListener("click", () => copyTextToClipboard(node.dataset.copyCode, "teacherClassesStatus"));
  });
}

async function loadTeacherClasses() {
  const status = byId("teacherClassesStatus");
  if (status) status.textContent = "Загружаю классы...";
  const response = await apiFetch("/cabinet/teacher/classes");
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (status) status.textContent = data.detail || "Не удалось загрузить классы.";
    return;
  }
  state.teacherClasses = data;
  renderTeacherClasses();
  if (status) status.textContent = "Классы обновлены.";
}

async function resetStudentDevices(studentUserId, classId, schoolId) {
  const status = byId("teacherClassesStatus");
  if (!studentUserId || !classId) return;
  if (status) status.textContent = "Сбрасываю устройства ученика...";
  const response = await apiFetch(`/cabinet/teacher/students/${encodeURIComponent(studentUserId)}/devices/reset`, {
    method: "POST",
    body: JSON.stringify({ classId, schoolId: schoolId || null }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (status) status.textContent = data.detail || "Не удалось сбросить устройства.";
    return;
  }
  if (status) status.innerHTML = `Устройства сброшены. Код восстановления: <strong>${escapeHtml(data.recoveryCode)}</strong> <button class="btn btn-secondary inlineCopyBtn" type="button" data-copy-recovery="${escapeHtml(data.recoveryCode)}">Копировать</button>`;
  byId("teacherClassesStatus")?.querySelector("[data-copy-recovery]")?.addEventListener("click", () => copyTextToClipboard(data.recoveryCode, "teacherClassesStatus"));
  await loadTeacherClasses();
  if (status) status.innerHTML = `Устройства сброшены. Код восстановления: <strong>${escapeHtml(data.recoveryCode)}</strong> <button class="btn btn-secondary inlineCopyBtn" type="button" data-copy-recovery="${escapeHtml(data.recoveryCode)}">Копировать</button>`;
  byId("teacherClassesStatus")?.querySelector("[data-copy-recovery]")?.addEventListener("click", () => copyTextToClipboard(data.recoveryCode, "teacherClassesStatus"));
}

async function renderRoleWorkspace() {
  els.roleWorkspace.innerHTML = `<div class="statusBox">Загружаю рабочий сценарий по роли...</div>`;
  if (!state.role) return;

  if (state.role === "teacher" || state.role === "homeroom_teacher") {
    const overviewRes = await apiFetch("/cabinet/teacher/overview");
    const overview = await overviewRes.json().catch(() => ({}));
    const showLiveLaunch = canShowTeacherLiveLaunch();
    const classCount = (overview.classes || []).length;
    const pendingCheck = overview.homeworkSummary?.pendingCheck || 0;
    const livePanel = state.role === "homeroom_teacher"
      ? `<div class="inlinePanel"><h4>Мониторинг класса</h4><p class="muted small">Классному руководителю показана сводка класса. Запуск онлайн-урока не является основным сценарием этой роли.</p></div>`
      : `<div class="inlinePanel">
          <h4>Онлайн-урок</h4>
          ${showLiveLaunch ? `
            <label class="fieldLabel" for="teacherLiveTitle">Название урока</label>
            <input id="teacherLiveTitle" class="input" type="text" placeholder="Например: Ионные реакции" />
            <button id="teacherStartLiveBtn" class="btn btn-primary" type="button">Запустить онлайн-урок</button>
            <div id="teacherLiveResult" class="resultBox">Онлайн-урок ещё не создавался.</div>
          ` : `<div class="resultBox">Подключите школу или класс, чтобы запускать онлайн-уроки.</div>`}
        </div>`;
    els.roleWorkspace.innerHTML = `
      <div class="roleWorkspaceGrid">
        <div class="inlinePanel">
          <h4>${state.role === "homeroom_teacher" ? "Кабинет классного руководителя" : "Кабинет учителя"}</h4>
          <div class="statusBox">Вы: ${escapeHtml(formatRolePosition(state.profile))}</div>
          ${statCards([
            { label: "Классы", value: classCount, hint: classCount ? "назначены сервером" : "пока нет назначений" },
            { label: "Выдано задач", value: overview.homeworkSummary?.assigned || 0, hint: "активные задания" },
            { label: "Ждёт проверки", value: pendingCheck, hint: pendingCheck ? "требует внимания" : "очередь пуста" },
            { label: "Онлайн-уроки", value: overview.analytics?.liveDemos || 0, hint: "проведено" },
          ])}
          ${actionList([
            { title: "Проверить классы", text: "Откройте список учеников, коды активации и сброс устройств." },
            { title: "Подготовить урок", text: "Используйте доступные модули и лабораторные как материал занятия." },
          ])}
        </div>
        ${livePanel}
      </div>
      <div class="inlinePanel teacherClassesBox">
        <div class="teacherClassHeader">
          <div>
            <h4>Мои классы</h4>
            <p class="muted small">Активированные ученики, ожидающие активации коды и сброс устройств.</p>
          </div>
          <button id="teacherLoadClassesBtn" class="btn btn-secondary" type="button">Обновить классы</button>
        </div>
        <div id="teacherClassesStatus" class="statusBox">Классы еще не загружены.</div>
        <div id="teacherClassesPanel" class="teacherClassesPanel"></div>
      </div>
    `;
    byId("teacherStartLiveBtn")?.addEventListener("click", startTeacherLiveSession);
    byId("teacherLoadClassesBtn").addEventListener("click", loadTeacherClasses);
    await loadTeacherClasses();
    return;
  }

  if (state.role === "parent") {
    const overviewRes = await apiFetch("/cabinet/parent/overview");
    const overview = await overviewRes.json().catch(() => ({}));
    let progressHtml = '<div class="resultBox">Нет данных о ребенке.</div>';
    if ((overview.children || []).length) {
      const childId = overview.children[0].id;
      const progressRes = await apiFetch(`/cabinet/parent/children/${encodeURIComponent(childId)}/progress`);
      const progress = await progressRes.json().catch(() => ({}));
      progressHtml = `<div class="resultBox">${renderProgressSummary(progress)}</div>`;
    }
    els.roleWorkspace.innerHTML = `
      <div class="roleWorkspaceGrid">
        <div class="inlinePanel">
          <h4>Кабинет родителя</h4>
          ${statCards([
            { label: "Дети", value: (overview.children || []).length, hint: "подключены к кабинету" },
            { label: "Уведомления", value: (overview.alerts || []).length, hint: "важные события" },
            { label: "Рекомендации", value: (overview.recommendations || []).length, hint: "что повторить" },
          ])}
          <div class="resultBox">${renderParentOverviewSummary(overview)}</div>
        </div>
        <div class="inlinePanel">
          <h4>Прогресс ребенка</h4>
          ${progressHtml}
        </div>
      </div>
    `;
    return;
  }

  const showStudentLive = canShowStudentLive(null);
  const modulesCount = (state.profile?.modules || []).length;
  const plansCount = (state.profile?.plans || []).length;
  els.roleWorkspace.innerHTML = `
    <div class="roleWorkspaceGrid">
      <div class="inlinePanel">
        <h4>Учебная сводка</h4>
        ${statCards([
          { label: "Модули", value: modulesCount, hint: modulesCount ? "доступны сейчас" : "стартовый доступ" },
          { label: "Планы", value: plansCount, hint: "активные доступы" },
          { label: "Школьный доступ", value: hasSchoolAccess() ? "Да" : "Нет", hint: hasSchoolAccess() ? "подключён" : "можно активировать код" },
        ])}
        ${actionList([
          { title: "Продолжить учёбу", text: "Откройте Химию, Физику или Биологию в разделе модулей." },
          { title: "Закрепить тему", text: "Запустите практику, мини-тест или задайте вопрос AI-помощнику." },
          { title: "Проверить доступ", text: "Если школа выдала код, активируйте его в блоке входа или попросите учителя." },
        ])}
      </div>
      ${showStudentLive ? `<div class="inlinePanel">
        <h4>Учитель начал онлайн-урок</h4>
        <label class="fieldLabel" for="studentJoinCode">Код урока</label>
        <input id="studentJoinCode" class="input" type="text" placeholder="A1B2C3" />
        <label class="fieldLabel" for="studentClassroom">Класс</label>
        <input id="studentClassroom" class="input" type="text" placeholder="8А" value="8А" />
        <button id="studentJoinLiveBtn" class="btn btn-primary" type="button">Подключиться</button>
        <div id="studentJoinResult" class="resultBox">Подключение ещё не выполнялось.</div>
      </div>` : ""}
    </div>
  `;
  byId("studentJoinLiveBtn")?.addEventListener("click", joinStudentLive);
}

async function startTeacherLiveSession() {
  const title = byId("teacherLiveTitle").value.trim() || "Онлайн-урок Алхимика";
  const response = await apiFetch(`/cabinet/teacher/live/session/start?title=${encodeURIComponent(title)}&moduleId=chemistry&lessonId=web_live_intro`, {
    method: "POST",
  });
  const data = await response.json().catch(() => ({}));
  const box = byId("teacherLiveResult");
  const joinCode = data.joinCode || data.join_code || data.code || data.sessionCode;
  const message = response.ok
    ? (joinCode ? `Онлайн-урок запущен. Код урока: ${joinCode}` : "Онлайн-урок запущен.")
    : (data.detail || data.message || "Не удалось запустить онлайн-урок.");
  box.textContent = message;
}

async function joinStudentLive() {
  const joinCode = byId("studentJoinCode").value.trim();
  const classroom = byId("studentClassroom").value.trim() || "8A";
  const box = byId("studentJoinResult");
  if (!joinCode) {
    box.textContent = "Введите код урока.";
    return;
  }
  const response = await apiFetch(`/cabinet/live/join?joinCode=${encodeURIComponent(joinCode)}&classroom=${encodeURIComponent(classroom)}`, {
    method: "POST",
  });
  const data = await response.json().catch(() => ({}));
  const message = response.ok
    ? "Вы подключены к онлайн-уроку."
    : (data.detail || data.message || "Не удалось подключиться к онлайн-уроку.");
  box.textContent = message;
}

function renderPlainText(value) {
  return escapeHtml(value).replaceAll("\n", "<br />");
}

function humanPaymentStatus(status) {
  const labels = {
    pending: "ожидает оплаты",
    waiting: "ожидает оплаты",
    paid: "оплачено",
    succeeded: "оплачено",
    failed: "не прошла",
    canceled: "отменена",
  };
  return labels[String(status || "").toLowerCase()] || "ожидает оплаты";
}

function renderParentOverviewSummary(overview) {
  const children = (overview.children || []).length;
  const alerts = (overview.alerts || []).length;
  const recommendations = (overview.recommendations || []).length;
  return `Детей: ${children}. Уведомлений: ${alerts}. Рекомендаций: ${recommendations}.`;
}

function renderProgressSummary(progress) {
  const completed = progress.completedLessons || progress.completed || progress.done || 0;
  const total = progress.totalLessons || progress.total || progress.lessonsTotal || 0;
  if (total) return `Пройдено: ${completed} из ${total}.`;
  return progress.summary || progress.message || "Прогресс загружен.";
}

function escapeJson(value) {
  return JSON.stringify(value, null, 2)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function copyTextToClipboard(text, statusId = null) {
  const value = String(text || "").trim();
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    if (statusId && byId(statusId)) byId(statusId).textContent = "Код скопирован.";
  } catch {
    if (statusId && byId(statusId)) byId(statusId).textContent = "Скопируйте код вручную: " + value;
  }
}

async function loadAppData() {
  const meRes = await apiFetch("/auth/me");
  const me = await meRes.json().catch(() => ({}));
  if (!meRes.ok) {
    clearSession();
    render();
    setStatus(me.detail || "Вход устарел. Войдите снова.");
    return;
  }
  state.userId = me.userId;
  state.role = authRole(me);
  persistSession();

  const [profileRes, modulesRes, catalogRes] = await Promise.all([
    apiFetch("/users/profile"),
    apiFetch("/modules"),
    apiFetch("/content/platform-catalog"),
  ]);
  state.profile = await profileRes.json().catch(() => ({}));
  const modulesData = await modulesRes.json().catch(() => ({}));
  const catalogData = await catalogRes.json().catch(() => ({}));
  state.modules = modulesData.modules || [];
  state.contentCatalog = catalogRes.ok && Array.isArray(catalogData.subjects) ? catalogData : null;
  await loadUserAccess();
  if (state.activeWorkspace === "modules") state.activeWorkspace = "cabinet";
  render();
  await loadModuleWorkspace();
  await renderRoleWorkspace();
}

function render() {
  renderSessionMeta();
  setRoleSelection(state.role || "");
  els.phoneInput.value = state.phone || "";
  renderPaymentPlans();
  renderWorkspaceTabs();
  if (state.profile) {
    renderProfile();
    renderModules();
  } else {
    els.profileSummary.innerHTML = "";
    els.entitlementsSummary.innerHTML = "";
    els.roleSummary.innerHTML = "";
    els.quickActions.innerHTML = "";
    if (els.roleModeSwitcher) {
      els.roleModeSwitcher.classList.add("hidden");
      els.roleModeSwitcher.innerHTML = "";
    }
    els.accessSummary.innerHTML = "";
    els.moduleTabs.innerHTML = "";
    els.modulePanel.innerHTML = "";
    if (els.catalogStatus) els.catalogStatus.textContent = "Войдите, чтобы увидеть учебный каталог и доступные модули.";
    els.workspaceModules.classList.add("hidden");
    els.workspaceCabinet.classList.add("hidden");
    els.workspaceAccess.classList.add("hidden");
    els.workspaceBilling.classList.add("hidden");
    els.workspaceDevices.classList.add("hidden");
    els.devicesSummary.textContent = "Список устройств не загружен.";
    els.devicesList.innerHTML = "";
    els.roleWorkspace.innerHTML = "";
  }
}

function bindEvents() {
  bindPasswordToggles();
  document.querySelectorAll("[data-role]").forEach((node) => {
    node.addEventListener("click", () => setRoleSelection(node.dataset.role));
  });
  document.querySelectorAll("[data-auth-action]").forEach((node) => {
    node.addEventListener("click", () => {
      document.querySelectorAll("[data-auth-action]").forEach((item) => item.classList.toggle("active", item === node));
      if (node.dataset.authAction === "access-code") return openAccessCodePanel();
      if (node.dataset.authAction === "phone") return openPhoneLoginPanel();
      return continueAfterRole();
    });
  });
  els.roleContinueBtn?.addEventListener("click", continueAfterRole);
  els.openAccessCodeBtn?.addEventListener("click", openAccessCodePanel);
  els.closeAccessCodeBtn?.addEventListener("click", closeAccessCodePanel);
  els.requestCodeBtn.addEventListener("click", requestCode);
  els.verifyCodeBtn.addEventListener("click", verifyCode);
  els.loginPasswordBtn?.addEventListener("click", loginPassword);
  els.previewAccessCodeBtn?.addEventListener("click", previewAccessCode);
  els.activateAccessCodeBtn.addEventListener("click", activateAccessCode);
  els.changePasswordBtn?.addEventListener("click", changePassword);
  byId("refreshDevicesBtn")?.addEventListener("click", loadDevices);
  byId("registerDeviceBtn")?.addEventListener("click", registerCurrentDevice);
  byId("activateRecoveryBtn")?.addEventListener("click", activateRecoveryCode);
  els.refreshSessionBtn?.addEventListener("click", async () => {
    const ok = await refreshSession();
    if (ok) {
      await loadAppData();
      setStatus("Сессия обновлена.");
    } else {
      setStatus("Не удалось обновить сессию.");
    }
  });
  els.logoutBtn.addEventListener("click", logout);
  byId("cabinetLogoutBtn")?.addEventListener("click", logout);
}

async function bootstrap() {
  initElements();
  readSession();
  bindEvents();
  render();
  await loadApkReleaseNotice();
  if (state.accessToken && state.refreshToken) {
    await loadAppData();
    setStatus("Вход восстановлен.");
  }
}

window.addEventListener("DOMContentLoaded", bootstrap);
