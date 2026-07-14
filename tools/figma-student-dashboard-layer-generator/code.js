// Allchemist Student Dashboard Layer Generator
// Plain JavaScript Figma development plugin. No build step required.

const TARGET_FRAME_NAME = "APPROVED_WEB_STUDENT_DASHBOARD_TRACING_BASE";
const GENERATED_FRAME_BASE_NAME = "STUDENT_DASHBOARD_EDITABLE_LAYERS_V1";
const REFERENCE_LAYER_NAME = "approved_web_student_dashboard_reference_LOCKED";
const NOTES_FRAME_NAME = "CODEX_HANDOFF_NOTES_STUDENT_DASHBOARD";

const TOKENS = {
  viewport: { width: 1672, height: 941 },
  colors: {
    pageTop: "#F8FBFF",
    pageBottom: "#EEF5FF",
    sidebarTop: "#073576",
    sidebarMid: "#06285F",
    sidebarBottom: "#041943",
    sidebarText: "#F0F7FF",
    sidebarMuted: "#B8D7F5",
    activeBlue: "#1479FF",
    activeBlueDark: "#0A55D7",
    cyan: "#20D7FF",
    violet: "#7C5CFF",
    green: "#23C483",
    warning: "#F5A524",
    danger: "#EF4E5C",
    ink: "#081A46",
    inkSoft: "#173763",
    muted: "#687895",
    card: "#FFFFFF",
    cardTint: "#F7FBFF",
    border: "#DBE8FB",
    line: "#EEF3FF",
    button: "#116DFF",
    button2: "#585CFF"
  },
  radius: { card: 13, button: 8, tile: 10, row: 9, pill: 999, search: 12 },
  font: { family: "Inter" },
  shadows: {
    card: { color: "#123267", opacity: 0.08, x: 0, y: 11, blur: 28 },
    button: { color: "#116DFF", opacity: 0.28, x: 0, y: 12, blur: 24 },
    sidebar: { color: "#081F4E", opacity: 0.2, x: 12, y: 0, blur: 32 }
  }
};

const ZONES = {
  sidebar: { name: "StudentSidebar", x: 0, y: 0, w: 236, h: 941 },
  topbar: { name: "StudentTopbar", x: 236, y: 0, w: 1436, h: 88 },
  greeting: { name: "StudentGreeting", x: 268, y: 18, w: 350, h: 54 },
  continue: { name: "ContinueLearningCard", x: 268, y: 92, w: 560, h: 260 },
  live: { name: "LiveLessonCard", x: 844, y: 92, w: 468, h: 260 },
  aiRecs: { name: "AIRecommendationsCard", x: 1330, y: 92, w: 306, h: 260 },
  quick: { name: "QuickAccessStrip", x: 268, y: 366, w: 1368, h: 112 },
  assignments: { name: "AssignmentsCard", x: 268, y: 500, w: 430, h: 218 },
  progress: { name: "SubjectProgressCard", x: 714, y: 500, w: 430, h: 218 },
  weak: { name: "WeakTopicsCard", x: 1160, y: 500, w: 476, h: 218 },
  popular: { name: "PopularNowCard", x: 268, y: 734, w: 430, h: 190 },
  weekly: { name: "WeeklyProgressCard", x: 714, y: 734, w: 452, h: 190 },
  locked: { name: "LockedFeatureCard", x: 1188, y: 734, w: 452, h: 190 },
  assistant: { name: "AIAssistantWidget", x: 1390, y: 735, w: 260, h: 190 }
};

const NAV_ITEMS = [
  ["Главная", "home"],
  ["Мои курсы", "book"],
  ["Теория", "theory"],
  ["Задания", "tasks"],
  ["Лаборатории", "flask"],
  ["Визуализация", "molecule"],
  ["Справочники", "database"],
  ["Экзамены", "cap"],
  ["Диагностика", "chart"],
  ["AI-наставник", "bot"],
  ["Прогресс", "bars"],
  ["Сообщения", "message"],
  ["Настройки", "gear"]
];

const QUICK_ITEMS = [
  ["Теория", "book"],
  ["Задания", "tasks"],
  ["Лаборатории", "flask"],
  ["3D-молекулы", "molecule"],
  ["Таблица элементов", "periodic"],
  ["Симуляторы", "wave"],
  ["Микроскоп", "microscope"],
  ["Экзамены", "cap"],
  ["AI-наставник", "bot"]
];

function rgb(hex) {
  const normalized = hex.replace("#", "");
  const value = parseInt(normalized, 16);
  return {
    r: ((value >> 16) & 255) / 255,
    g: ((value >> 8) & 255) / 255,
    b: (value & 255) / 255
  };
}

function paint(hex, opacity) {
  return [{ type: "SOLID", color: rgb(hex), opacity: opacity === undefined ? 1 : opacity }];
}

function effectShadow(definition) {
  return [{
    type: "DROP_SHADOW",
    color: { ...rgb(definition.color), a: definition.opacity },
    offset: { x: definition.x, y: definition.y },
    radius: definition.blur,
    spread: 0,
    visible: true,
    blendMode: "NORMAL"
  }];
}

