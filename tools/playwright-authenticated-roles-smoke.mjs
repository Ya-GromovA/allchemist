import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const baseUrl = process.env.BASE_URL || "https://api.allchemist.ru";
const outDir = process.env.OUT_DIR || "/tmp/allchemist-auth-roles-smoke";
const password = process.env.TEST_PASSWORD || "AlchTest2070";

const forbiddenUi = [
  "Pro Monthly",
  "School Quarter",
  "Family Year",
  "Ученик / студент",
  "browser cache",
  "user web",
  "MVP baseline",
  "Live-демо",
  "Web live-урок",
  "Invalid access token",
  "QA gate",
  "publish gate",
  "workflow",
  "Показать технические детали",
];

const responsiveRoles = new Set(["student-school", "teacher-school", "parent-school"]);

const roles = [
  {
    name: "student-school",
    login: "alch_test_student_school",
    role: "student",
    mustInclude: ["Добро пожаловать", "Продолжить обучение", "Ваш прогресс"],
    mustNotInclude: ["Кабинет учителя", "Кабинет родителя", "Запустить онлайн-урок"],
  },
  {
    name: "teacher-school",
    login: "alch_test_teacher_school",
    role: "teacher",
    mustInclude: ["Кабинет учителя", "Мои классы"],
    mustNotInclude: ["Кабинет родителя"],
  },
  {
    name: "homeroom-school",
    login: "alch_test_homeroom_school",
    role: "homeroom_teacher",
    mustInclude: ["10 класс А", "Учебные риски"],
    mustNotInclude: ["Запустить онлайн-урок", "Кабинет родителя"],
  },
  {
    name: "parent-school",
    login: "alch_test_parent_school",
    role: "parent",
    mustInclude: ["Кабинет родителя", "Средний результат"],
    mustNotInclude: ["Запустить онлайн-урок", "Мои классы"],
  },
  {
    name: "student-personal",
    login: "alch_test_student_personal",
    role: "student",
    mustInclude: ["Добро пожаловать", "Продолжить обучение", "Ваш прогресс"],
    mustNotInclude: ["Подключиться", "Кабинет учителя", "Кабинет родителя"],
  },
  {
    name: "student-university",
    login: "alch_test_student_university",
    role: "student",
    mustInclude: ["Добро пожаловать", "Продолжить обучение", "Ваш прогресс"],
    mustNotInclude: ["Подключиться", "Мои классы"],
  },
  {
    name: "school-admin",
    login: "alch_test_school_admin",
    role: "school_admin",
    mustInclude: ["Управление школой", "Лицензий"],
    mustNotInclude: ["Кабинет родителя", "Запустить онлайн-урок"],
  },
  {
    name: "student-family",
    login: "alch_test_student_family",
    role: "student",
    mustInclude: ["Добро пожаловать", "Продолжить обучение", "Ваш прогресс"],
    mustNotInclude: ["Кабинет учителя", "Запустить онлайн-урок"],
  },
  {
    name: "parent-family",
    login: "alch_test_parent_family",
    role: "parent",
    mustInclude: ["Кабинет родителя", "Средний результат"],
    mustNotInclude: ["Запустить онлайн-урок", "Мои классы"],
  },
  {
    name: "student-free",
    login: "alch_test_student_free",
    role: "student",
    mustInclude: ["Добро пожаловать", "Продолжить обучение", "Ваш прогресс"],
    mustNotInclude: ["Кабинет учителя", "Кабинет родителя", "Запустить онлайн-урок"],
  },
  {
    name: "student-school-quarter",
    login: "alch_test_student_school_quarter",
    role: "student",
    mustInclude: ["Добро пожаловать", "Продолжить обучение", "Ваш прогресс"],
    mustNotInclude: ["Кабинет учителя", "Кабинет родителя"],
  },
  {
    name: "student-promo",
    login: "alch_test_student_promo",
    role: "student",
    mustInclude: ["Добро пожаловать", "Продолжить обучение", "Ваш прогресс"],
    mustNotInclude: ["Кабинет учителя", "Кабинет родителя", "Запустить онлайн-урок"],
  },
  {
    name: "student-trial",
    login: "alch_test_student_trial",
    role: "student",
    mustInclude: ["Добро пожаловать", "Продолжить обучение", "Ваш прогресс"],
    mustNotInclude: ["Кабинет учителя", "Кабинет родителя", "Запустить онлайн-урок"],
  },
  {
    name: "student-lifetime",
    login: "alch_test_student_lifetime",
    role: "student",
    mustInclude: ["Добро пожаловать", "Продолжить обучение", "Ваш прогресс"],
    mustNotInclude: ["Кабинет учителя", "Кабинет родителя", "Запустить онлайн-урок"],
  },
  {
    name: "student-manual",
    login: "alch_test_student_manual",
    role: "student",
    mustInclude: ["Добро пожаловать", "Продолжить обучение", "Ваш прогресс"],
    mustNotInclude: ["Кабинет учителя", "Кабинет родителя", "Запустить онлайн-урок"],
  },
  {
    name: "admin",
    login: "alch_test_admin",
    role: "admin",
    mustInclude: ["МБОУ Гимназия", "Лицензии"],
    mustNotInclude: ["Кабинет родителя", "Запустить онлайн-урок"],
  },
  {
    name: "owner",
    login: "alch_test_owner",
    role: "owner",
    mustInclude: ["МБОУ Гимназия", "Лицензии"],
    mustNotInclude: ["Кабинет родителя", "Запустить онлайн-урок"],
  },
  {
    name: "content-editor",
    login: "alch_test_content_editor",
    role: "content_editor",
    mustInclude: ["МБОУ Гимназия", "Лицензии"],
    mustNotInclude: ["Кабинет родителя", "Запустить онлайн-урок"],
  },
  {
    name: "support",
    login: "alch_test_support",
    role: "support",
    mustInclude: ["МБОУ Гимназия", "Лицензии"],
    mustNotInclude: ["Кабинет родителя", "Запустить онлайн-урок"],
  },
];

