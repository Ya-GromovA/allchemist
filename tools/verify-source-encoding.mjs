/**
 * Проверка кодировки исходников фронтенда и инструментов.
 *
 * Зачем: семь файлов уже были сохранены в однобайтовой кодировке, и весь
 * русский текст в них превратился в знаки вопроса. Из git это не
 * восстанавливалось, потому что порча попала уже в базовый коммит. Проверка
 * падает раньше, чем такой файл попадёт в сборку.
 *
 * Что считается порчей:
 *   1) файл не декодируется как UTF-8;
 *   2) файл начинается с BOM (требование: UTF-8 без BOM);
 *   3) в файле есть U+FFFD — след неудачной перекодировки;
 *   4) в файле есть цепочка из 4+ знаков вопроса подряд — след сохранения
 *      кириллицы в ASCII: каждая буква даёт два знака вопроса;
 *   5) в файле есть мозаика UTF-8, прочитанного как cp1251/latin-1.
 *
 * Отдельно проверяется манифест: файлы, которые уже были испорчены, обязаны
 * содержать конкретные русские фразы. Это ловит случай, когда файл переписали
 * английским текстом — знаков вопроса нет, но русский снова потерян.
 *
 * Запуск: node tools/verify-source-encoding.mjs
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Где ищем исходники. Зависимости и сборочные артефакты не трогаем. */
const SCAN_DIRS = ["apps", "packages", "tools", ".github"];

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".next",
  ".turbo",
  "dist",
  "build",
  "coverage",
  "__pycache__",
  ".git",
  ".venv",
  "venv",
  "snapshots",
]);

const SCAN_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".css", ".json", ".md", ".yml", ".yaml"]);

/**
 * Файлы, которые уже были испорчены. Каждый обязан содержать эти фразы —
 * иначе проверка падает, даже если формально файл в UTF-8.
 */
const REQUIRED_PHRASES = [
  ["apps/web/app/page.tsx", ["Алхимик", "Основная навигация", "STEM-платформа нового поколения", "Открыть платформу"]],
  ["apps/web/app/modules/page.tsx", ["Учебные модули", "Химия", "Физика", "Биология"]],
  ["apps/admin/app/admin-shell.tsx", ["Алхимик"]],
  ["apps/admin/app/adminMenuConfig.ts", ["Обзор", "Роли и доступы", "Лицензии и платежи", "Журнал действий", "Настройки"]],
  ["packages/api-client/tests/science.test.ts", ["Вода"]],
  ["packages/api-client/tests/scientific-guardrails.test.ts", ["синий", "Запах описывается только текстовой пометкой"]],
  ["packages/api-client/tests/auth.test.ts", ["Учащийся"]],
  ["packages/api-client/tests/content-qa.test.ts", ["Черновик", "Контент нельзя публиковать без источников."]],
  ["packages/api-client/tests/fixtures/auth.json", ["Учащийся"]],
  ["packages/api-client/tests/fixtures/content-qa.json", ["Черновик", "Content QA", "Публикация"]],
  ["packages/api-client/tests/fixtures/contracts/auth-login.json", ["Учащийся"]],
  ["packages/api-client/tests/fixtures/contracts/auth-me.json", ["Учащийся"]],
  ["packages/api-client/tests/fixtures/contracts/content-qa-queue.json", ["Черновики"]],
  ["packages/api-client/tests/fixtures/molecule.json", ["Вода"]],
  ["packages/api-client/tests/fixtures/reaction.json", ["Нейтрализация"]],
];

/**
 * Файл сам детектирует порчу кодировки, поэтому обязан содержать её образцы.
 * Такой файл помечает себя этим маркером и освобождается от проверок
 * содержимого — но не от требования быть корректным UTF-8 без BOM.
 */
const SELF_CHECK_MARKER = ["ENCODING", "GUARD", "SAMPLES", "ALLOWED"].join("-");