function setPosition(node, x, y, w, h) {
  node.x = x;
  node.y = y;
  if (w !== undefined && h !== undefined) node.resize(w, h);
}

function frame(parent, name, x, y, w, h) {
  const node = figma.createFrame();
  node.name = name;
  setPosition(node, x, y, w, h);
  node.fills = [];
  node.clipsContent = true;
  parent.appendChild(node);
  return node;
}

function rect(parent, name, x, y, w, h, fill, radius, stroke, effects) {
  const node = figma.createRectangle();
  node.name = name;
  setPosition(node, x, y, w, h);
  node.fills = fill ? paint(fill) : [];
  node.cornerRadius = radius || 0;
  if (stroke) {
    node.strokes = paint(stroke);
    node.strokeWeight = 1;
  } else {
    node.strokes = [];
  }
  node.effects = effects || [];
  parent.appendChild(node);
  return node;
}

function line(parent, name, x1, y1, x2, y2, color, weight) {
  const node = figma.createLine();
  node.name = name;
  node.x = x1;
  node.y = y1;
  node.resize(Math.max(1, x2 - x1), 0);
  node.rotation = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
  node.strokes = paint(color);
  node.strokeWeight = weight || 2;
  parent.appendChild(node);
  return node;
}

function ellipse(parent, name, x, y, w, h, fill, stroke, weight) {
  const node = figma.createEllipse();
  node.name = name;
  setPosition(node, x, y, w, h);
  node.fills = fill ? paint(fill) : [];
  node.strokes = stroke ? paint(stroke) : [];
  node.strokeWeight = weight || 1;
  parent.appendChild(node);
  return node;
}

async function text(parent, name, value, x, y, w, h, size, style, color, align) {
  const node = figma.createText();
  node.name = name;
  node.fontName = { family: TOKENS.font.family, style: style || "Regular" };
  node.characters = value;
  node.fontSize = size;
  node.fills = paint(color || TOKENS.colors.ink);
  node.textAutoResize = "NONE";
  node.textAlignHorizontal = align || "LEFT";
  node.textAlignVertical = "TOP";
  node.lineHeight = { unit: "PIXELS", value: Math.round(size * 1.28) };
  setPosition(node, x, y, w, h);
  parent.appendChild(node);
  return node;
}

function svgIcon(parent, name, kind, x, y, size, color) {
  const stroke = color || TOKENS.colors.activeBlue;
  const icons = {
    home: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 11.2 12 4l8.5 7.2M6 10.5V20h4.2v-5.2h3.6V20H18v-9.5"/></svg>`,
    book: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 5.5h6a3 3 0 0 1 3 3V20a3 3 0 0 0-3-3H5V5.5Zm9 3a3 3 0 0 1 3-3h2V17h-2a3 3 0 0 0-3 3"/></svg>`,
    theory: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 5.5h12M6 9.5h12M6 13.5h8M7 19l2.4-2.4 2.1 2.1L17 12"/></svg>`,
    tasks: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4.5h8l2 2V20H6V6.5l2-2Zm1.5 5h5M9.5 13h5M9.5 16.5h3"/></svg>`,
    flask: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3.8h6M10 4v5l-4.7 8.2A2 2 0 0 0 7 20h10a2 2 0 0 0 1.7-2.8L14 9V4M8 16h8"/></svg>`,
    molecule: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M7 8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm10 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM17 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM9 7l6 8.5M15.2 7.2 9.2 12M8.8 13.4 14.7 17"/></svg>`,
    database: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 7c0-1.7 3.1-3 7-3s7 1.3 7 3-3.1 3-7 3-7-1.3-7-3Zm0 0v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/></svg>`,
    cap: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.8 20 8l-8 4.2L4 8l8-4.2Zm-5 7V15c0 2 2.2 3.5 5 3.5s5-1.5 5-3.5v-4"/></svg>`,
    chart: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13h3l2-5 3.5 9 2.3-4H20M6 20h12M6 4h12"/></svg>`,
    bot: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M8 8.5h8a3 3 0 0 1 3 3V15a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-3.5a3 3 0 0 1 3-3ZM9 6V3.8M15 6V3.8M9.2 13h.1M14.7 13h.1M10 16h4"/></svg>`,
    bars: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19V9M10 19V5M15 19v-7M20 19V7"/></svg>`,
    message: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 6.5h14v9H9l-4 3v-12Z"/></svg>`,
    gear: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Zm0-4v2M12 17.5v2M5.5 6.5 7 8M17 16l1.5 1.5M4 12h2M18 12h2M5.5 17.5 7 16M17 8l1.5-1.5"/></svg>`,
    periodic: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 5h14v14H5V5Zm4 10h6M9 9h6M8 5v14M16 5v14"/></svg>`,
    wave: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15c2.2-7 4.2-7 6 0s3.8 7 6 0 3.2-5 4-3M4 20h16"/></svg>`,
    microscope: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M10 4h5l-1 4h-5l1-4Zm1 4 5 6M7 20h12M9 17h6M7.5 14.5a4.5 4.5 0 0 0 6 2"/></svg>`,
    search: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m16.5 16.5 3.5 3.5M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z"/></svg>`,
    bell: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 16.5h11M8 16V10a4 4 0 0 1 8 0v6M10 19a2 2 0 0 0 4 0"/></svg>`,
    calendar: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4v3M17 4v3M5 8h14M6 6h12v13H6V6Zm3 6h2M13 12h2M9 16h2"/></svg>`
  };
  const node = figma.createNodeFromSvg(icons[kind] || icons.book);
  node.name = `ICON_${name}`;
  node.x = x;
  node.y = y;
  node.resize(size, size);
  parent.appendChild(node);
  return node;
}