function rolePath(role) {
  return {
    student: "/student",
    learner: "/student",
    teacher: "/teacher",
    parent: "/parent",
    homeroom_teacher: "/homeroom",
    school_admin: "/school-admin",
    admin: "/admin",
    owner: "/admin",
    content_editor: "/content",
    support: "/support",
  }[role] || "/login";
}

async function apiLogin(request, user) {
  const response = await request.post(`${baseUrl}/api/v1/auth/login`, {
    data: { login: user.login, password },
  });
  if (!response.ok()) {
    throw new Error(`${user.name}: login failed ${response.status()} ${await response.text()}`);
  }
  return await response.json();
}

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

async function checkUserViewport(user, profileName, contextOptions) {
  const context = await browser.newContext(contextOptions);
  const session = await apiLogin(context.request, user);
  await context.addInitScript((saved) => {
    localStorage.setItem("allchemist_web_session_v1", JSON.stringify(saved));
  }, {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    userId: session.userId,
    role: session.role,
    phone: "",
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/api/v1/web${rolePath(user.role)}`, { waitUntil: "networkidle", timeout: 30000 });
  await page.locator("body").waitFor({ state: "visible", timeout: 15000 });
  await page.screenshot({ path: `${outDir}/${user.name}-${profileName}.png`, fullPage: true });
  const bodyText = await page.locator("body").innerText({ timeout: 5000 });
  if (!bodyText.includes("Алхимик")) throw new Error(`${user.name}/${profileName}: dashboard marker is not visible`);
  if (bodyText.includes("Вход в платформу")) throw new Error(`${user.name}/${profileName}: protected route redirected to login despite valid session`);
  for (const expected of user.mustInclude) {
    if (!bodyText.includes(expected)) throw new Error(`${user.name}: missing expected text: ${expected}`);
  }
  for (const forbidden of [...forbiddenUi, ...user.mustNotInclude]) {
    if (bodyText.includes(forbidden)) throw new Error(`${user.name}: forbidden text visible: ${forbidden}`);
  }
  await context.close();
}

for (const user of roles) {
  await checkUserViewport(user, "desktop", { viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  if (responsiveRoles.has(user.name)) {
    await checkUserViewport(user, "mobile", { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  }
}

await browser.close();
console.log(`Authenticated role smoke screenshots saved to ${outDir}`);
