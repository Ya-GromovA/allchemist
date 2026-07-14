export type SubjectTheme = "chemistry" | "physics" | "biology";
export type RoleAccent = "student" | "teacher" | "parent" | "school-admin" | "system-admin" | "owner";

export const colors = {
  base: {
    ink: "#07142e",
    muted: "#5c6b86",
    canvas: "#f5f8ff",
    surface: "#ffffff",
    surfaceAlt: "#edf4ff",
    border: "#d9e4f5",
    navy: "#071b46",
    violet: "#6d5dfc",
    cyan: "#16d9f6",
    success: "#18b87a",
    warning: "#f4a62a",
    danger: "#e65353",
  },
  subjects: {
    chemistry: { accent: "#20d7ff", accent2: "#7c5cff", soft: "#e8fbff", deep: "#092456" },
    physics: { accent: "#3185ff", accent2: "#8d5cff", soft: "#ecf3ff", deep: "#101b58" },
    biology: { accent: "#23c483", accent2: "#22d3c5", soft: "#e9fbf3", deep: "#073f35" },
  },
  roles: {
    student: "#2f8cff",
    teacher: "#7c5cff",
    parent: "#20b486",
    "school-admin": "#0f7bdc",
    "system-admin": "#102657",
    owner: "#c28719",
  },
} as const;

export const semanticColors = {
  appBackground: "#f5f8ff",
  publicHeroBackground: "#0b3a8c",
  sidebarBackground: "#061a45",
  sidebarBackgroundAlt: "#0b2f78",
  sidebarActive: "#116dff",
  sidebarActiveGlow: "#16d9f6",
  surface: "#ffffff",
  surfaceMuted: "#f4f8ff",
  elevatedCard: "#fbfdff",
  text: "#07142e",
  textMuted: "#5c6b86",
  border: "#d9e4f5",
  chemistryAccent: "#20d7ff",
  chemistryAccentAlt: "#7c5cff",
  physicsAccent: "#3185ff",
  physicsAccentAlt: "#8d5cff",
  biologyAccent: "#23c483",
  biologyAccentAlt: "#22d3c5",
  aiAccent: "#1d9bff",
  aiAccentAlt: "#7c5cff",
  success: "#18b87a",
  warning: "#f4a62a",
  danger: "#e65353",
  verified: "#18b87a",
  unverified: "#f4a62a",
  locked: "#7b88a8",
} as const;

export const approvedCssVariables = {
  "--ac-ink": colors.base.ink,
  "--ac-muted": colors.base.muted,
  "--ac-canvas": colors.base.canvas,
  "--ac-surface": colors.base.surface,
  "--ac-border": colors.base.border,
  "--ac-navy": colors.base.navy,
  "--ac-violet": colors.base.violet,
  "--ac-cyan": colors.base.cyan,
  "--ac-success": colors.base.success,
  "--ac-warning": colors.base.warning,
  "--ac-danger": colors.base.danger,
  "--ac-sidebar-bg": semanticColors.sidebarBackground,
  "--ac-sidebar-active": semanticColors.sidebarActive,
  "--ac-ai": semanticColors.aiAccent,
  "--ac-ai-alt": semanticColors.aiAccentAlt,
} as const;

export const subjectTokens = {
  chemistry: {
    accent: colors.subjects.chemistry.accent,
    accentAlt: colors.subjects.chemistry.accent2,
    surface: colors.subjects.chemistry.soft,
    deep: colors.subjects.chemistry.deep,
    glow: "0 0 30px rgba(32, 215, 255, .28)",
  },
  physics: {
    accent: colors.subjects.physics.accent,
    accentAlt: colors.subjects.physics.accent2,
    surface: colors.subjects.physics.soft,
    deep: colors.subjects.physics.deep,
    glow: "0 0 30px rgba(49, 133, 255, .24)",
  },
  biology: {
    accent: colors.subjects.biology.accent,
    accentAlt: colors.subjects.biology.accent2,
    surface: colors.subjects.biology.soft,
    deep: colors.subjects.biology.deep,
    glow: "0 0 30px rgba(35, 196, 131, .24)",
  },
} as const;

export const roleTokens = {
  student: { accent: colors.roles.student, shell: "#eef6ff" },
  teacher: { accent: colors.roles.teacher, shell: "#f4f0ff" },
  parent: { accent: colors.roles.parent, shell: "#eefbf6" },
  "school-admin": { accent: colors.roles["school-admin"], shell: "#edf6ff" },
  "system-admin": { accent: colors.roles["system-admin"], shell: "#eef2fb" },
  owner: { accent: colors.roles.owner, shell: "#fff8e8" },
} as const;

export const designLock = {
  figmaFileKey: "OnwtlxHKp361n66TfjBOKL",
  figmaNodeId: "2:7",
  figmaPageName: "06_APPROVED_FOR_CODEX",
} as const;

export const typography = {
  fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  sizes: { xs: "0.75rem", sm: "0.875rem", md: "1rem", lg: "1.125rem", xl: "1.35rem", xxl: "2rem", hero: "3.15rem" },
  weights: { regular: 400, medium: 500, semibold: 650, bold: 760 },
} as const;

export const spacing = { 1: "0.25rem", 2: "0.5rem", 3: "0.75rem", 4: "1rem", 5: "1.25rem", 6: "1.5rem", 8: "2rem", 10: "2.5rem", 12: "3rem" } as const;
export const radii = { sm: "6px", md: "8px", lg: "12px", xl: "18px", pill: "999px" } as const;
export const shadows = { soft: "0 12px 36px rgba(20, 45, 90, .10)", panel: "0 16px 46px rgba(10, 24, 55, .13)", focus: "0 0 0 3px rgba(22, 217, 246, .28)" } as const;
export const glows = {
  cyan: "0 0 32px rgba(22, 217, 246, .26)",
  violet: "0 0 32px rgba(109, 93, 252, .22)",
  success: "0 0 24px rgba(24, 184, 122, .2)",
  warning: "0 0 24px rgba(244, 166, 42, .22)",
} as const;
export const durations = { fast: "120ms", normal: "180ms", slow: "280ms" } as const;
export const motion = {
  reduced: {
    transition: "none",
    animation: "none",
  },
  standard: {
    transition: `transform ${durations.normal} ease, box-shadow ${durations.normal} ease, background ${durations.normal} ease`,
    assistantPulse: "ac-assistant-pulse 1800ms ease-in-out infinite",
  },
} as const;
export const zIndex = { base: 0, sticky: 10, overlay: 40, modal: 80, toast: 100 } as const;
export const breakpoints = { mobile: "480px", tablet: "768px", desktop: "1024px", wide: "1320px" } as const;

export const webLayoutTokens = {
  sidebar: {
    width: "300px",
    backgroundTop: "#082f78",
    backgroundMid: "#06245e",
    backgroundBottom: "#031743",
    active: "#116dff",
    activeGlow: "#16d9f6",
  },
  topbar: {
    height: "78px",
    background: "rgba(249, 252, 255, .86)",
    border: "#d9e6f7",
  },
  mainBackground: {
    start: "#f6faff",
    end: "#edf6ff",
    pattern: "rgba(17, 109, 255, .12)",
  },
  content: {
    maxWidth: "none",
    gap: "1rem",
    paddingX: "1.55rem",
    paddingY: "1rem",
  },
  fixedZones: {
    sidebar: "left",
    topbar: "top",
    contentScroll: "content-area",
    notificationSlot: "topbar-right-before-user",
    userSlot: "topbar-right",
  },
} as const;