async function loadFonts() {
  const styles = ["Regular", "Medium", "Semi Bold", "Bold"];
  for (const style of styles) {
    try {
      await figma.loadFontAsync({ family: TOKENS.font.family, style });
    } catch (error) {
      await figma.loadFontAsync({ family: TOKENS.font.family, style: "Regular" });
    }
  }
}

function uniqueGeneratedName(parent) {
  const names = new Set(parent.children.map((child) => child.name));
  if (!names.has(GENERATED_FRAME_BASE_NAME)) return GENERATED_FRAME_BASE_NAME;
  let index = 2;
  while (names.has(`${GENERATED_FRAME_BASE_NAME}_${index}`)) index += 1;
  return `${GENERATED_FRAME_BASE_NAME}_${index}`;
}

async function makeButton(parent, name, label, x, y, w, h) {
  rect(parent, `${name}_shape`, x, y, w, h, TOKENS.colors.button, TOKENS.radius.button, null, effectShadow(TOKENS.shadows.button));
  await text(parent, `${name}_label`, label, x + 18, y + 11, w - 36, h - 12, 13, "Semi Bold", "#FFFFFF", "CENTER");
}

async function makePill(parent, name, label, x, y, w, color) {
  rect(parent, `${name}_pill`, x, y, w, 22, "#EAF3FF", TOKENS.radius.pill, null);
  await text(parent, `${name}_text`, label, x, y + 4, w, 14, 11, "Semi Bold", color || TOKENS.colors.activeBlue, "CENTER");
}

async function makeImageSlot(parent, name, x, y, w, h, label) {
  rect(parent, name, x, y, w, h, "#EEF6FF", 10, "#C7DAF5");
  line(parent, `${name}_diagonal_1`, x + 8, y + 8, x + w - 8, y + h - 8, "#A8C4EA", 1);
  line(parent, `${name}_diagonal_2`, x + w - 8, y + 8, x + 8, y + h - 8, "#A8C4EA", 1);
  await text(parent, `${name}_label`, label, x + 10, y + h / 2 - 9, w - 20, 18, 10, "Semi Bold", "#4B6C99", "CENTER");
}

function makeCardFrame(parent, zoneKey, override) {
  const zone = ZONES[zoneKey];
  const x = override && override.x !== undefined ? override.x : zone.x;
  const y = override && override.y !== undefined ? override.y : zone.y;
  const w = override && override.w !== undefined ? override.w : zone.w;
  const h = override && override.h !== undefined ? override.h : zone.h;
  const group = frame(parent, zone.name, x, y, w, h);
  rect(group, `${zone.name}_background`, 0, 0, w, h, TOKENS.colors.card, TOKENS.radius.card, TOKENS.colors.border, effectShadow(TOKENS.shadows.card));
  return group;
}

function makeLogoMark(parent) {
  const svg = `<svg width="44" height="44" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M24 7 7.8 39.5h10.6L24 28.4l5.6 11.1h10.6L24 7Z" stroke="#20D7FF" stroke-width="5.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 7v12.7" stroke="#7C5CFF" stroke-width="3.2" stroke-linecap="round"/><circle cx="24" cy="24.5" r="3.2" fill="#6CF5FF"/></svg>`;
  const node = figma.createNodeFromSvg(svg);
  node.name = "LogoMark_editable_vector_approximation";
  node.x = 18;
  node.y = 20;
  node.resize(42, 42);
  parent.appendChild(node);
}