/** Собран из кода, иначе файл проверки нашёл бы порчу сам в себе. */
const REPLACEMENT_CHARACTER = String.fromCharCode(0xfffd);
const QUESTION_RUN_RE = /\?{4,}/;
/**
 * Кириллица в UTF-8, прочитанная как latin-1/cp1251, даёт пары
 * "Ð/Ñ/Ã + байт продолжения". Регулярка собрана из кодов,
 * чтобы файл проверки не срабатывал сам на себя.
 */
const MOJIBAKE_RE = new RegExp("[\\u00D0\\u00D1\\u00C3][\\u0080-\\u00BF]");

const decoder = new TextDecoder("utf-8", { fatal: true });
const failures = [];
let scanned = 0;
let cyrillicFiles = 0;
let selfCheckFiles = 0;

async function collect(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIR_NAMES.has(entry.name)) continue;
      files.push(...(await collect(join(dir, entry.name))));
      continue;
    }
    if (!entry.isFile()) continue;
    const dot = entry.name.lastIndexOf(".");
    if (dot < 0 || !SCAN_EXTS.has(entry.name.slice(dot))) continue;
    files.push(join(dir, entry.name));
  }
  return files;
}

function firstMatchingLine(lines, regex) {
  for (let i = 0; i < lines.length; i += 1) {
    if (regex.test(lines[i])) return { line: i + 1, text: lines[i].trim().slice(0, 120) };
  }
  return null;
}

for (const dirName of SCAN_DIRS) {
  const dir = join(ROOT, dirName);
  try {
    if (!(await stat(dir)).isDirectory()) continue;
  } catch {
    continue;
  }

  for (const path of await collect(dir)) {
    const rel = relative(ROOT, path).split(sep).join("/");
    const bytes = await readFile(path);
    scanned += 1;

    if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
      failures.push(`${rel}: файл сохранён с BOM, требуется UTF-8 без BOM`);
      continue;
    }

    let text;
    try {
      text = decoder.decode(bytes);
    } catch (error) {
      failures.push(`${rel}: файл не является корректным UTF-8 (${error.message})`);
      continue;
    }

    if (/[А-Яа-яЁё]/.test(text)) cyrillicFiles += 1;

    if (text.includes(SELF_CHECK_MARKER)) {
      selfCheckFiles += 1;
      continue;
    }

    if (text.includes(REPLACEMENT_CHARACTER)) {
      failures.push(`${rel}: найден символ U+FFFD — след неудачной перекодировки`);
    }

    const lines = text.split("\n");
    const broken = firstMatchingLine(lines, QUESTION_RUN_RE);
    if (broken) failures.push(`${rel}:${broken.line}: разрушенная кириллица, 4+ знака вопроса подряд: ${broken.text}`);

    const mojibake = firstMatchingLine(lines, MOJIBAKE_RE);
    if (mojibake) failures.push(`${rel}:${mojibake.line}: мозаика вместо кириллицы: ${mojibake.text}`);
  }
}

for (const [rel, phrases] of REQUIRED_PHRASES) {
  let text;
  try {
    text = decoder.decode(await readFile(join(ROOT, rel)));
  } catch (error) {
    failures.push(`${rel}: файл из манифеста не читается как UTF-8 (${error.message})`);
    continue;
  }
  const missing = phrases.filter((phrase) => !text.includes(phrase));
  if (missing.length) {
    failures.push(`${rel}: русский текст потерян, отсутствуют фразы ${JSON.stringify(missing)}`);
  }
}

console.log(`scanned files: ${scanned}`);
console.log(`files with cyrillic: ${cyrillicFiles}`);
console.log(`self-check files skipped: ${selfCheckFiles}`);
console.log(`manifest files: ${REQUIRED_PHRASES.length}`);

if (failures.length) {
  console.error(`\nSOURCE_ENCODING=FAIL (${failures.length})`);
  for (const line of failures) console.error(line);
  process.exit(1);
}

console.log("SOURCE_ENCODING=PASS");