async function buildSidebar(root) {
  const zone = ZONES.sidebar;
  const group = frame(root, zone.name, zone.x, zone.y, zone.w, zone.h);
  rect(group, "Sidebar_deep_blue_background", 0, 0, zone.w, zone.h, TOKENS.colors.sidebarBottom, 0, null, effectShadow(TOKENS.shadows.sidebar));
  rect(group, "Sidebar_cyan_glow_hint", 16, 640, 204, 165, TOKENS.colors.activeBlue, 18, null).opacity = 0.12;
  makeLogoMark(group);
  await text(group, "LogoText_Алхимик", "Алхимик", 70, 28, 140, 24, 23, "Bold", "#FFFFFF");
  await text(group, "LogoSubtitle_STEM_platform", "STEM-платформа", 72, 56, 130, 14, 10, "Regular", TOKENS.colors.cyan);

  let y = 98;
  for (const [index, item] of NAV_ITEMS.entries()) {
    const isActive = index === 0;
    const row = frame(group, `NAV_ROW_${item[0]}`, 16, y, 204, 38);
    if (isActive) rect(row, "Active_row_background", 0, 0, 204, 38, TOKENS.colors.activeBlue, TOKENS.radius.row, null);
    svgIcon(row, item[0], item[1], 8, 8, 22, isActive ? "#FFFFFF" : "#D8ECFF");
    await text(row, `NAV_LABEL_${item[0]}`, item[0], 48, 10, 128, 18, 14, "Semi Bold", isActive ? "#FFFFFF" : TOKENS.colors.sidebarText);
    if (item[0] === "Сообщения") {
      ellipse(row, "Messages_badge_shape", 174, 9, 20, 20, TOKENS.colors.activeBlue, null);
      await text(row, "Messages_badge_text", "3", 174, 12, 20, 14, 10, "Bold", "#FFFFFF", "CENTER");
    }
    y += 41;
  }

  const license = frame(group, "SidebarLicenseCard", 16, 646, 204, 166);
  rect(license, "LicenseCard_background", 0, 0, 204, 166, "#173B85", 13, "#3C70C2");
  await text(license, "License_title", "Расширенная\nлицензия", 16, 16, 120, 42, 13, "Bold", "#FFFFFF");
  await text(license, "License_copy", "Открой все\nвозможности\nплатформы", 16, 70, 116, 54, 12, "Regular", "#D7E8FF");
  rect(license, "License_illustration_placeholder_glow", 122, 84, 58, 58, "#2558C8", 18, "#4FE6FF");
  svgIcon(license, "license_molecule", "molecule", 135, 97, 34, TOKENS.colors.cyan);
  rect(license, "License_button_shape", 16, 128, 92, 30, "#234A9C", 8, "#6BA6FF");
  await text(license, "License_button_text", "Подробнее", 16, 136, 92, 14, 11, "Semi Bold", "#FFFFFF", "CENTER");

  const collapse = frame(group, "CollapseButton", 16, 886, 204, 38);
  rect(collapse, "CollapseButton_shape", 0, 0, 204, 38, "#123067", 10, "#315B99");
  await text(collapse, "CollapseButton_text", "‹  Свернуть меню      «", 0, 11, 204, 18, 12, "Regular", "#FFFFFF", "CENTER");
}

async function buildTopbar(root) {
  const zone = ZONES.topbar;
  const group = frame(root, zone.name, zone.x, zone.y, zone.w, zone.h);
  rect(group, "Topbar_soft_background", 0, 0, zone.w, zone.h, "#F8FBFF", 0, null).opacity = 0.72;
  const search = frame(group, "SearchField", 510, 28, 590, 40);
  rect(search, "SearchField_shape", 0, 0, 590, 40, "#FFFFFF", TOKENS.radius.search, TOKENS.colors.border);
  svgIcon(search, "search", "search", 16, 10, 18, "#7B8DAD");
  await text(search, "SearchField_placeholder", "Поиск по темам, заданиям, курсам...", 48, 12, 360, 16, 12, "Regular", TOKENS.colors.muted);
  await text(search, "SearchField_shortcut", "/", 558, 11, 18, 16, 12, "Semi Bold", "#536A92", "CENTER");

  const bell = frame(group, "NotificationControl", 1164, 24, 40, 40);
  rect(bell, "Notification_shape", 0, 0, 40, 40, "#FFFFFF", 12, TOKENS.colors.border);
  svgIcon(bell, "notification", "bell", 10, 10, 20, "#31578B");
  ellipse(bell, "Notification_badge", 25, -6, 18, 18, TOKENS.colors.activeBlue, null);
  await text(bell, "Notification_badge_text", "6", 25, -3, 18, 12, 10, "Bold", "#FFFFFF", "CENTER");

  const calendar = frame(group, "CalendarControl", 1218, 24, 40, 40);
  rect(calendar, "Calendar_shape", 0, 0, 40, 40, "#FFFFFF", 12, TOKENS.colors.border);
  svgIcon(calendar, "calendar", "calendar", 10, 10, 20, "#31578B");

  const profile = frame(group, "ProfileControl", 1270, 20, 122, 48);
  rect(profile, "Profile_shape", 0, 0, 122, 48, "#FFFFFF", 13, TOKENS.colors.border);
  ellipse(profile, "Avatar_placeholder", 8, 7, 34, 34, "#FFD5C2", "#7BB7FF", 1);
  await text(profile, "Avatar_initial", "А", 8, 15, 34, 15, 13, "Bold", TOKENS.colors.ink, "CENTER");
  await text(profile, "Profile_name", "Алина", 50, 8, 50, 15, 12, "Bold", TOKENS.colors.ink);
  await text(profile, "Profile_grade", "9 класс", 50, 25, 50, 12, 10, "Regular", TOKENS.colors.muted);
}

async function buildGreeting(root) {
  const group = frame(root, ZONES.greeting.name, ZONES.greeting.x, ZONES.greeting.y, ZONES.greeting.w, ZONES.greeting.h);
  await text(group, "Greeting_title", "Здравствуйте, Алина! 👋", 0, 0, 350, 32, 25, "Bold", TOKENS.colors.ink);
  await text(group, "Greeting_subtitle", "Продолжим обучение с того места, где ты остановилась.", 0, 34, 350, 18, 12, "Semi Bold", TOKENS.colors.muted);
}

async function buildContinueCard(root, override) {
  const card = makeCardFrame(root, "continue", override);
  await text(card, "Continue_eyebrow", "Продолжить обучение", 24, 28, 180, 18, 13, "Bold", TOKENS.colors.inkSoft);
  await makePill(card, "Continue_subject", "Химия", 210, 24, 58, TOKENS.colors.activeBlue);
  await text(card, "Continue_title", "Химические реакции.\nТипы и признаки", 24, 66, 260, 56, 20, "Bold", TOKENS.colors.ink);
  await text(card, "Continue_progress_number", "68%", 24, 143, 54, 28, 20, "Bold", TOKENS.colors.ink);
  rect(card, "Continue_progress_track", 78, 154, 190, 7, "#DBE7FB", TOKENS.radius.pill);
  rect(card, "Continue_progress_value", 78, 154, 129, 7, TOKENS.colors.violet, TOKENS.radius.pill);
  await text(card, "Continue_progress_label", "Прогресс темы", 286, 150, 100, 16, 11, "Semi Bold", TOKENS.colors.muted);
  await makeButton(card, "Continue_button", "Продолжить →", 24, 195, 142, 40);
  await makeImageSlot(card, "IMAGE_SLOT_chemistry_hero", 300, 24, 238, 212, "IMAGE_SLOT_chemistry_hero");
}

async function buildLiveCard(root, override) {
  const card = makeCardFrame(root, "live", override);
  await text(card, "Live_eyebrow", "Ближайший live-урок", 22, 28, 170, 34, 13, "Bold", TOKENS.colors.inkSoft);
  await makePill(card, "Live_subject", "Физика", 190, 24, 62, TOKENS.colors.activeBlue);
  await text(card, "Live_title", "Законы Ньютона.\nПрименение в задачах", 22, 74, 235, 58, 20, "Bold", TOKENS.colors.ink);
  svgIcon(card, "live_calendar", "calendar", 22, 145, 16, "#31578B");
  await text(card, "Live_time", "Сегодня, 16:00 – 17:00", 44, 146, 180, 16, 12, "Regular", TOKENS.colors.inkSoft);
  svgIcon(card, "live_teacher", "message", 22, 171, 16, "#31578B");
  await text(card, "Live_teacher_text", "Преподаватель: Игорь Петрович", 44, 172, 190, 32, 12, "Regular", TOKENS.colors.muted);
  await makeButton(card, "Live_button", "Присоединиться", 22, 205, 142, 40);
  await makeImageSlot(card, "IMAGE_SLOT_live_lesson_newton", 268, 24, 178, 212, "IMAGE_SLOT_live_lesson_newton");
}

async function buildAIRecommendations(root, override) {
  const card = makeCardFrame(root, "aiRecs", override);
  await text(card, "AIRecs_title", "AI-рекомендации", 18, 24, 180, 22, 17, "Bold", TOKENS.colors.ink);
  const rows = [
    ["Повтори тему «Валентность»", "Химия", "bot"],
    ["Реши 3 задачи по кинематике", "Физика", "chart"],
    ["Посмотри опыт «Реакция Zn + HCl»", "Химия", "flask"],
    ["Пройди диагностику по биологии", "Биология", "theory"]
  ];
  let y = 62;
  for (const row of rows) {
    ellipse(card, `AIRecs_icon_bg_${row[0]}`, 18, y, 32, 32, "#EDF5FF", null);
    svgIcon(card, `AIRecs_icon_${row[0]}`, row[2], 25, y + 7, 18, TOKENS.colors.activeBlue);
    await text(card, `AIRecs_text_${row[0]}`, row[0], 62, y + 1, 205, 28, 11, "Semi Bold", TOKENS.colors.inkSoft);
    await text(card, `AIRecs_meta_${row[0]}`, row[1], 62, y + 28, 160, 14, 10, "Regular", TOKENS.colors.muted);
    y += 42;
  }
  await text(card, "AIRecs_link", "Все рекомендации →", 18, 226, 150, 18, 12, "Semi Bold", TOKENS.colors.activeBlue);
}

async function buildFirstRowCards(root) {
  const group = frame(root, "FirstRowCards", 268, 92, 1368, 260);
  await buildContinueCard(group, { x: 0, y: 0, w: 560, h: 260 });
  await buildLiveCard(group, { x: 576, y: 0, w: 468, h: 260 });
  await buildAIRecommendations(group, { x: 1062, y: 0, w: 306, h: 260 });
}

async function buildQuickAccess(root) {
  const card = makeCardFrame(root, "quick");
  await text(card, "Quick_title", "Быстрый доступ", 14, 14, 180, 20, 16, "Bold", TOKENS.colors.ink);
  let x = 16;
  for (let index = 0; index < QUICK_ITEMS.length; index += 1) {
    const [label, icon] = QUICK_ITEMS[index];
    const w = index === QUICK_ITEMS.length - 1 ? 148 : 122;
    const tile = frame(card, `QuickAccessTile_${label}`, x, 42, w, 54);
    rect(tile, "Tile_shape", 0, 0, w, 54, "#FFFFFF", 10, TOKENS.colors.border);
    svgIcon(tile, label, icon, w / 2 - 11, 9, 22, TOKENS.colors.activeBlue);
    await text(tile, `Tile_label_${label}`, label, 4, 35, w - 8, 14, 11, "Semi Bold", TOKENS.colors.inkSoft, "CENTER");
    if (label === "Задания") {
      ellipse(tile, "Tasks_badge", w - 22, 4, 18, 18, TOKENS.colors.violet, null);
      await text(tile, "Tasks_badge_text", "12", w - 22, 7, 18, 10, 9, "Bold", "#FFFFFF", "CENTER");
    }
    x += w + 16;
  }
}

async function buildAssignments(root) {
  const card = makeCardFrame(root, "assignments");
  await text(card, "Assignments_title", "Задания от учителя", 18, 22, 190, 22, 17, "Bold", TOKENS.colors.ink);
  await text(card, "Assignments_link", "Все задания →", 310, 24, 100, 16, 12, "Semi Bold", TOKENS.colors.activeBlue, "RIGHT");
  const rows = [
    ["Уравнения реакций", "Химия · Срок: завтра, 23:59", "Не выполнено", TOKENS.colors.danger],
    ["Кинематика. Задачи 1–3", "Физика · Срок: 25 июл., 20:00", "В процессе", TOKENS.colors.warning],
    ["Клеточное деление", "Биология · Срок: 27 июл., 18:00", "Выполнено", TOKENS.colors.green]
  ];
  let y = 62;
  for (const row of rows) {
    ellipse(card, `Assignment_icon_bg_${row[0]}`, 18, y, 30, 30, "#EDF5FF", null);
    svgIcon(card, `Assignment_icon_${row[0]}`, "flask", 25, y + 7, 16, TOKENS.colors.activeBlue);
    await text(card, `Assignment_title_${row[0]}`, row[0], 60, y, 185, 16, 12, "Semi Bold", TOKENS.colors.inkSoft);
    await text(card, `Assignment_meta_${row[0]}`, row[1], 60, y + 17, 190, 14, 10, "Regular", TOKENS.colors.muted);
    rect(card, `Assignment_status_shape_${row[0]}`, 304, y + 4, 104, 22, row[3], TOKENS.radius.pill, null).opacity = 0.13;
    await text(card, `Assignment_status_text_${row[0]}`, row[2], 304, y + 8, 104, 12, 10, "Semi Bold", row[3], "CENTER");
    y += 45;
  }
}

async function buildProgress(root) {
  const card = makeCardFrame(root, "progress");
  await text(card, "Progress_title", "Мой прогресс", 18, 22, 150, 22, 17, "Bold", TOKENS.colors.ink);
  await text(card, "Progress_link", "Подробнее →", 318, 24, 95, 16, 12, "Semi Bold", TOKENS.colors.activeBlue, "RIGHT");
  const rings = [
    ["Химия", "72%", "84/116 тем", TOKENS.colors.cyan],
    ["Физика", "61%", "67/110 тем", "#5874FF"],
    ["Биология", "58%", "53/92 тем", TOKENS.colors.green]
  ];
  let x = 52;
  for (const ring of rings) {
    ellipse(card, `VECTOR_PLACEHOLDER_progress_ring_${ring[0]}_track`, x, 70, 76, 76, null, "#DCE8FA", 8);
    ellipse(card, `VECTOR_PLACEHOLDER_progress_ring_${ring[0]}_value`, x, 70, 76, 76, null, ring[3], 8);
    await text(card, `Progress_value_${ring[0]}`, ring[1], x, 94, 76, 24, 21, "Bold", TOKENS.colors.ink, "CENTER");
    await text(card, `Progress_label_${ring[0]}`, ring[0], x, 152, 76, 15, 12, "Bold", TOKENS.colors.ink, "CENTER");
    await text(card, `Progress_meta_${ring[0]}`, ring[2], x, 171, 76, 14, 10, "Regular", TOKENS.colors.muted, "CENTER");
    x += 130;
  }
}

async function buildWeakTopics(root) {
  const card = makeCardFrame(root, "weak");
  await text(card, "Weak_title", "Слабые темы", 18, 22, 150, 22, 17, "Bold", TOKENS.colors.ink);
  await text(card, "Weak_helper", "Как это определяется?", 318, 24, 140, 16, 12, "Semi Bold", TOKENS.colors.activeBlue, "RIGHT");
  const rows = [["Валентность", "Химия"], ["Кинематика", "Физика"], ["Клеточное деление", "Биология"], ["Строение атома", "Химия"]];
  let y = 62;
  for (const row of rows) {
    ellipse(card, `Weak_icon_bg_${row[0]}`, 18, y, 30, 30, "#EDF5FF", null);
    svgIcon(card, `Weak_icon_${row[0]}`, row[1] === "Физика" ? "chart" : row[1] === "Биология" ? "theory" : "flask", 25, y + 7, 16, TOKENS.colors.activeBlue);
    await text(card, `Weak_title_${row[0]}`, row[0], 60, y, 160, 16, 12, "Semi Bold", TOKENS.colors.inkSoft);
    await text(card, `Weak_meta_${row[0]}`, row[1], 60, y + 17, 130, 14, 10, "Regular", TOKENS.colors.muted);
    rect(card, `Weak_repeat_shape_${row[0]}`, 365, y + 2, 82, 28, "#F8FBFF", 8, TOKENS.colors.border);
    await text(card, `Weak_repeat_text_${row[0]}`, "Повторить", 365, y + 9, 82, 12, 10, "Semi Bold", TOKENS.colors.activeBlue, "CENTER");
    y += 38;
  }
}

async function buildPopular(root) {
  const card = makeCardFrame(root, "popular");
  await text(card, "Popular_title", "Популярные сейчас", 18, 22, 190, 22, 17, "Bold", TOKENS.colors.ink);
  await text(card, "Popular_link", "Смотреть все →", 298, 24, 112, 16, 12, "Semi Bold", TOKENS.colors.activeBlue, "RIGHT");
  const items = [
    ["IMAGE_SLOT_popular_chemistry", "Реакция нейтрализации", "Химия • Опыт"],
    ["IMAGE_SLOT_popular_physics", "Свободное падение", "Физика • Симуляция"],
    ["IMAGE_SLOT_popular_biology", "Строение растительной\nклетки", "Биология • 3D-модель"]
  ];
  let x = 18;
  for (const item of items) {
    await makeImageSlot(card, item[0], x, 60, 126, 70, item[0]);
    await text(card, `${item[0]}_title`, item[1], x, 136, 126, 34, 11, "Semi Bold", TOKENS.colors.inkSoft);
    await text(card, `${item[0]}_meta`, item[2], x, 168, 126, 14, 10, "Regular", TOKENS.colors.muted);
    x += 136;
  }
}

async function buildWeekly(root) {
  const card = makeCardFrame(root, "weekly");
  await text(card, "Weekly_title", "Твой прогресс за неделю", 18, 22, 210, 22, 17, "Bold", TOKENS.colors.ink);
  await text(card, "Weekly_delta", "+12%", 18, 63, 110, 36, 30, "Bold", "#1D9BFF");
  await text(card, "Weekly_subtitle", "к прошлой неделе", 18, 100, 130, 16, 11, "Regular", TOKENS.colors.muted);
  const points = [[170, 138], [205, 128], [242, 128], [278, 112], [316, 118], [354, 88], [402, 82]];
  for (let i = 0; i < points.length - 1; i += 1) {
    line(card, `VECTOR_PLACEHOLDER_weekly_chart_line_${i + 1}`, points[i][0], points[i][1], points[i + 1][0], points[i + 1][1], TOKENS.colors.activeBlue, 3);
  }
  for (let i = 0; i < points.length; i += 1) {
    ellipse(card, `Weekly_chart_point_${i + 1}`, points[i][0] - 3, points[i][1] - 3, 6, 6, TOKENS.colors.activeBlue, null);
  }
  const days = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  for (let i = 0; i < days.length; i += 1) await text(card, `Weekly_day_${days[i]}`, days[i], 162 + i * 40, 162, 22, 12, 10, "Regular", TOKENS.colors.muted, "CENTER");
}

async function buildLocked(root) {
  const card = makeCardFrame(root, "locked");
  ellipse(card, "Locked_badge_shape", 18, 20, 30, 30, "#FFF5DD", null);
  await text(card, "Locked_badge_icon", "🔒", 18, 25, 30, 16, 13, "Regular", TOKENS.colors.warning, "CENTER");
  await text(card, "Locked_eyebrow", "Заблокировано в базовой лицензии", 18, 62, 220, 18, 13, "Bold", TOKENS.colors.ink);
  await text(card, "Locked_title", "3D-анатомия человека", 18, 91, 210, 22, 17, "Bold", TOKENS.colors.ink);
  await text(card, "Locked_subtitle", "Доступно в расширенной лицензии", 18, 119, 210, 16, 12, "Regular", TOKENS.colors.muted);
  rect(card, "Locked_button_shape", 18, 151, 118, 30, "#F8FBFF", 8, TOKENS.colors.border);
  await text(card, "Locked_button_text", "Узнать больше", 18, 159, 118, 13, 11, "Semi Bold", TOKENS.colors.activeBlue, "CENTER");
  await makeImageSlot(card, "IMAGE_SLOT_locked_anatomy", 292, 20, 130, 160, "IMAGE_SLOT_locked_anatomy");
}

async function buildAssistant(root) {
  const group = frame(root, ZONES.assistant.name, ZONES.assistant.x, ZONES.assistant.y, ZONES.assistant.w, ZONES.assistant.h);
  rect(group, "AssistantBubble_shape", 10, 34, 118, 76, TOKENS.colors.activeBlue, 14, null, effectShadow(TOKENS.shadows.button));
  await text(group, "AssistantBubble_text", "Я рядом,\nесли нужна\nподсказка", 22, 48, 94, 48, 13, "Semi Bold", "#FFFFFF");
  ellipse(group, "AssistantCloseButton_shape", 236, 0, 28, 28, "#FFFFFF", TOKENS.colors.border, 1);
  await text(group, "AssistantCloseButton_text", "×", 236, 4, 28, 18, 18, "Regular", TOKENS.colors.inkSoft, "CENTER");
  await makeImageSlot(group, "IMAGE_SLOT_ai_robot", 142, 70, 106, 102, "IMAGE_SLOT_ai_robot");
}

async function buildNotes(selectedFrame) {
  const parent = selectedFrame.parent || figma.currentPage;
  const group = frame(parent, NOTES_FRAME_NAME, selectedFrame.x + 1710, selectedFrame.y, 520, 360);
  rect(group, "Notes_background", 0, 0, 520, 360, "#FFFDF2", 10, "#E8D994");
  await text(
    group,
    "Notes_text",
    "Generated by Allchemist Figma layer generator.\nAligned to APPROVED_WEB_STUDENT_DASHBOARD_TRACING_BASE.\nReference image remains locked and is not part of final UI.\nImage slots need clean assets later. Text/buttons/cards are editable.",
    16,
    14,
    488,
    170,
    13,
    "Regular",
    "#4F4210"
  );
  await text(
    group,
    "Troubleshooting_text",
    "Troubleshooting:\n- Generated dashboard layers must stay inside 1672x941.\n- If an old generated frame is 1672x1081, delete it and rerun this fixed plugin.\n- Keep the approved reference image locked.",
    16,
    205,
    488,
    120,
    12,
    "Regular",
    "#4F4210"
  );
  return group;
}

function removePreviousGeneratedLayers(selectedFrame) {
  for (const child of [...selectedFrame.children]) {
    if (child.name === GENERATED_FRAME_BASE_NAME) child.remove();
  }
}

function findReferenceLayer(selectedFrame) {
  return selectedFrame.findOne((node) => node.name === REFERENCE_LAYER_NAME);
}

function isOutsideSelectedFrame(notesFrame, selectedFrame) {
  const notesLeft = notesFrame.x;
  const notesTop = notesFrame.y;
  const notesRight = notesFrame.x + notesFrame.width;
  const notesBottom = notesFrame.y + notesFrame.height;
  const frameLeft = selectedFrame.x;
  const frameTop = selectedFrame.y;
  const frameRight = selectedFrame.x + selectedFrame.width;
  const frameBottom = selectedFrame.y + selectedFrame.height;
  return notesLeft >= frameRight || notesRight <= frameLeft || notesTop >= frameBottom || notesBottom <= frameTop;
}

function validateGeneration(selectedFrame, generatedFrame, notesFrame) {
  const reference = findReferenceLayer(selectedFrame);
  const checks = [
    Math.round(selectedFrame.width) === TOKENS.viewport.width,
    Math.round(selectedFrame.height) === TOKENS.viewport.height,
    Math.round(generatedFrame.width) === TOKENS.viewport.width,
    Math.round(generatedFrame.height) === TOKENS.viewport.height,
    Math.round(generatedFrame.x) === 0,
    Math.round(generatedFrame.y) === 0,
    isOutsideSelectedFrame(notesFrame, selectedFrame),
    Boolean(reference && reference.locked)
  ];
  return checks.every(Boolean);
}

async function main() {
  await loadFonts();
  const selection = figma.currentPage.selection;
  const selected = selection && selection[0];
  if (!selected || selected.type !== "FRAME" || selected.name !== TARGET_FRAME_NAME) {
    figma.notify(`Select frame "${TARGET_FRAME_NAME}" before running the plugin.`);
    figma.closePlugin();
    return;
  }

  if (Math.round(selected.width) !== TOKENS.viewport.width || Math.round(selected.height) !== TOKENS.viewport.height) {
    figma.notify(`Warning: tracing frame is ${Math.round(selected.width)}x${Math.round(selected.height)}. Expected 1672x941. Delete old generated layers and restore the tracing frame before approval.`);
  }
  selected.clipsContent = true;
  removePreviousGeneratedLayers(selected);

  const root = figma.createFrame();
  root.name = GENERATED_FRAME_BASE_NAME;
  root.x = 0;
  root.y = 0;
  root.resize(TOKENS.viewport.width, TOKENS.viewport.height);
  root.fills = [];
  root.clipsContent = true;
  selected.appendChild(root);

  await buildSidebar(root);
  await buildTopbar(root);
  await buildGreeting(root);
  await buildFirstRowCards(root);
  await buildQuickAccess(root);
  await buildAssignments(root);
  await buildProgress(root);
  await buildWeakTopics(root);
  await buildPopular(root);
  await buildWeekly(root);
  await buildLocked(root);
  await buildAssistant(root);
  const notes = await buildNotes(selected);

  figma.currentPage.selection = [root];
  figma.viewport.scrollAndZoomIntoView([root]);
  if (validateGeneration(selected, root, notes)) {
    figma.notify("Student Dashboard layers generated. Frame preserved: 1672x941.");
  } else {
    figma.notify("Generation completed with warnings. Check frame size/overflow.");
  }
  figma.closePlugin();
}

main().catch((error) => {
  figma.notify(`Layer generation failed: ${error && error.message ? error.message : error}`);
  figma.closePlugin();
});
