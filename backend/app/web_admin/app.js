const base = "/api/v1";
let token = localStorage.getItem("synapse_web_admin_token") || "";
let selectedUserId = null;
const pageSize = 50;
const securityStateKey = "synapse_web_admin_security_state";
const compactModeKey = "synapse_web_admin_compact_mode";
const securityAutorefreshKey = "synapse_web_admin_security_autorefresh";
const handoverStateKey = "synapse_web_admin_handover_state";
const DEFAULT_ROLES = ["student", "learner", "teacher", "homeroom_teacher", "parent", "content_editor", "support", "school_admin", "admin", "owner"];
const DEFAULT_SCOPES = [
  "content:read",
  "tasks:read",
  "tasks:submit",
  "progress:read",
  "progress:manage",
  "analytics:read",
  "payments:read",
  "payments:write",
  "admin:rights",
  "admin:users",
  "admin:subscriptions",
  "admin:audit",
  "admin:security",
  "admin:docs",
];
const state = {
  usersOffset: 0,
  auditOffset: 0,
  schoolInvites: [],
};
let roleLabelMap = {};
let scopeLabelMap = {};
let planLabelMap = {};
let moduleLabelMap = {};
let accessSourceLabelMap = {};
let schoolOptionMap = {};
const securityMobileState = {
  checks: "нет данных",
  alerts: "нет данных",
  dryRun: "нет данных",
  trend: "нет данных",
  range: "период не задан",
};
let actionStatusTimer = null;
let securityAutorefreshTimer = null;

const RIGHTS_SLOGANS = [
  'Сделано с ❤ для управления знаниями.',
  'Учитесь глубже. Думайте смелее. Действуйте точнее.',
  'Знания сегодня — возможности завтра.',
  'Технологии, которые помогают учиться каждый день.',
];

function textValue(value, fallback = "-") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function setActionStatus(message, kind = "info") {
  const box = document.getElementById("actionStatus");
  if (!box) return;
  const normalized = (kind || "info").toLowerCase();
  box.classList.remove("hidden", "ok", "error", "info");
  box.classList.add(normalized === "ok" ? "ok" : normalized === "error" ? "error" : "info");
  box.textContent = message || "Операция выполнена";
  if (actionStatusTimer) clearTimeout(actionStatusTimer);
  actionStatusTimer = setTimeout(() => {
    box.classList.add("hidden");
  }, 7000);
}

function setCompactMode(enabled) {
  const active = Boolean(enabled);
  document.body.classList.toggle("compact", active);
  localStorage.setItem(compactModeKey, active ? "1" : "0");
  const btn = document.getElementById("btnCompactMode");
  const stateLabel = document.getElementById("compactModeState");
  if (btn) btn.textContent = active ? "Выключить компактный режим" : "Включить компактный режим";
  if (stateLabel) stateLabel.textContent = active ? "Режим оператора: компактный" : "Режим оператора: стандартный";
}

function toggleCompactMode() {
  setCompactMode(!document.body.classList.contains("compact"));
}

function initCompactMode() {
  const saved = (localStorage.getItem(compactModeKey) || "0") === "1";
  setCompactMode(saved);
}

function openShortcutsModal() {
  const overlay = document.getElementById("shortcutsOverlay");
  if (!overlay) return;
  overlay.classList.remove("hidden");
}

function closeShortcutsModal() {
  const overlay = document.getElementById("shortcutsOverlay");
  if (!overlay) return;
  overlay.classList.add("hidden");
}

function openGuideModal() {
  const overlay = document.getElementById("guideOverlay");
  if (!overlay) return;
  overlay.classList.remove("hidden");
}

function closeGuideModal() {
  const overlay = document.getElementById("guideOverlay");
  if (!overlay) return;
  overlay.classList.add("hidden");
}

function openPrintableGuide() {
  window.open("/api/v1/admin/web/assets/admin-one-page-ru-v3.html?v=20260226j", "_blank", "noopener");
}

function initHandoverForm() {
  const time = document.getElementById("handoverTime");
  const outgoing = document.getElementById("handoverOutgoing");
  const incoming = document.getElementById("handoverIncoming");
  const incidents = document.getElementById("handoverIncidents");
  const comment = document.getElementById("handoverComment");
  if (!time || !outgoing || !incoming || !incidents || !comment) return;

  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(handoverStateKey) || "{}") || {};
  } catch {}

  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const defaultTime = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate()) + "T" + pad(now.getHours()) + ":" + pad(now.getMinutes());
  time.value = saved.time || defaultTime;
  outgoing.value = saved.outgoing || "";
  incoming.value = saved.incoming || "";
  incidents.value = saved.incidents || "";
  comment.value = saved.comment || "";
}

function getHandoverPayload() {
  return {
    time: (document.getElementById("handoverTime")?.value || "").trim(),
    outgoing: (document.getElementById("handoverOutgoing")?.value || "").trim(),
    incoming: (document.getElementById("handoverIncoming")?.value || "").trim(),
    incidents: (document.getElementById("handoverIncidents")?.value || "").trim(),
    comment: (document.getElementById("handoverComment")?.value || "").trim(),
  };
}

function saveHandover() {
  const payload = getHandoverPayload();
  if (!payload.outgoing || !payload.incoming) {
    setInlineStatus("handoverStatus", "Заполните сдающего и принимающего смену", "error");
    return;
  }
  localStorage.setItem(handoverStateKey, JSON.stringify(payload));
  setInlineStatus("handoverStatus", "Акт передачи смены сохранен", "ok");
  setActionStatus("Акт передачи смены сохранен", "ok");
}

async function archiveHandover(silent = false) {
  const payload = getHandoverPayload();
  if (!payload.outgoing || !payload.incoming) {
    if (!silent) setInlineStatus("handoverStatus", "Заполните сдающего и принимающего смену", "error");
    return false;
  }
  localStorage.setItem(handoverStateKey, JSON.stringify(payload));
  const r = await req("/admin/security/handover/archive", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (r.status !== 200) {
    if (!silent) setInlineStatus("handoverStatus", "Не удалось архивировать акт", "error");
    log(r);
    return false;
  }
  if (!silent) {
    setInlineStatus("handoverStatus", "Акт сохранен в серверный архив", "ok");
    setActionStatus("Акт передачи сохранен в архив", "ok");
  }
  return true;
}

async function exportHandover() {
  const payload = getHandoverPayload();
  if (!payload.outgoing || !payload.incoming) {
    setInlineStatus("handoverStatus", "Сначала заполните ФИО сдающего и принимающего", "error");
    return;
  }
  const text = [
    "Алхимик: акт передачи смены",
    "Время передачи: " + (payload.time || "не указано"),
    "Сдающий смену: " + payload.outgoing,
    "Принимающий смену: " + payload.incoming,
    "",
    "Инциденты за смену:",
    payload.incidents || "нет",
    "",
    "Комментарий следующей смене:",
    payload.comment || "нет",
  ].join("\n");
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "synapse-shift-handover.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  const archived = await archiveHandover(true);
  setInlineStatus("handoverStatus", archived ? "TXT акт скачан и акт архивирован" : "TXT акт передачи скачан", "ok");
}

async function exportHandoverArchiveCsv() {
  const r = await req("/admin/security/handover/archive.csv?limit=1000");
  if (r.status !== 200) {
    setInlineStatus("handoverStatus", "Не удалось скачать архив", "error");
    return log(r);
  }
  const csvText = typeof r.body === "string" ? r.body : "";
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "handover-archive.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  setInlineStatus("handoverStatus", "Архив актов передачи скачан", "ok");
}

function getCurrentView() {
  const active = document.querySelector(".viewBtn.active");
  if (!active) return "users";
  return active.getAttribute("data-view") || "users";
}

function focusCurrentViewSearch() {
  const view = getCurrentView();
  const map = {
    users: "usersQuery",
    subscriptions: "bulkQuery",
    rights: "scopeName",
    audit: "auditAction",
    security: "securityAlertCode",
    content: "btnContentQaSummary",
  };
  const id = map[view] || "usersQuery";
  const el = document.getElementById(id);
  if (!el) return;
  el.focus();
  if (typeof el.select === "function") el.select();
}

async function refreshSecuritySnapshot() {
  if (!token || getCurrentView() !== "security") return;
  await loadSecurity();
  await loadSecurityAlerts();
  await loadBackupDryRunStatus();
  await loadMobileReadiness();
  await loadContentIngestion();
  await loadGoNoGo();
  setInlineStatus("restoreActionStatus", "Автообновление выполнило обновление", "info");
}

async function runMorningCheck() {
  if (!token) {
    setInlineStatus("runbookActionStatus", "Сначала выполните вход", "error");
    return;
  }
  setInlineStatus("runbookActionStatus", "Утренний чек выполняется...", "info");
  await loadSecurity();
  await loadSecurityAlerts();
  await loadBackupDryRunStatus();
  await loadMobileReadiness();
  await loadContentIngestion();
  await loadGoNoGo();
  const checks = securityMobileState.checks || "нет данных";
  const alerts = securityMobileState.alerts || "нет данных";
  const dryRun = securityMobileState.dryRun || "нет данных";
  setInlineStatus("runbookActionStatus", "Утренний чек завершен: проверки " + checks + ", алерты " + alerts + ", восстановление " + dryRun, "ok");
}

async function runIncidentCheck() {
  if (!token) {
    setInlineStatus("runbookActionStatus", "Сначала выполните вход", "error");
    return;
  }
  setInlineStatus("runbookActionStatus", "Инцидент-проверка выполняется...", "info");
  await loadSecurityActions();
  await loadSecurity();
  await loadSecurityAlerts();
  await loadBackupDryRunHistory();
  await loadBackupDryRunStatus();
  await loadMobileReadiness();
  await loadContentIngestion();
  await loadGoNoGo();
  setInlineStatus("runbookActionStatus", "Инцидент-проверка завершена. Проверьте алерты и практические действия.", "ok");
}

function setSecurityAutorefresh(enabled) {
  const active = Boolean(enabled);
  localStorage.setItem(securityAutorefreshKey, active ? "1" : "0");
  const btn = document.getElementById("btnSecurityAutoRefresh");
  if (btn) btn.textContent = active ? "Автообновление: включено" : "Автообновление: выключено";
  if (securityAutorefreshTimer) {
    clearInterval(securityAutorefreshTimer);
    securityAutorefreshTimer = null;
  }
  if (active) {
    securityAutorefreshTimer = setInterval(refreshSecuritySnapshot, 90000);
    setActionStatus("Автообновление безопасности включено", "info");
  }
}

function toggleSecurityAutorefresh() {
  const current = (localStorage.getItem(securityAutorefreshKey) || "0") === "1";
  setSecurityAutorefresh(!current);
}

function initSecurityAutorefresh() {
  const saved = (localStorage.getItem(securityAutorefreshKey) || "0") === "1";
  setSecurityAutorefresh(saved);
}

function setInlineStatus(id, message, kind = "info") {
  const box = document.getElementById(id);
  if (!box) return;
  const normalized = (kind || "info").toLowerCase();
  box.classList.remove("ok", "error", "info");
  box.classList.add(normalized === "ok" ? "ok" : normalized === "error" ? "error" : "info");
  box.textContent = message || "Ожидание";
}

function setAuthorized(authorized) {
  document.body.classList.toggle("authorized", Boolean(authorized));
  const openAuth = document.getElementById("btnOpenAuth");
  if (openAuth) {
    openAuth.textContent = authorized ? "Сменить пользователя" : "Вход в систему";
  }
  const overlay = document.getElementById("authOverlay");
  if (!overlay) return;
  if (authorized) {
    overlay.classList.add("hidden");
  }
}

function openAuthModal() {
  const overlay = document.getElementById("authOverlay");
  if (!overlay) return;
  overlay.classList.remove("hidden");
  const loginInput = document.getElementById("adminLogin");
  if (loginInput) loginInput.focus();
}

function closeAuthModal() {
  if (!token) {
    setActionStatus("Сначала выполните вход", "info");
    return;
  }
  const overlay = document.getElementById("authOverlay");
  if (!overlay) return;
  overlay.classList.add("hidden");
}

function logout() {
  token = "";
  selectedUserId = null;
  localStorage.removeItem("synapse_web_admin_token");
  document.getElementById("authMsg").textContent = "Токен очищен";
  document.getElementById("selected").textContent = "Пользователь не выбран";
  setAuthorized(false);
  openAuthModal();
  document.getElementById("adminPassword").value = "";
  setActionStatus("Сессия завершена. Выполните повторный вход.", "info");
}

function bindClick(id, handler) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("click", handler);
}

function bindChange(id, handler) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("change", handler);
}

function dryRunStatusLabel(status) {
  if (status === "ok") return "успешно";
  if (status === "failed") return "ошибка";
  if (status === "running") return "выполняется";
  if (status === "never-run") return "не запускался";
  return "неизвестно";
}

function renderMobileSecuritySummary() {
  const checks = document.getElementById("mobileSecChecks");
  const alerts = document.getElementById("mobileSecAlerts");
  const dryRun = document.getElementById("mobileSecDryRun");
  const trend = document.getElementById("mobileSecTrend");
  const range = document.getElementById("mobileSecRange");
  if (checks) checks.textContent = securityMobileState.checks;
  if (alerts) alerts.textContent = securityMobileState.alerts;
  if (dryRun) dryRun.textContent = securityMobileState.dryRun;
  if (trend) trend.textContent = securityMobileState.trend;
  if (range) range.textContent = securityMobileState.range;
}


function initRightsBadgeSlogan() {
  const el = document.getElementById("rightsSlogan");
  if (!el) return;
  const day = new Date().getUTCDate();
  const slogan = RIGHTS_SLOGANS[day % RIGHTS_SLOGANS.length] || RIGHTS_SLOGANS[0];
  el.textContent = slogan;
}

function legalStatusTag(status) {
  const st = String(status || "UNKNOWN").toUpperCase();
  if (st === "APPROVED") return { text: "APPROVED", cls: "ok" };
  if (st === "READY_FOR_REVIEW") return { text: "READY_FOR_REVIEW", cls: "warn" };
  if (st === "IN_PROGRESS") return { text: "IN_PROGRESS", cls: "warn" };
  if (st === "NOT_STARTED") return { text: "NOT_STARTED", cls: "error" };
  return { text: st, cls: "error" };
}

const LEGAL_ALLOWED_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "READY_FOR_REVIEW", "APPROVED"];

function createLegalStatusSelect(currentStatus, title) {
  const select = document.createElement("select");
  select.className = "legalStatusSelect";
  select.setAttribute("data-legal-title", title || "");
  for (const st of LEGAL_ALLOWED_STATUSES) {
    const opt = document.createElement("option");
    opt.value = st;
    opt.textContent = st;
    if (String(currentStatus || "").toUpperCase() === st) opt.selected = true;
    select.appendChild(opt);
  }
  return select;
}

function renderLegalComplianceStatus(payload) {
  const summary = document.getElementById("legalComplianceSummary");
  const link = document.getElementById("legalGoNoGoLink");
  const tbody = document.getElementById("legalComplianceTbody");

  const data = payload || {};
  const counts = data.counts || {};
  const goNoGo = data.goNoGo || {};
  const items = Array.isArray(data.items) ? data.items : [];

  if (summary) {
    const approved = Number(counts.APPROVED || 0);
    const inProgress = Number(counts.IN_PROGRESS || 0);
    const notStarted = Number(counts.NOT_STARTED || 0);
    const review = Number(counts.READY_FOR_REVIEW || 0);
    summary.textContent =
      "Legal status: APPROVED=" + approved +
      ", READY_FOR_REVIEW=" + review +
      ", IN_PROGRESS=" + inProgress +
      ", NOT_STARTED=" + notStarted;
    summary.classList.remove("ok", "error", "info");
    summary.classList.add(Boolean(goNoGo.ok) ? "ok" : "error");
  }

  if (link) {
    const missing = Array.isArray(goNoGo.missingApproved) ? goNoGo.missingApproved : [];
    link.textContent = goNoGo.ok
      ? "Go/No-Go legal gate: GO (все обязательные юридические пункты APPROVED)."
      : "Go/No-Go legal gate: NO-GO | не APPROVED: " + (missing.length ? missing.join("; ") : "нет данных");
  }

  if (!tbody) return;
  tbody.innerHTML = "";
  for (const item of items) {
    const tr = document.createElement("tr");
    const tag = legalStatusTag(item.status);
    const tdGroup = document.createElement("td");
    tdGroup.textContent = item.group || "-";
    const tdTitle = document.createElement("td");
    tdTitle.textContent = item.title || "-";
    const tdStatus = document.createElement("td");
    const statusBadge = document.createElement("span");
    statusBadge.className = "legalStatusTag " + tag.cls;
    statusBadge.textContent = tag.text;
    tdStatus.appendChild(statusBadge);

    const tdAction = document.createElement("td");
    const controls = document.createElement("div");
    controls.className = "legalStatusControls";
    const select = createLegalStatusSelect(item.status, item.title || "");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "hintable";
    button.setAttribute("data-legal-save", "1");
    button.setAttribute("data-legal-title", item.title || "");
    button.textContent = "Сохранить";
    controls.appendChild(select);
    controls.appendChild(button);
    tdAction.appendChild(controls);

    tr.appendChild(tdGroup);
    tr.appendChild(tdTitle);
    tr.appendChild(tdStatus);
    tr.appendChild(tdAction);
    tbody.appendChild(tr);
  }
}

async function saveLegalComplianceStatus(title, status) {
  const itemTitle = String(title || "").trim();
  const nextStatus = String(status || "").trim().toUpperCase();
  if (!itemTitle) return;
  if (!LEGAL_ALLOWED_STATUSES.includes(nextStatus)) {
    setInlineStatus("legalComplianceSummary", "Недопустимый статус", "error");
    return;
  }
  const r = await req("/admin/legal/compliance-status", {
    method: "POST",
    body: JSON.stringify({ title: itemTitle, status: nextStatus }),
  });
  if (r.status !== 200) {
    setInlineStatus("legalComplianceSummary", "Не удалось сохранить юридический статус", "error");
    return log(r);
  }
  renderLegalComplianceStatus((r.body || {}).summary || {});
  await loadLegalComplianceHistory();
  await loadGoNoGo();
  setInlineStatus("legalComplianceSummary", "Юридический статус сохранен", "ok");
  log({ status: 200, message: "Юридический статус изменен", title: itemTitle, status: nextStatus });
}

function bindLegalComplianceActions() {
  const tbody = document.getElementById("legalComplianceTbody");
  if (!tbody || tbody.dataset.bound === "1") return;
  tbody.dataset.bound = "1";
  tbody.addEventListener("click", async (event) => {
    const target = event.target;
    if (!target || !target.getAttribute) return;
    if (!target.hasAttribute("data-legal-save")) return;
    const title = target.getAttribute("data-legal-title") || "";
    const row = target.closest("tr");
    const select = row ? row.querySelector("select[data-legal-title]") : null;
    const status = select ? select.value : "";
    await saveLegalComplianceStatus(title, status);
  });
}

async function loadLegalComplianceStatus() {
  const r = await req("/admin/legal/compliance-status");
  if (r.status !== 200) {
    setInlineStatus("legalComplianceSummary", "Не удалось загрузить юридический статус", "error");
    return log(r);
  }
  renderLegalComplianceStatus(r.body || {});
  log({
    status: 200,
    message: "Юридический статус обновлен",
    legalGate: ((r.body || {}).goNoGo || {}).status || "no-go",
  });
}

function renderLegalComplianceHistory(payload) {
  const summary = document.getElementById("legalComplianceHistorySummary");
  const tbody = document.getElementById("legalComplianceHistoryTbody");
  const rows = Array.isArray((payload || {}).history) ? (payload || {}).history : [];
  if (summary) {
    const latestAt = (payload || {}).latestAt || "нет данных";
    summary.textContent = "История legal-изменений: " + rows.length + ", последняя запись: " + latestAt;
    summary.classList.remove("ok", "error", "info");
    summary.classList.add(rows.length ? "ok" : "info");
  }
  if (!tbody) return;
  tbody.innerHTML = "";
  for (const row of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      "<td>" + (row.at || "-") + "</td>" +
      "<td>" + (row.title || "-") + "</td>" +
      "<td>" + (row.fromStatus || "-") + "</td>" +
      "<td>" + (row.toStatus || "-") + "</td>" +
      "<td>" + (row.changedBy || "-") + "</td>";
    tbody.appendChild(tr);
  }
}

async function loadLegalComplianceHistory() {
  const r = await req("/admin/legal/compliance-history?limit=30");
  if (r.status !== 200) {
    setInlineStatus("legalComplianceHistorySummary", "Не удалось загрузить историю legal-изменений", "error");
    return log(r);
  }
  renderLegalComplianceHistory(r.body || {});
}

function readStateFromUrl() {
  const q = new URLSearchParams(location.search || "");
  let savedSecurity = {};
  try {
    savedSecurity = JSON.parse(localStorage.getItem(securityStateKey) || "{}") || {};
  } catch {}

  const uo = Number(q.get("uoff") || "0");
  const ao = Number(q.get("aoff") || "0");
  const uq = q.get("uq") || "";
  const aa = q.get("aa") || "";

  const sxm = q.get("sxm") || savedSecurity.mode || "all";
  const sfrom = q.get("sfrom") || savedSecurity.from || "";
  const sto = q.get("sto") || savedSecurity.to || "";
  const sack = q.get("sack") || savedSecurity.acked || "all";
  const ssev = q.get("ssev") || savedSecurity.severity || "all";

  state.usersOffset = Number.isFinite(uo) && uo > 0 ? uo : 0;
  state.auditOffset = Number.isFinite(ao) && ao > 0 ? ao : 0;
  if (uq) document.getElementById("usersQuery").value = uq;
  if (aa) document.getElementById("auditAction").value = aa;
  document.getElementById("securityExportMode").value = sxm;
  document.getElementById("securityDateFrom").value = sfrom;
  document.getElementById("securityDateTo").value = sto;
  document.getElementById("securityAlertAckFilter").value = sack;
  document.getElementById("securityAlertSeverityFilter").value = ssev;
}

function writeStateToUrl() {
  const q = new URLSearchParams(location.search || "");
  q.set("uoff", String(state.usersOffset));
  q.set("aoff", String(state.auditOffset));
  const uq = (document.getElementById("usersQuery").value || "").trim();
  const aa = (document.getElementById("auditAction").value || "").trim();
  const sxm = (document.getElementById("securityExportMode").value || "all").trim();
  const sfrom = (document.getElementById("securityDateFrom").value || "").trim();
  const sto = (document.getElementById("securityDateTo").value || "").trim();
  const sack = (document.getElementById("securityAlertAckFilter").value || "all").trim();
  const ssev = (document.getElementById("securityAlertSeverityFilter").value || "all").trim();
  if (uq) q.set("uq", uq); else q.delete("uq");
  if (aa) q.set("aa", aa); else q.delete("aa");
  if (sxm && sxm !== "all") q.set("sxm", sxm); else q.delete("sxm");
  if (sfrom) q.set("sfrom", sfrom); else q.delete("sfrom");
  if (sto) q.set("sto", sto); else q.delete("sto");
  if (sack && sack !== "all") q.set("sack", sack); else q.delete("sack");
  if (ssev && ssev !== "all") q.set("ssev", ssev); else q.delete("ssev");

  localStorage.setItem(
    securityStateKey,
    JSON.stringify({
      mode: sxm,
      from: sfrom,
      to: sto,
      acked: sack,
      severity: ssev,
    }),
  );

  const suffix = q.toString();
  const url = location.pathname + (suffix ? "?" + suffix : "") + location.hash;
  history.replaceState(null, "", url);
}

function switchView(view) {
  document.querySelectorAll(".viewBtn").forEach((b) => {
    b.classList.toggle("active", b.getAttribute("data-view") === view);
  });
  document.querySelectorAll(".viewSection").forEach((s) => {
    s.classList.toggle("active", s.getAttribute("data-view-content") === view);
  });
  localStorage.setItem("synapse_web_admin_view", view);
  if (location.hash !== "#" + view) {
    history.replaceState(null, "", "#" + view);
  }
  if (view === "content") {
    loadContentQaDashboard({ silent: true });
  }
}

async function loadContentQaDashboard(options = {}) {
  if (!token) {
    if (!options.silent) setContentQaEditStatus("Сначала выполните вход администратора.", "error");
    return;
  }
  await loadContentQaSummary();
  await loadContentSources();
  await loadContentBlocks();
  await loadContentQueues();
}

function initViews() {
  document.querySelectorAll(".viewBtn").forEach((b) => {
    b.addEventListener("click", () => switchView(b.getAttribute("data-view")));
  });
  const byHash = (location.hash || "").replace("#", "").trim();
  const saved = localStorage.getItem("synapse_web_admin_view") || "home";
  switchView(byHash || saved);
  document.querySelectorAll("[data-jump-view]").forEach((node) => {
    node.addEventListener("click", () => runQuickJump(node));
  });
}

function runQuickJump(node) {
  const view = node.getAttribute("data-jump-view") || "home";
  switchView(view);

  const schoolTab = node.getAttribute("data-jump-school-tab");
  if (schoolTab) switchSchoolTab(schoolTab);

  const inviteRole = node.getAttribute("data-invite-role");
  if (inviteRole) {
    const roleSelect = document.getElementById("inviteRole");
    if (roleSelect) roleSelect.value = inviteRole;
  }

  const focusTarget = node.getAttribute("data-focus-target");
  if (focusTarget) {
    setTimeout(() => {
      const target = document.getElementById(focusTarget);
      if (!target) return;
      target.focus();
      if (typeof target.select === "function") target.select();
    }, 80);
  }
}

function switchSchoolTab(tab) {
  const next = tab || "overview";
  document.querySelectorAll(".schoolTab").forEach((node) => node.classList.toggle("active", node.getAttribute("data-school-tab") === next));
  document.querySelectorAll(".schoolPanel").forEach((node) => node.classList.toggle("active", node.getAttribute("data-school-panel") === next));
}

function initSchoolTabs() {
  document.querySelectorAll("[data-school-tab]").forEach((node) => {
    node.addEventListener("click", () => switchSchoolTab(node.getAttribute("data-school-tab")));
  });
  switchSchoolTab("overview");
}

function switchUserCardTab(tab) {
  const next = tab || "access";
  document.querySelectorAll(".userCardTab").forEach((node) => node.classList.toggle("active", node.getAttribute("data-user-card-tab") === next));
  document.querySelectorAll(".userCardPanel").forEach((node) => node.classList.toggle("active", node.getAttribute("data-user-card-panel") === next));
}

function initUserCardTabs() {
  document.querySelectorAll("[data-user-card-tab]").forEach((node) => {
    node.addEventListener("click", () => switchUserCardTab(node.getAttribute("data-user-card-tab")));
  });
  bindClick("btnCloseUserCard", () => document.getElementById("userCard")?.classList.add("hidden"));
  bindClick("btnUserCardResetDevices", resetSelectedUserDevices);
  bindClick("btnUserCardPasswordResetCode", createSelectedUserPasswordResetCode);
  bindClick("btnUserCardSetRole", setSelectedUserRoleFromCard);
}

function initMobileCollapses() {
  const blocks = Array.from(document.querySelectorAll("details.mobileCollapse[data-mobile-collapse]"));
  if (!blocks.length) return;
  const defaultOpen = new Set(["roles-help", "go-no-go-gates", "docs-admin", "content-qa-editors", "content-qa-blocks", "content-qa-history"]);
  const isMobile = window.matchMedia("(max-width: 900px)").matches;
  for (const d of blocks) {
    const key = d.getAttribute("data-mobile-collapse") || "";
    const shouldOpen = defaultOpen.has(key) || (isMobile && key === "alerts");
    if (shouldOpen) d.setAttribute("open", "");
    else d.removeAttribute("open");
  }
}

function h() {
  return token ? { Authorization: "Bearer " + token, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

async function req(path, init = {}) {
  try {
    const r = await fetch(base + path, { ...init, headers: { ...h(), ...(init.headers || {}) } });
    const txt = await r.text();
    let body = txt;
    try { body = JSON.parse(txt); } catch {}
    return { status: r.status, body };
  } catch (error) {
    return { status: 0, body: { error: "Сетевая ошибка", details: String((error || {}).message || error || "") } };
  }
}

function log(v) {
  const out = document.getElementById("out");
  if (out) out.textContent = typeof v === "string" ? v : JSON.stringify(v, null, 2);
  if (typeof v === "string") {
    setActionStatus(v, "info");
    return;
  }
  const status = Number((v || {}).status || 0);
  if (status >= 200 && status < 300) {
    setActionStatus(humanizeOperationResult(v) || "Операция выполнена успешно", "ok");
    return;
  }
  if (status > 0) {
    setActionStatus((v || {}).error || (v || {}).message || ("Ошибка операции (код " + status + ")"), "error");
    return;
  }
  if (v && typeof v === "object") {
    setActionStatus((v || {}).error || "Ошибка запроса", "error");
  }
}

function humanizeOperationResult(v) {
  const body = (v || {}).body || {};
  if (typeof v?.message === "string") return v.message;
  if (typeof body?.message === "string") return body.message;
  if (body?.code) return "Код создан";
  if (body?.items) return "Данные обновлены";
  return "Операция выполнена успешно";
}

async function copyAdminText(text, statusId = "actionStatus") {
  const value = String(text || "").trim();
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    if (statusId === "actionStatus") setActionStatus("Код скопирован", "ok");
    else setInlineStatus(statusId, "Код скопирован", "ok");
  } catch {
    if (statusId === "actionStatus") setActionStatus("Скопируйте вручную: " + value, "info");
    else setInlineStatus(statusId, "Скопируйте вручную: " + value, "info");
  }
}

function fillSelect(id, values, placeholder) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = "";
  const f = document.createElement("option");
  f.value = "";
  f.textContent = placeholder;
  el.appendChild(f);
  for (const item of values || []) {
    const o = document.createElement("option");
    o.value = item && typeof item === "object" ? String(item.value || "") : String(item || "");
    o.textContent = item && typeof item === "object" ? String(item.label || item.value || "") : String(item || "");
    el.appendChild(o);
  }
}

function nonEmptyStrings(values) {
  if (!Array.isArray(values)) return [];
  return values.map((v) => String(v || "").trim()).filter(Boolean);
}

function buildLabelMap(options) {
  const out = {};
  for (const item of options || []) {
    const value = item && typeof item === "object" ? String(item.value || "") : String(item || "");
    const label = item && typeof item === "object" ? String(item.label || item.value || "") : String(item || "");
    if (!value) continue;
    out[value] = label;
  }
  return out;
}

function roleLabel(value) {
  return roleLabelMap[value] || value || "—";
}

async function loadOptions() {
  const r = await req("/admin/options");
  const body = r.status === 200 && r.body && typeof r.body === "object" ? r.body : {};
  const roles = Array.isArray(body.roleOptions) && body.roleOptions.length ? body.roleOptions : (nonEmptyStrings(body.roles).length ? nonEmptyStrings(body.roles) : DEFAULT_ROLES);
  const plans = Array.isArray(body.planOptions) ? body.planOptions : nonEmptyStrings(body.plans);
  const modules = Array.isArray(body.moduleOptions) ? body.moduleOptions : nonEmptyStrings(body.modules);
  const scopes = Array.isArray(body.scopeOptions) && body.scopeOptions.length ? body.scopeOptions : (nonEmptyStrings(body.scopes).length ? nonEmptyStrings(body.scopes) : DEFAULT_SCOPES);
  const accessSources = Array.isArray(body.accessSourceOptions) ? body.accessSourceOptions : [];
  const schools = Array.isArray(body.schoolOptions) ? body.schoolOptions : [];

  roleLabelMap = buildLabelMap(roles);
  scopeLabelMap = buildLabelMap(scopes);
  planLabelMap = buildLabelMap(plans);
  moduleLabelMap = buildLabelMap(modules);
  accessSourceLabelMap = buildLabelMap(accessSources);
  schoolOptionMap = buildLabelMap(schools);

  fillSelect("plan", plans, "План");
  fillSelect("module", modules, "Модуль");
  fillSelect("newUserPlan", plans, "План (опционально)");
  fillSelect("newUserModule", modules, "Модуль (опционально)");
  fillSelect("accessPlan", plans, "План доступа");
  fillSelect("accessModule", modules, "Модуль");
  fillSelect("scopeRole", roles, "Роль");
  fillSelect("scopeName", scopes, "Действие");
  fillSelect("bulkRole", roles, "Все роли");
  fillSelect("newUserRole", roles, "Роль");
  fillSelect("setRoleValue", roles, "Новая роль");
  fillSelect("userCardRole", roles, "Роль");
  fillSelect("accessSourceType", accessSources, "Источник доступа");
  fillSelect("accessSchool", schools, "Школа / площадка");
  fillSelect("schoolClassSchool", schools, "Школа");
  fillSelect("inviteSchool", schools, "Школа");

  if (r.status !== 200) {
    log({ status: r.status, message: "Опции загружены с fallback ролями", fallbackRoles: roles.length });
  }
}

async function requestCode() {
  const phone = document.getElementById("phone").value.trim();
  const r = await req("/auth/phone/request-code", { method: "POST", body: JSON.stringify({ phone }) });
  log(r);
}

async function login() {
  const phone = document.getElementById("phone").value.trim();
  const code = document.getElementById("code").value.trim();
  const r = await req("/auth/phone/verify", { method: "POST", body: JSON.stringify({ phone, code }) });
  if (r.status === 200) {
    token = r.body.accessToken || "";
    localStorage.setItem("synapse_web_admin_token", token);
    document.getElementById("authMsg").textContent = "Вход по телефону выполнен";
    setAuthorized(true);
    await loadWorkspace();
  }
  log(r);
}

async function loginByPassword() {
  const login = (document.getElementById("adminLogin").value || "").trim();
  const password = (document.getElementById("adminPassword").value || "").trim();
  if (!login || !password) return log("Введите логин и пароль администратора");
  const r = await req("/admin/auth/login-password", {
    method: "POST",
    body: JSON.stringify({ login, password }),
  });
  if (r.status === 200) {
    token = r.body.accessToken || "";
    localStorage.setItem("synapse_web_admin_token", token);
    document.getElementById("authMsg").textContent = "Вход по логину и паролю выполнен";
    setAuthorized(true);
    await loadWorkspace();
  }
  log(r);
}

async function loadSelectedUserAccesses() {
  if (!selectedUserId) {
    document.getElementById("userAccessSummary").textContent = "Сначала выберите пользователя.";
    return;
  }
  const r = await req("/admin/users/" + encodeURIComponent(selectedUserId) + "/access");
  if (r.status !== 200) return log(r);
  const items = r.body.items || [];
  const html = items.length
    ? items.map((x) => "<div><b>" + (x.summaryRu || "Доступ") + "</b>" + (x.expiresAt ? " до " + x.expiresAt.slice(0, 10) : "") + "</div>").join("")
    : "У пользователя пока нет дополнительных источников доступа.";
  document.getElementById("userAccessSummary").innerHTML = html;
  const cardAccess = document.getElementById("userCardAccess");
  if (cardAccess) cardAccess.innerHTML = html;
}

async function loadSelectedUserDevices() {
  if (!selectedUserId) return;
  const box = document.getElementById("userCardDevices");
  if (box) box.textContent = "Загружаем устройства...";
  const r = await req("/admin/users/" + encodeURIComponent(selectedUserId) + "/devices");
  if (r.status !== 200) {
    if (box) box.textContent = "Не удалось загрузить устройства.";
    return log(r);
  }
  const items = r.body.items || [];
  if (box) box.innerHTML = items.length ? items.map((x) => "<div><b>" + (x.label || x.deviceId || "Устройство") + "</b> · " + (x.active === false ? "Отключено" : "Активно") + " · " + (x.platform || "-") + "</div>").join("") : "Устройства не найдены.";
}

async function openUserCard(userId) {
  selectedUserId = userId;
  document.getElementById("selected").textContent = "Выбран: " + selectedUserId;
  document.getElementById("userCardTitle").textContent = selectedUserId;
  document.getElementById("userCard").classList.remove("hidden");
  switchUserCardTab("access");
  await loadSelectedUserAccesses();
  await loadSelectedUserDevices();
  await loadSelectedUserAudit();
}

async function loadSelectedUserAudit() {
  if (!selectedUserId) return;
  const box = document.getElementById("userCardAudit");
  if (box) box.textContent = "Загружаем журнал...";
  const r = await req("/admin/audit?limit=20&targetUserId=" + encodeURIComponent(selectedUserId));
  if (r.status !== 200) {
    if (box) box.textContent = "Журнал пользователя пока не загружен.";
    return;
  }
  const items = Array.isArray(r.body) ? r.body : [];
  if (box) box.innerHTML = items.length ? items.map((x) => "<div><b>" + (x.action || "Событие") + "</b> · " + ((x.at || x.timestamp || "").slice(0, 19) || "-") + "</div>").join("") : "Событий по пользователю пока нет.";
}

async function resetSelectedUserDevices() {
  if (!selectedUserId) return;
  setInlineStatus("userCardDevicesStatus", "Сбрасываем устройства...", "info");
  const r = await req("/admin/users/" + encodeURIComponent(selectedUserId) + "/devices/reset", { method: "POST", body: JSON.stringify({}) });
  if (r.status === 200) {
    setInlineStatus("userCardDevicesStatus", "Устройства сброшены. Код восстановления: " + (r.body.recoveryCode || "-"), "ok");
    await loadSelectedUserDevices();
  } else {
    setInlineStatus("userCardDevicesStatus", ((r.body || {}).detail || "Не удалось сбросить устройства"), "error");
    log(r);
  }
}

async function createSelectedUserPasswordResetCode() {
  if (!selectedUserId) return;
  setInlineStatus("userCardDevicesStatus", "Создаём код сброса пароля...", "info");
  const r = await req("/admin/users/" + encodeURIComponent(selectedUserId) + "/password-reset-code", { method: "POST", body: JSON.stringify({ ttlHours: 72 }) });
  if (r.status === 200) {
    setInlineStatus("userCardDevicesStatus", "Код сброса пароля: " + (r.body.resetCode || "-") + ". Действует до: " + ((r.body.expiresAt || "").slice(0, 16) || "-"), "ok");
  } else {
    setInlineStatus("userCardDevicesStatus", ((r.body || {}).detail || "Не удалось создать код сброса пароля"), "error");
    log(r);
  }
}

async function setSelectedUserRoleFromCard() {
  if (!selectedUserId) return;
  const role = document.getElementById("userCardRole").value;
  if (!role) return setInlineStatus("userCardRoleStatus", "Выберите роль", "error");
  const r = await req("/admin/users/role", { method: "POST", body: JSON.stringify({ userId: selectedUserId, role }) });
  if (r.status === 200) {
    setInlineStatus("userCardRoleStatus", "Роль сохранена", "ok");
    await loadUsers();
  } else {
    setInlineStatus("userCardRoleStatus", ((r.body || {}).detail || "Не удалось сохранить роль"), "error");
    log(r);
  }
}

async function grantAccessForSelected() {
  if (!selectedUserId) {
    setInlineStatus("subscriptionsActionStatus", "Сначала выберите пользователя", "error");
    return;
  }
  const payload = {
    userId: selectedUserId,
    sourceType: document.getElementById("accessSourceType").value,
    schoolId: document.getElementById("accessSchool").value || null,
    title: (document.getElementById("accessTitle").value || "").trim() || null,
    plan: document.getElementById("accessPlan").value || null,
    moduleId: document.getElementById("accessModule").value || null,
    expiresAt: document.getElementById("accessExpiresAt").value || null,
  };
  if (!payload.sourceType) {
    setInlineStatus("subscriptionsActionStatus", "Выберите источник доступа", "error");
    return;
  }
  const r = await req("/admin/access/grant", { method: "POST", body: JSON.stringify(payload) });
  log(r);
  if (r.status === 200) {
    setInlineStatus("subscriptionsActionStatus", "Источник доступа выдан", "ok");
    await loadSelectedUserAccesses();
    await loadUsers();
  } else {
    setInlineStatus("subscriptionsActionStatus", "Не удалось выдать источник доступа", "error");
  }
}

async function loadSchoolsOverview() {
  const r = await req("/admin/schools/overview");
  if (r.status !== 200) return log(r);
  const items = r.body.items || [];
  const box = document.getElementById("schoolCards");
  box.innerHTML = "";
  document.getElementById("schoolsSummary").textContent = items.length ? "Школ и лицензий: " + items.length : "Школы не найдены";
  for (const school of items) {
    const card = document.createElement("div");
    const licenses = school.licenses || [];
    const sites = (school.sites || []).map((x) => x.title).join(", ");
    card.className = "metricCard";
    card.innerHTML =
      '<h3>' + (school.schoolTitle || '') + '</h3>' +
      '<div class="muted">Организация: ' + (school.organizationTitle || '-') + '</div>' +
      '<div class="muted">Площадки: ' + (sites || '-') + '</div>' +
      licenses.map((lic) =>
        '<div style="margin-top:10px"><b>' + (lic.title || '') + '</b><br/>' +
        '<span class="muted">' + (lic.partnerStatusLabel || lic.accessTypeLabelRu || '') + '</span><br/>' +
        '<span class="muted">' + (lic.schoolAccessLabel || '') + '</span><br/>' +
        '<span class="muted">Стоимость: ' + String(lic.priceRub ?? '-') + ' ₽</span><br/>' +
        '<span class="muted">Срок: ' + ((lic.startsAt || '').slice(0, 10)) + ' — ' + ((lic.expiresAt || '').slice(0, 10)) + '</span><br/>' +
        '<span class="muted">Модули: ' + (lic.modules || []).map((m) => m.labelRu).join(', ') + '</span><br/>' +
        '<span class="muted">Функции: ' + (lic.features || []).map((m) => m.labelRu).join(', ') + '</span></div>'
      ).join('');
    box.appendChild(card);
  }
}


async function createSchool() {
  const payload = {
    title: (document.getElementById("schoolTitle").value || "").trim(),
    organizationTitle: (document.getElementById("schoolOrganizationTitle").value || "").trim() || null,
    siteTitle: (document.getElementById("schoolSiteTitle").value || "").trim() || null,
    status: document.getElementById("schoolStatus").value || "active",
  };
  if (!payload.title) {
    setInlineStatus("createSchoolStatus", "Введите название школы", "error");
    return;
  }
  const r = await req("/admin/schools", { method: "POST", body: JSON.stringify(payload) });
  if (r.status === 200) {
    setInlineStatus("createSchoolStatus", "Школа создана", "ok");
    document.getElementById("schoolTitle").value = "";
    document.getElementById("schoolOrganizationTitle").value = "";
    document.getElementById("schoolSiteTitle").value = "";
    await loadOptions();
    await loadSchoolsOverview();
  } else {
    setInlineStatus("createSchoolStatus", ((r.body || {}).detail || "Не удалось создать школу"), "error");
    log(r);
  }
}

async function loadSchoolClasses() {
  const schoolId = document.getElementById("schoolClassSchool").value || document.getElementById("inviteSchool").value || "school_2070";
  const r = await req("/admin/schools/classes?schoolId=" + encodeURIComponent(schoolId));
  if (r.status !== 200) return log(r);
  const items = r.body.items || [];
  const tbody = document.getElementById("schoolClassesTbody");
  const inviteClass = document.getElementById("inviteClass");
  tbody.innerHTML = "";
  if (inviteClass) {
    inviteClass.innerHTML = '<option value="">Класс</option>';
  }
  for (const row of items) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td>' + (row.title || '') + '</td>' +
      '<td>' + (row.subject || '-') + '</td>' +
      '<td>' + (row.teacherUserId || '-') + '</td>' +
      '<td>' + String(row.studentCount || 0) + '</td>' +
      '<td>' + String(row.teacherCount || 0) + '</td>';
    tbody.appendChild(tr);
    if (inviteClass) {
      const opt = document.createElement("option");
      opt.value = row.classId || "";
      opt.textContent = row.title || row.classId || "Класс";
      inviteClass.appendChild(opt);
    }
  }
  document.getElementById("schoolClassesSummary").textContent = items.length ? "Классов: " + items.length : "Классы не найдены";
}

async function createSchoolClass() {
  const payload = {
    schoolId: document.getElementById("schoolClassSchool").value || "school_2070",
    title: (document.getElementById("schoolClassTitle").value || "").trim(),
    subject: (document.getElementById("schoolClassSubject").value || "").trim() || null,
    teacherUserId: (document.getElementById("schoolClassTeacherUserId").value || "").trim() || null,
  };
  if (!payload.title) {
    setInlineStatus("schoolClassesSummary", "Введите название класса", "error");
    return;
  }
  const r = await req("/admin/schools/classes", { method: "POST", body: JSON.stringify(payload) });
  log(r);
  if (r.status === 200) {
    setInlineStatus("schoolClassesSummary", "Класс создан", "ok");
    document.getElementById("schoolClassTitle").value = "";
    document.getElementById("schoolClassSubject").value = "";
    document.getElementById("schoolClassTeacherUserId").value = "";
    await loadSchoolClasses();
  } else {
    setInlineStatus("schoolClassesSummary", "Не удалось создать класс", "error");
  }
}

async function loadSchoolInvites() {
  const schoolId = document.getElementById("inviteSchool").value || document.getElementById("schoolClassSchool").value || "school_2070";
  const r = await req("/admin/schools/invites?schoolId=" + encodeURIComponent(schoolId));
  if (r.status !== 200) return log(r);
  const items = r.body.items || [];
  state.schoolInvites = items;
  const tbody = document.getElementById("schoolInvitesTbody");
  tbody.innerHTML = "";
  for (const row of items) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td><b>' + (row.code || '') + '</b></td>' +
      '<td>' + (row.roleLabelRu || row.role || '') + '</td>' +
      '<td>' + (row.classId || '-') + '</td>' +
      '<td>' + (row.title || '-') + '</td>' +
      '<td>' + (row.statusLabelRu || row.status || '-') + '</td>' +
      '<td>' + ((row.expiresAt || '').slice(0, 10) || '-') + '</td>' +
      '<td><button type="button" data-copy-admin-code="' + (row.code || '') + '">Копировать</button></td>';
    tbody.appendChild(tr);
  }
  document.querySelectorAll("[data-copy-admin-code]").forEach((node) => {
    node.addEventListener("click", () => copyAdminText(node.getAttribute("data-copy-admin-code"), "schoolInvitesSummary"));
  });
  document.getElementById("schoolInvitesSummary").textContent = items.length ? "Кодов: " + items.length : "Коды не найдены";
  const pending = items.filter((x) => String(x.status || "pending") === "pending").length;
  const homeInvitesMetric = document.getElementById("homeInvitesMetric");
  if (homeInvitesMetric) homeInvitesMetric.textContent = String(pending);
}

async function createSchoolInvite() {
  const payload = {
    schoolId: document.getElementById("inviteSchool").value || "school_2070",
    classId: document.getElementById("inviteClass").value || null,
    role: document.getElementById("inviteRole").value,
    title: (document.getElementById("inviteTitle").value || "").trim() || null,
    subject: (document.getElementById("inviteSubject").value || "").trim() || null,
    studentLabel: (document.getElementById("inviteStudentLabel").value || "").trim() || null,
    expiresAt: document.getElementById("inviteExpiresAt").value || null,
    teacherUserId: (document.getElementById("inviteTeacherUserId").value || "").trim() || null,
    maxActivations: 1,
  };
  if (!payload.role) {
    setInlineStatus("schoolInvitesSummary", "Выберите роль приглашения", "error");
    return;
  }
  if (!payload.schoolId) {
    setInlineStatus("schoolInvitesSummary", "Выберите школу", "error");
    return;
  }
  setInlineStatus("schoolInvitesSummary", "Создаём код...", "info");
  const r = await req("/admin/schools/invites", { method: "POST", body: JSON.stringify(payload) });
  log(r);
  if (r.status === 200) {
    setInlineStatus("schoolInvitesSummary", "Код создан: " + (r.body.code || ""), "ok");
    document.getElementById("inviteTitle").value = "";
    document.getElementById("inviteSubject").value = "";
    document.getElementById("inviteStudentLabel").value = "";
    document.getElementById("inviteExpiresAt").value = "";
    document.getElementById("inviteTeacherUserId").value = "";
    await loadSchoolInvites();
  } else {
    const message = r.status === 401 ? "Сессия администратора истекла. Войдите заново." : ((r.body || {}).detail || (r.body || {}).error || "Не удалось создать код. Проверьте школу, роль и класс.");
    setInlineStatus("schoolInvitesSummary", message, "error");
  }
}

function downloadTextFile(filename, text, type = "text/plain;charset=utf-8") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportStudentCodes(format = "csv") {
  const rows = (state.schoolInvites || []).filter((x) => ["student", "learner"].includes(String(x.role || "")));
  if (!rows.length) {
    setInlineStatus("schoolInvitesSummary", "Нет ученических кодов для выгрузки", "error");
    return;
  }
  const header = ["Код", "Тип", "Класс", "Название/метка", "Статус", "Срок"];
  const lines = [header].concat(rows.map((x) => [x.code || "", x.roleLabelRu || x.role || "", x.classId || "", x.studentLabel || x.title || "", x.statusLabelRu || x.status || "", (x.expiresAt || "").slice(0, 10)]));
  const sep = format === "xls" ? "\t" : ";";
  const text = lines.map((line) => line.map((cell) => '"' + String(cell).replaceAll('"', '""') + '"').join(sep)).join("\n");
  downloadTextFile(format === "xls" ? "student-access-codes.xls" : "student-access-codes.csv", text, format === "xls" ? "application/vnd.ms-excel;charset=utf-8" : "text/csv;charset=utf-8");
  setInlineStatus("schoolInvitesSummary", "Список кодов скачан", "ok");
}

async function loadWorkspace() {
  await loadOptions();
  await loadUsers();
  await loadKpi();
  await loadSchoolsOverview();
  await loadSchoolClasses();
  await loadSchoolInvites();
  await loadMatrix();
  await loadAudit();
  await loadSecurity();
  await loadMobileReadiness();
  await loadContentIngestion();
  await loadSecurityAlerts();
  await loadSecurityActions();
  await loadBackupDryRunStatus();
  await loadBackupDryRunHistory();
  await loadGoNoGo();
  await loadLegalComplianceStatus();
  await loadLegalComplianceHistory();
}

async function loadUsers() {
  const q = document.getElementById("usersQuery").value.trim();
  const r = await req("/admin/users?limit=" + pageSize + "&offset=" + state.usersOffset + (q ? "&query=" + encodeURIComponent(q) : ""));
  if (r.status !== 200) return log(r);
  const tbody = document.getElementById("usersTbody");
  tbody.innerHTML = "";
  const homeUsersMetric = document.getElementById("homeUsersMetric");
  if (homeUsersMetric) homeUsersMetric.textContent = String((r.body || []).length) + "+";
  for (const u of r.body || []) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td><button data-u="' + (u.userId || "") + '">Выбрать</button></td>' +
      '<td>' + (u.userId || "") + '</td>' +
      '<td>' + (u.phone || "") + '</td>' +
      '<td>' + (u.roleLabelRu || roleLabel(u.role) || "") + '</td>' +
      '<td>' + (((u.activeAccesses || []).length ? (u.activeAccesses || []).join("<br/>") : "-") ) + '</td>' +
      '<td>' + (((u.plans || []).length ? (u.plans || []).map((x) => planLabelMap[x] || x).join(", ") : "-") ) + '</td>' +
      '<td>' + (((u.modules || []).length ? (u.modules || []).map((x) => moduleLabelMap[x] || x).join(", ") : "-") ) + '</td>';
    tbody.appendChild(tr);
  }
  tbody.querySelectorAll("button[data-u]").forEach((b) => b.addEventListener("click", () => {
    openUserCard(b.getAttribute("data-u"));
  }));
  const page = Math.floor(state.usersOffset / pageSize) + 1;
  document.getElementById("usersPageInfo").textContent = "Страница " + page + ", элементов: " + (r.body || []).length;
  writeStateToUrl();
}

async function createUser() {
  const phone = (document.getElementById("newUserPhone").value || "").trim();
  const role = document.getElementById("newUserRole").value || "student";
  const plan = (document.getElementById("newUserPlan").value || document.getElementById("newUserPlanManual").value || "").trim() || null;
  const moduleId = (document.getElementById("newUserModule").value || document.getElementById("newUserModuleManual").value || "").trim() || null;
  if (!phone) {
    setInlineStatus("usersActionStatus", "Укажите телефон нового пользователя", "error");
    return log("Введите телефон нового пользователя");
  }
  if ((role === "admin" || role === "owner") && !confirm("Подтвердите создание пользователя с ролью " + role)) return;
  const payload = {
    phone,
    role,
    plan,
    moduleId,
  };
  const r = await req("/admin/users/create", { method: "POST", body: JSON.stringify(payload) });
  log(r);
  if (r.status === 200) {
    document.getElementById("newUserPhone").value = "";
    document.getElementById("newUserPlan").value = "";
    document.getElementById("newUserModule").value = "";
    document.getElementById("newUserPlanManual").value = "";
    document.getElementById("newUserModuleManual").value = "";
    document.getElementById("createUserResult").textContent =
      "Пользователь создан: " + (r.body.userId || "") +
      " | роль: " + (r.body.role || role) +
      (plan ? " | план: " + plan : "") +
      (moduleId ? " | модуль: " + moduleId : "");
    selectedUserId = r.body.userId || selectedUserId;
    document.getElementById("selected").textContent = "Выбран: " + selectedUserId;
    document.getElementById("usersQuery").value = phone;
    state.usersOffset = 0;
    await loadUsers();
    await loadKpi();
    setInlineStatus("usersActionStatus", "Пользователь создан и найден в списке", "ok");
  } else {
    setInlineStatus("usersActionStatus", "Не удалось создать пользователя", "error");
  }
}

async function setRoleForSelected() {
  if (!selectedUserId) {
    setInlineStatus("usersActionStatus", "Сначала выберите пользователя", "error");
    return log("Сначала выберите пользователя");
  }
  const role = document.getElementById("setRoleValue").value;
  if (!role) {
    setInlineStatus("usersActionStatus", "Выберите роль", "error");
    return log("Выберите роль");
  }
  if ((role === "admin" || role === "owner") && !confirm("Подтвердите назначение роли " + role + " пользователю " + selectedUserId)) return;
  const r = await req("/admin/users/role", {
    method: "POST",
    body: JSON.stringify({ userId: selectedUserId, role }),
  });
  log(r);
  if (r.status === 200) {
    await loadUsers();
    setInlineStatus("usersActionStatus", "Роль обновлена", "ok");
  } else {
    setInlineStatus("usersActionStatus", "Не удалось назначить роль", "error");
  }
}

async function grant() {
  if (!selectedUserId) {
    setInlineStatus("subscriptionsActionStatus", "Сначала выберите пользователя", "error");
    return log("Сначала выберите пользователя");
  }
  const payload = { userId: selectedUserId, plan: document.getElementById("plan").value || null, moduleId: document.getElementById("module").value || null };
  const r = await req("/admin/subscriptions/grant", { method: "POST", body: JSON.stringify(payload) });
  log(r);
  setInlineStatus("subscriptionsActionStatus", r.status === 200 ? "Подписка выдана" : "Не удалось выдать подписку", r.status === 200 ? "ok" : "error");
}

async function revoke() {
  if (!selectedUserId) {
    setInlineStatus("subscriptionsActionStatus", "Сначала выберите пользователя", "error");
    return log("Сначала выберите пользователя");
  }
  const payload = { userId: selectedUserId, plan: document.getElementById("plan").value || null, moduleId: document.getElementById("module").value || null };
  const r = await req("/admin/subscriptions/revoke", { method: "POST", body: JSON.stringify(payload) });
  log(r);
  setInlineStatus("subscriptionsActionStatus", r.status === 200 ? "Подписка отозвана" : "Не удалось отозвать подписку", r.status === 200 ? "ok" : "error");
}

async function loadKpi() {
  const r = await req("/admin/subscriptions/kpi");
  if (r.status !== 200) return log(r);
  const u = r.body.users || {};
  const kpi = document.getElementById("kpi");
  kpi.innerHTML =
    '<div><b>' + (u.total || 0) + '</b><br/>Всего</div>' +
    '<div><b>' + (u.freeOnly || 0) + '</b><br/>Только free</div>' +
    '<div><b>' + (u.paidAny || 0) + '</b><br/>Платные</div>';
}

async function runBulk(dryRun) {
  const payload = {
    action: document.getElementById("bulkAction").value,
    role: document.getElementById("bulkRole").value || null,
    query: document.getElementById("bulkQuery").value.trim() || null,
    plan: document.getElementById("plan").value || null,
    moduleId: document.getElementById("module").value || null,
    dryRun,
    limit: Number(document.getElementById("bulkLimit").value || "200"),
  };
  if (!payload.plan && !payload.moduleId) {
    setInlineStatus("subscriptionsActionStatus", "Укажите план или модуль", "error");
    return log("Укажите план или модуль для bulk операции");
  }
  if (!dryRun && !confirm("Подтвердите массовую операцию по подпискам")) return;
  const r = await req("/admin/subscriptions/bulk", { method: "POST", body: JSON.stringify(payload) });
  log(r);
  if (r.status === 200 && !dryRun) {
    await loadKpi();
  }
  setInlineStatus(
    "subscriptionsActionStatus",
    r.status === 200 ? (dryRun ? "Предпросмотр массовой операции готов" : "Массовая операция выполнена") : "Ошибка массовой операции",
    r.status === 200 ? "ok" : "error",
  );
}

function scopeLabel(s) {
  return scopeLabelMap[s] || s;
}

async function saveScope() {
  const payload = {
    role: document.getElementById("scopeRole").value,
    scope: document.getElementById("scopeName").value,
    allow: document.getElementById("scopeAllow").value === "true",
  };
  if (!payload.role || !payload.scope) {
    setInlineStatus("rightsActionStatus", "Выберите роль и действие", "error");
    return log("Выберите роль и действие");
  }
  const r = await req("/admin/rights/scopes", { method: "POST", body: JSON.stringify(payload) });
  if (r.status === 200) await loadMatrix();
  log(r);
  setInlineStatus("rightsActionStatus", r.status === 200 ? "Права обновлены" : "Ошибка сохранения прав", r.status === 200 ? "ok" : "error");
}

async function loadMatrix() {
  const r = await req("/admin/rights/matrix");
  if (r.status !== 200) return log(r);
  const tbody = document.getElementById("matrixTbody");
  tbody.innerHTML = "";
  for (const row of r.body.matrix || []) {
    const roleMap = {};
    for (const x of row.roles || []) roleMap[x.role] = x;
    function cell(role) {
      const it = roleMap[role] || {};
      const base = it.baseAllow ? "Да" : "Нет";
      const ov = it.hasOverride ? (it.overrideAllow ? "Разрешено вручную" : "Запрещено вручную") : "Нет ручной настройки";
      const fin = it.effectiveAllow ? "Есть доступ" : "Нет доступа";
      return '<div class="muted">По умолчанию: ' + base + '</div><div class="muted">Ручная: ' + ov + '</div><b>' + fin + '</b>';
    }
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td><b>' + scopeLabel(row.scope) + '</b><br/><span class="muted">' + row.scope + '</span></td>' +
      '<td>' + cell("student") + '</td>' +
      '<td>' + cell("teacher") + '</td>' +
      '<td>' + cell("parent") + '</td>' +
      '<td>' + cell("admin") + '</td>' +
      '<td>' + cell("owner") + '</td>';
    tbody.appendChild(tr);
  }
}

async function loadAudit() {
  const action = (document.getElementById("auditAction").value || "").trim();
  const q = "?limit=" + pageSize + "&offset=" + state.auditOffset + (action ? "&action=" + encodeURIComponent(action) : "");
  const r = await req("/admin/audit" + q);
  if (r.status !== 200) {
    setInlineStatus("auditActionStatus", "Ошибка загрузки журнала", "error");
    return log(r);
  }
  const tbody = document.getElementById("auditTbody");
  tbody.innerHTML = "";
  for (const row of r.body || []) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td>' + (row.createdAt || "") + '</td>' +
      '<td>' + (row.actorUserId || "") + '</td>' +
      '<td>' + (row.action || "") + '</td>' +
      '<td>' + (row.targetUserId || "") + '</td>';
    tbody.appendChild(tr);
  }
  const page = Math.floor(state.auditOffset / pageSize) + 1;
  document.getElementById("auditPageInfo").textContent = "Страница " + page + ", элементов: " + (r.body || []).length;
  writeStateToUrl();
  setInlineStatus("auditActionStatus", "Журнал обновлен", "ok");
  log({ status: 200, message: "Журнал обновлен", rows: (r.body || []).length });
}

async function exportAuditCsv() {
  const action = (document.getElementById("auditAction").value || "").trim();
  const q = action ? "?limit=5000&action=" + encodeURIComponent(action) : "?limit=5000";
  const response = await fetch(base + "/admin/audit/export.csv" + q, { headers: h() });
  if (!response.ok) {
    const txt = await response.text();
    setInlineStatus("auditActionStatus", "Ошибка выгрузки таблицы", "error");
    return log({ status: response.status, error: txt });
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "admin-audit.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  setInlineStatus("auditActionStatus", "Таблица журнала выгружена", "ok");
  log({ status: 200, message: "Таблица выгружена" });
}

async function loadSecurity() {
  const r = await req("/admin/security/checklist");
  if (r.status !== 200) return log(r);
  const summary = document.getElementById("securitySummary");
  const tbody = document.getElementById("securityTbody");
  const checks = r.body.checks || [];
  summary.textContent = "Проверок пройдено: " + (r.body.okChecks || 0) + " из " + (r.body.totalChecks || 0);
  tbody.innerHTML = "";
  for (const c of checks) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td>' + (c.name || "") + '</td>' +
      '<td>' + (c.ok ? "OK" : "Требует внимания") + '</td>' +
      '<td>' + (c.value || "") + '</td>' +
      '<td>' + (c.recommendation || "") + '</td>';
    tbody.appendChild(tr);
  }
  securityMobileState.checks = (r.body.okChecks || 0) + "/" + (r.body.totalChecks || 0);
  renderMobileSecuritySummary();
  log({ status: 200, message: "Чеклист безопасности обновлен", ok: r.body.okChecks, total: r.body.totalChecks });
}

async function loadMobileReadiness() {
  const r = await req("/admin/security/mobile-readiness");
  if (r.status !== 200) {
    log(r);
    return false;
  }
  const target = document.getElementById("mobileReadinessSummary");
  const smoke = (r.body || {}).smoke || {};
  const smokeSla = (r.body || {}).smokeSla || {};
  if (target) {
    target.textContent = "Готовность мобильного приложения: " + ((r.body || {}).level || "неизвестно") +
      (smoke.lastRunAt ? ", проверка: " + (smoke.status || "неизвестно") + " @ " + smoke.lastRunAt : ", проверка: не запускалась") +
      (smoke.lastRunBy ? " | кто: " + smoke.lastRunBy : "") +
      ", SLA7d: " + (smokeSla.ok ? "в норме" : "просрочено");
  }
  const smokeStatus = document.getElementById("mobileSmokeStatus");
  if (smokeStatus && (smoke.status === "ok" || smoke.status === "failed")) {
    smokeStatus.value = smoke.status;
  }
  const smokeNotes = document.getElementById("mobileSmokeNotes");
  if (smokeNotes && smoke.notes) {
    smokeNotes.value = smoke.notes;
  }
  log({ status: 200, message: "Готовность мобильного приложения обновлена", level: (r.body || {}).level || "неизвестно" });
  return true;
}

async function saveMobileSmoke() {
  const status = (document.getElementById("mobileSmokeStatus").value || "ok").trim();
  const notes = (document.getElementById("mobileSmokeNotes").value || "").trim();
  const r = await req("/admin/security/mobile-onboarding/smoke", {
    method: "POST",
    body: JSON.stringify({ status, notes }),
  });
  if (r.status !== 200) {
    setInlineStatus("mobileActionStatus", "Ошибка сохранения результата", "error");
    return log(r);
  }
  await loadSecurity();
  await loadSecurityAlerts();
  await loadMobileReadiness();
  setInlineStatus("mobileActionStatus", "Результат проверки сохранен", "ok");
  log({ status: 200, message: "Результат проверки мобильного сценария сохранен", smokeStatus: status });
}

async function loadContentIngestion() {
  const r = await req("/admin/security/content-ingestion");
  if (r.status !== 200) {
    log(r);
    return false;
  }
  const target = document.getElementById("contentIngestionSummary");
  if (target) {
    target.textContent = "Готовность загрузки контента: " + ((r.body || {}).level || "неизвестно") +
      ", паков=" + ((r.body || {}).packFiles || 0) +
      ", валидных JSON=" + ((r.body || {}).validJsonFiles || 0) +
      ", ошибок разбора=" + ((r.body || {}).parseErrorCount || 0) +
      ((r.body || {}).latestPackAt ? ", latest=" + (r.body || {}).latestPackAt : "");
  }
  log({ status: 200, message: "Готовность загрузки контента обновлена", level: (r.body || {}).level || "неизвестно" });
  return true;
}

async function loadContentQaSummary() {
  const status = document.getElementById("contentQaStatus");
  if (status) {
    status.textContent = "QA workflow загружается...";
    status.classList.remove("ok", "error", "info");
    status.classList.add("info");
  }
  const r = await req("/content/qa/summary");
  if (r.status !== 200) {
    if (status) {
      status.textContent = "Не удалось загрузить QA workflow.";
      status.classList.remove("ok", "info");
      status.classList.add("error");
    }
    return log(r);
  }
  renderContentQaSummary(r.body || {});
  if (status) {
    status.textContent = "QA workflow обновлён.";
    status.classList.remove("error", "info");
    status.classList.add("ok");
  }
  log({ status: 200, message: "QA workflow контента обновлён" });
}

function setContentQaEditStatus(message, kind = "info") {
  setInlineStatus("contentQaEditStatus", message, kind);
}

function csvList(id) {
  return (document.getElementById(id)?.value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function contentErrorMessage(body, fallback) {
  const detail = body && body.detail;
  if (typeof detail === "string") return detail;
  if (detail && typeof detail.messageRu === "string") {
    const missing = Array.isArray(detail.missingFields) && detail.missingFields.length
      ? " Не хватает: " + detail.missingFields.join(", ")
      : "";
    return detail.messageRu + missing;
  }
  if (body && typeof body.messageRu === "string") return body.messageRu;
  if (body && typeof body.error === "string") return body.error;
  return fallback;
}

async function saveContentSource() {
  const title = (document.getElementById("contentSourceTitle")?.value || "").trim();
  if (!title) {
    setContentQaEditStatus("Укажите название источника.", "error");
    return;
  }
  setContentQaEditStatus("Источник сохраняется...", "info");
  const payload = {
    id: (document.getElementById("contentSourceId")?.value || "").trim() || undefined,
    titleRu: title,
    organizationRu: (document.getElementById("contentSourceOrg")?.value || "").trim() || undefined,
    url: (document.getElementById("contentSourceUrl")?.value || "").trim() || undefined,
    licenseStatus: document.getElementById("contentSourceLicense")?.value || "unknown",
    usageRu: (document.getElementById("contentSourceUsage")?.value || "").trim() || undefined,
  };
  const r = await req("/content/qa/sources", { method: "POST", body: JSON.stringify(payload) });
  if (r.status !== 200) {
    setContentQaEditStatus(contentErrorMessage(r.body, "Не удалось сохранить источник."), "error");
    return log(r);
  }
  if (r.body && r.body.id) {
    const sourceId = document.getElementById("contentSourceId");
    const blockSources = document.getElementById("contentBlockSources");
    if (sourceId) sourceId.value = r.body.id;
    if (blockSources && !csvList("contentBlockSources").includes(r.body.id)) {
      blockSources.value = csvList("contentBlockSources").concat([r.body.id]).join(", ");
    }
  }
  setContentQaEditStatus("Источник сохранён.", "ok");
  await loadContentQaSummary();
  await loadContentSources();
  await loadContentQueues();
}

async function saveContentBlock() {
  const title = (document.getElementById("contentBlockTitle")?.value || "").trim();
  const body = (document.getElementById("contentBlockBody")?.value || "").trim();
  const section = (document.getElementById("contentBlockSection")?.value || "").trim();
  const topic = (document.getElementById("contentBlockTopic")?.value || "").trim();
  if (!title || !body || !section || !topic) {
    setContentQaEditStatus("Заполните название, текст, раздел и тему блока.", "error");
    return;
  }
  setContentQaEditStatus("Контентный блок сохраняется...", "info");
  const payload = {
    id: (document.getElementById("contentBlockId")?.value || "").trim() || undefined,
    subject: document.getElementById("contentBlockSubject")?.value || "chemistry",
    section,
    topic,
    contentType: document.getElementById("contentBlockType")?.value || "theory",
    titleRu: title,
    bodyRu: body,
    sourceList: csvList("contentBlockSources"),
    licenseStatus: document.getElementById("contentBlockLicense")?.value || "unknown",
    legalStatus: document.getElementById("contentBlockLegal")?.value || "pending",
    verifiedBy: (document.getElementById("contentBlockVerifiedBy")?.value || "").trim() || undefined,
    reviewedBy: (document.getElementById("contentBlockReviewedBy")?.value || "").trim() || undefined,
  };
  const r = await req("/content/qa/blocks", { method: "POST", body: JSON.stringify(payload) });
  if (r.status !== 200) {
    setContentQaEditStatus(contentErrorMessage(r.body, "Не удалось сохранить контентный блок."), "error");
    return log(r);
  }
  if (r.body && r.body.id) {
    const idInput = document.getElementById("contentBlockId");
    const transitionId = document.getElementById("contentTransitionId");
    if (idInput) idInput.value = r.body.id;
    if (transitionId) transitionId.value = r.body.id;
  }
  setContentQaEditStatus("Контентный блок сохранён. Статус: " + contentStatusLabel(r.body?.publishStatus), "ok");
  await loadContentQaSummary();
  await loadContentBlocks();
  await loadContentQueues();
}

async function transitionContentBlock() {
  const contentId = (document.getElementById("contentTransitionId")?.value || "").trim();
  const toStatus = document.getElementById("contentTransitionStatus")?.value || "author_review";
  if (!contentId) {
    setContentQaEditStatus("Укажите ID контентного блока.", "error");
    return;
  }
  setContentQaEditStatus("Статус блока обновляется...", "info");
  const payload = {
    toStatus,
    comment: (document.getElementById("contentTransitionComment")?.value || "").trim() || undefined,
  };
  const r = await req("/content/qa/blocks/" + encodeURIComponent(contentId) + "/transition", { method: "POST", body: JSON.stringify(payload) });
  if (r.status !== 200) {
    setContentQaEditStatus(contentErrorMessage(r.body, "Не удалось перевести статус блока."), "error");
    return log(r);
  }
  setContentQaEditStatus("Статус обновлён: " + contentStatusLabel(r.body?.publishStatus), "ok");
  await loadContentQaSummary();
  await loadContentBlocks();
  await loadContentQueues();
  await loadContentBlockHistory();
}

async function loadContentQueues() {
  const target = document.getElementById("contentQueues");
  if (!target) return;
  target.innerHTML = '<div class="muted">Очереди контента загружаются...</div>';
  const subject = document.getElementById("contentBlockFilterSubject")?.value || "";
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  params.set("limit", "8");
  const r = await req("/content/qa/queues?" + params.toString());
  if (r.status !== 200) {
    target.innerHTML = '<div class="qaBlocked">Не удалось загрузить очереди workflow.</div>';
    return log(r);
  }
  renderContentQueues(r.body || {});
}

function renderContentQueues(data) {
  const target = document.getElementById("contentQueues");
  if (!target) return;
  target.innerHTML = "";
  const note = document.createElement("div");
  note.className = "muted";
  note.textContent = data.noAutopublishGateRu || "Публикация не выполняется автоматически.";
  target.appendChild(note);
  const queues = Array.isArray(data.queues) ? data.queues : [];
  const grid = document.createElement("div");
  grid.className = "contentQueueGrid";
  queues.forEach((queue) => {
    const card = document.createElement("article");
    card.className = "contentQueueCard";
    const title = document.createElement("h4");
    title.textContent = (queue.labelRu || contentStatusLabel(queue.status)) + " · " + Number(queue.count || 0);
    card.appendChild(title);
    const items = Array.isArray(queue.items) ? queue.items : [];
    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "Очередь пуста.";
      card.appendChild(empty);
    } else {
      items.slice(0, 4).forEach((item) => {
        const row = document.createElement("button");
        row.type = "button";
        row.className = "contentQueueItem";
        row.textContent = textValue(item.titleRu) + " · " + textValue(item.nextActionRu);
        row.addEventListener("click", () => fillContentBlockForm(item));
        card.appendChild(row);
      });
    }
    grid.appendChild(card);
  });
  target.appendChild(grid);
}

function selectValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = String(value || "");
}

function fillContentSourceForm(item) {
  if (!item) return;
  selectValue("contentSourceId", item.id);
  selectValue("contentSourceTitle", item.titleRu);
  selectValue("contentSourceOrg", item.organizationRu);
  selectValue("contentSourceUrl", item.url);
  selectValue("contentSourceLicense", item.licenseStatus || "unknown");
  selectValue("contentSourceUsage", item.usageRu);
  const blockSources = document.getElementById("contentBlockSources");
  if (blockSources && item.id && !csvList("contentBlockSources").includes(item.id)) {
    blockSources.value = csvList("contentBlockSources").concat([item.id]).join(", ");
  }
  setContentQaEditStatus("Источник выбран для редактирования: " + textValue(item.id), "info");
}

function fillContentBlockForm(item) {
  if (!item) return;
  selectValue("contentBlockId", item.id);
  selectValue("contentBlockSubject", item.subject || "chemistry");
  selectValue("contentBlockSection", item.section);
  selectValue("contentBlockTopic", item.topic);
  selectValue("contentBlockType", item.contentType || "theory");
  selectValue("contentBlockTitle", item.titleRu);
  selectValue("contentBlockBody", item.bodyRu);
  selectValue("contentBlockSources", Array.isArray(item.sourceList) ? item.sourceList.join(", ") : "");
  selectValue("contentBlockLicense", item.licenseStatus || "unknown");
  selectValue("contentBlockLegal", item.legalStatus || "pending");
  selectValue("contentBlockVerifiedBy", item.verifiedBy);
  selectValue("contentBlockReviewedBy", item.reviewedBy);
  selectValue("contentTransitionId", item.id);
  selectValue("contentHistoryId", item.id);
  setContentQaEditStatus("Контентный блок выбран для редактирования: " + textValue(item.id), "info");
}

async function loadContentSources() {
  const status = document.getElementById("contentSourcesStatus");
  if (status) setInlineStatus("contentSourcesStatus", "Источники загружаются...", "info");
  const params = new URLSearchParams();
  const q = (document.getElementById("contentSourceSearch")?.value || "").trim();
  const license = document.getElementById("contentSourceFilterLicense")?.value || "";
  if (q) params.set("q", q);
  if (license) params.set("licenseStatus", license);
  params.set("limit", "50");
  const r = await req("/content/qa/sources?" + params.toString());
  if (r.status !== 200) {
    setInlineStatus("contentSourcesStatus", contentErrorMessage(r.body, "Не удалось загрузить источники."), "error");
    return log(r);
  }
  renderContentSources(r.body || {});
}

function renderContentSources(data) {
  const tbody = document.getElementById("contentSourcesTbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  const rows = Array.isArray(data.items) ? data.items : [];
  setInlineStatus("contentSourcesStatus", "Найдено источников: " + Number(data.total || rows.length || 0), "ok");
  if (!rows.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 4;
    td.textContent = "Источники не найдены.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }
  rows.forEach((item) => {
    const tr = document.createElement("tr");
    [textValue(item.id), textValue(item.titleRu), licenseLabel(item.licenseStatus)].forEach((value) => {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    });
    const actionTd = document.createElement("td");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Выбрать";
    btn.addEventListener("click", () => fillContentSourceForm(item));
    actionTd.appendChild(btn);
    tr.appendChild(actionTd);
    tbody.appendChild(tr);
  });
}

async function loadContentBlocks() {
  const status = document.getElementById("contentBlocksStatus");
  if (status) setInlineStatus("contentBlocksStatus", "Контентные блоки загружаются...", "info");
  const params = new URLSearchParams();
  const q = (document.getElementById("contentBlockSearch")?.value || "").trim();
  const subject = document.getElementById("contentBlockFilterSubject")?.value || "";
  const publishStatus = document.getElementById("contentBlockFilterStatus")?.value || "";
  if (q) params.set("q", q);
  if (subject) params.set("subject", subject);
  if (publishStatus) params.set("publishStatus", publishStatus);
  params.set("limit", "50");
  const r = await req("/content/qa/blocks?" + params.toString());
  if (r.status !== 200) {
    setInlineStatus("contentBlocksStatus", contentErrorMessage(r.body, "Не удалось загрузить контентные блоки."), "error");
    return log(r);
  }
  renderContentBlocks(r.body || {});
}

async function loadContentBlockHistory() {
  const contentId = (document.getElementById("contentHistoryId")?.value || document.getElementById("contentTransitionId")?.value || "").trim();
  if (!contentId) {
    setInlineStatus("contentHistoryStatus", "Укажите ID контентного блока.", "error");
    return;
  }
  setInlineStatus("contentHistoryStatus", "История QA загружается...", "info");
  const r = await req("/content/qa/blocks/" + encodeURIComponent(contentId) + "/events?limit=50");
  if (r.status !== 200) {
    setInlineStatus("contentHistoryStatus", contentErrorMessage(r.body, "Не удалось загрузить историю QA."), "error");
    return log(r);
  }
  renderContentBlockHistory(r.body || {});
}

function renderContentBlockHistory(data) {
  const tbody = document.getElementById("contentHistoryTbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  const rows = Array.isArray(data.items) ? data.items : [];
  setInlineStatus("contentHistoryStatus", rows.length ? "История загружена: " + rows.length + " событий." : "Для блока пока нет событий workflow.", rows.length ? "ok" : "info");
  if (!rows.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.textContent = "История переходов пока пустая.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }
  rows.forEach((item) => {
    const tr = document.createElement("tr");
    [
      textValue(item.createdAt),
      contentStatusLabel(item.fromStatus),
      contentStatusLabel(item.toStatus),
      textValue(item.actor),
      textValue(item.comment, "-"),
    ].forEach((value) => {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function renderContentBlocks(data) {
  const tbody = document.getElementById("contentBlocksTbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  const rows = Array.isArray(data.items) ? data.items : [];
  setInlineStatus("contentBlocksStatus", "Найдено блоков: " + Number(data.total || rows.length || 0), "ok");
  if (!rows.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.textContent = "Контентные блоки не найдены.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }
  rows.forEach((item) => {
    const tr = document.createElement("tr");
    [textValue(item.id), textValue(item.titleRu), subjectLabel(item.subject), contentStatusLabel(item.publishStatus)].forEach((value) => {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    });
    const actionTd = document.createElement("td");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Выбрать";
    btn.addEventListener("click", () => fillContentBlockForm(item));
    actionTd.appendChild(btn);
    tr.appendChild(actionTd);
    tbody.appendChild(tr);
  });
}

function renderContentQaSummary(data) {
  const counts = data.statusCounts || {};
  const countsTarget = document.getElementById("contentQaCounts");
  if (countsTarget) {
    const entries = Object.entries(counts);
    countsTarget.textContent = entries.length
      ? entries.map(([key, value]) => contentStatusLabel(key) + ": " + value).join(" · ")
      : "Контентные блоки пока не заведены.";
  }

  const gate = document.getElementById("contentQaGate");
  if (gate) {
    const required = Array.isArray(data.requiredMetadata) ? data.requiredMetadata : [];
    gate.textContent = textValue(data.publishGateRu, "Контент нельзя публиковать без источников, лицензии и проверки.") +
      (required.length ? " Обязательные поля: " + required.slice(0, 8).join(", ") + (required.length > 8 ? "..." : "") : "");
  }

  const tbody = document.getElementById("contentQaTbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  const rows = Array.isArray(data.latestBlocks) ? data.latestBlocks : [];
  if (!rows.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 7;
    td.textContent = "Контентные блоки пока не заведены.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }
  rows.forEach((item) => {
    const tr = document.createElement("tr");
    const ready = Boolean(item.publishGate && item.publishGate.ready);
    const cells = [
      textValue(item.id),
      textValue(item.titleRu),
      subjectLabel(item.subject),
      textValue(item.topic),
      contentStatusLabel(item.publishStatus),
      ready ? "Готово" : "Не хватает: " + ((item.publishGate?.missingFields || []).join(", ") || "metadata"),
    ];
    cells.forEach((value, idx) => {
      const td = document.createElement("td");
      td.textContent = value;
      if (idx === 5) td.className = ready ? "qaReady" : "qaBlocked";
      tr.appendChild(td);
    });
    const actionTd = document.createElement("td");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Выбрать";
    btn.addEventListener("click", () => fillContentBlockForm(item));
    actionTd.appendChild(btn);
    tr.appendChild(actionTd);
    tbody.appendChild(tr);
  });
}

function contentStatusLabel(status) {
  return {
    draft: "Черновик",
    author_review: "Автор",
    scientific_review: "Научред",
    methodist_review: "Методист",
    content_qa: "Content QA",
    legal_review: "Юридическая проверка",
    published: "Опубликовано",
    archived: "Архив",
  }[String(status || "")] || textValue(status, "Не указан");
}

function licenseLabel(status) {
  return {
    owned_or_commissioned: "Собственный / заказной",
    open_license: "Открытая лицензия",
    reference_only: "Reference only",
    approved: "Одобрено",
    unknown: "Требует проверки",
  }[String(status || "")] || textValue(status, "Не указана");
}

function subjectLabel(subject) {
  return {
    chemistry: "Химия",
    physics: "Физика",
    biology: "Биология",
    ai_mentor: "AI-помощник",
  }[String(subject || "")] || textValue(subject);
}

function renderGoNoGo(data) {
  const target = document.getElementById("goNoGoSummary");
  if (!target) return;
  const status = String((data || {}).status || "no-go").toLowerCase();
  const passed = Number((data || {}).passedGates || 0);
  const total = Number((data || {}).totalGates || 0);
  const blockers = Array.isArray((data || {}).blockers) ? (data || {}).blockers : [];
  target.textContent = status === "go"
    ? "Релизный статус: GO | пройдено гейтов " + passed + "/" + total
    : "Релизный статус: NO-GO | блокеры: " + (blockers.length ? blockers.join(", ") : "не определены") + " | " + passed + "/" + total;
  target.classList.remove("ok", "error", "info");
  target.classList.add(status === "go" ? "ok" : "error");

  const actionSummary = document.getElementById("goNoGoActionSummary");
  const actions = Array.isArray((data || {}).nextActions) ? (data || {}).nextActions : [];
  if (actionSummary) {
    if (!actions.length) {
      actionSummary.textContent = "Приоритетные действия: не требуются, все гейты пройдены.";
    } else {
      actionSummary.textContent = "Приоритетные действия: " + actions.map((a) =>
        (a.priority || "P3") + " " + (a.gate || "гейт") + " — " + (a.action || "обновите evidence")
      ).join(" | " );
    }
  }

  const legalLink = document.getElementById("legalGoNoGoLink");
  if (legalLink) {
    const gates = Array.isArray((data || {}).gates) ? (data || {}).gates : [];
    const legalGate = gates.find((g) => String(g.key || "") === "legal_compliance") || null;
    if (legalGate) {
      legalLink.textContent = legalGate.ok
        ? "Go/No-Go legal gate: GO (юридический комплаенс в норме)."
        : "Go/No-Go legal gate: NO-GO | " + (legalGate.action || legalGate.note || "требуется закрытие legal-гейта");
    }
  }
}

function renderGoNoGoGates(data) {
  const tbody = document.getElementById("goNoGoGatesTbody");
  if (!tbody) return;
  const gates = Array.isArray((data || {}).gates) ? (data || {}).gates : [];
  tbody.innerHTML = "";
  for (const gate of gates) {
    const tr = document.createElement("tr");
    const status = gate.ok ? "OK" : "Блокер";
    tr.innerHTML =
      "<td>" + (gate.title || gate.key || "-") + "</td>" +
      "<td>" + (gate.priority || "P3") + "</td>" +
      "<td>" + status + "</td>" +
      "<td>" + String(gate.value || "-") + "</td>" +
      "<td>" + (gate.action || gate.note || "-") + "</td>" +
      "<td>" + (gate.owner || "-") + "</td>";
    tbody.appendChild(tr);
  }
}

function renderGoNoGoHistory(data) {
  const summary = document.getElementById("goNoGoHistorySummary");
  const tbody = document.getElementById("goNoGoHistoryTbody");
  const rows = Array.isArray((data || {}).history) ? (data || {}).history : [];
  if (summary) {
    const latest = rows[0] || {};
    const latestStatus = String(latest.status || (data || {}).latestStatus || "нет данных").toUpperCase();
    const latestAt = latest.recordedAt || (data || {}).latestRecordedAt || "нет данных";
    summary.textContent = "История go/no-go: записей " + rows.length + ", последний статус: " + latestStatus + ", время: " + latestAt;
  }
  if (!tbody) return;
  tbody.innerHTML = "";
  for (const row of rows) {
    const blockers = Array.isArray(row.blockers) ? row.blockers : [];
    const tr = document.createElement("tr");
    tr.innerHTML =
      "<td>" + (row.recordedAt || "-") + "</td>" +
      "<td>" + String(row.status || "no-go").toUpperCase() + "</td>" +
      "<td>" + String(row.passedGates || 0) + "/" + String(row.totalGates || 0) + "</td>" +
      "<td>" + (blockers.length ? blockers.join("; ") : "-") + "</td>";
    tbody.appendChild(tr);
  }
}

async function loadGoNoGoHistory() {
  const r = await req("/admin/security/go-no-go/history?limit=10");
  if (r.status !== 200) {
    setInlineStatus("runbookActionStatus", "Не удалось загрузить историю go/no-go", "error");
    return log(r);
  }
  renderGoNoGoHistory(r.body || {});
  return true;
}

async function loadGoNoGo() {
  const r = await req("/admin/security/go-no-go");
  if (r.status !== 200) return log(r);
  renderGoNoGo(r.body || {});
  renderGoNoGoGates(r.body || {});
  await loadGoNoGoHistory();
  log({ status: 200, message: "Go/No-Go рассчитан", releaseStatus: (r.body || {}).status });
}

async function refreshMobileReadinessManual() {
  const ok = await loadMobileReadiness();
  setInlineStatus("mobileActionStatus", ok ? "Готовность мобильного приложения обновлена" : "Ошибка проверки мобильного приложения", ok ? "ok" : "error");
}

async function refreshContentIngestionManual() {
  const ok = await loadContentIngestion();
  setInlineStatus("mobileActionStatus", ok ? "Готовность загрузки контента обновлена" : "Ошибка проверки загрузки контента", ok ? "ok" : "error");
}

function renderSecurityAlerts(alertsData) {
  const summary = document.getElementById("securityAlertsSummary");
  const tbody = document.getElementById("securityAlertsTbody");
  const codeInput = document.getElementById("securityAlertCode");
  const rows = (alertsData || {}).alerts || [];

  if (summary) {
    summary.textContent = rows.length
      ? "Алертов: " + rows.length + " | " + rows.map((a) => (a.title || "") + " (" + (a.value || "") + ")").join("; ")
      : "Алертов нет";
  }

  if (!tbody) return;
  tbody.innerHTML = "";
  for (const a of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td>' + (a.code || "") + '</td>' +
      '<td>' + (a.severity || "") + '</td>' +
      '<td>' + (a.title || "") + '</td>' +
      '<td>' + (a.acknowledged ? "Подтвержден" : "Требует реакции") + '</td>' +
      '<td>' + (a.ackBy || "-") + '</td>' +
      '<td>' + (a.ackAt || "-") + '</td>';
    tbody.appendChild(tr);
  }

  if (codeInput && !codeInput.value && rows.length) {
    codeInput.value = rows[0].code || "";
  }

  securityMobileState.alerts = String(rows.length || 0);
  renderMobileSecuritySummary();
}

async function loadSecurityAlerts() {
  const acked = (document.getElementById("securityAlertAckFilter") || {}).value || "all";
  const severity = (document.getElementById("securityAlertSeverityFilter") || {}).value || "all";
  const q = "?acked=" + encodeURIComponent(acked) + "&severity=" + encodeURIComponent(severity);
  const r = await req("/admin/security/alerts" + q);
  if (r.status !== 200) {
    setInlineStatus("alertsActionStatus", "Не удалось обновить алерты", "error");
    return log(r);
  }
  renderSecurityAlerts(r.body || {});
  writeStateToUrl();
  setInlineStatus("alertsActionStatus", "Алерты обновлены", "ok");
  log({
    status: 200,
    message: "Алерты безопасности обновлены",
    count: (r.body || {}).alertCount || 0,
    acked,
    severity,
  });
}

async function ackSecurityAlert(acknowledged) {
  const code = (document.getElementById("securityAlertCode").value || "").trim();
  const comment = (document.getElementById("securityAlertComment").value || "").trim();
  if (!code) return log({ status: 400, error: "Укажите код алерта" });

  const r = await req("/admin/security/alerts/ack", {
    method: "POST",
    body: JSON.stringify({ code, acknowledged, comment }),
  });
  if (r.status !== 200) {
    setInlineStatus("alertsActionStatus", "Ошибка изменения подтверждения", "error");
    return log(r);
  }
  await loadSecurityAlerts();
  await loadSecurity();
  setInlineStatus("alertsActionStatus", acknowledged ? "Алерт подтвержден" : "Подтверждение снято", "ok");
  log({ status: 200, message: acknowledged ? "Алерт подтвержден" : "Подтверждение снято", code });
}

function getSecurityDateRangeQuery() {
  const from = (document.getElementById("securityDateFrom") || {}).value || "";
  const to = (document.getElementById("securityDateTo") || {}).value || "";
  let q = "";
  if (from) q += "&fromDate=" + encodeURIComponent(from);
  if (to) q += "&toDate=" + encodeURIComponent(to);
  return { from, to, query: q };
}

function formatDateTimeLocal(value) {
  const dt = new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  return dt.getFullYear() + "-" + pad(dt.getMonth() + 1) + "-" + pad(dt.getDate()) + "T" + pad(dt.getHours()) + ":" + pad(dt.getMinutes());
}

function applySecurityPreset(hours) {
  const now = new Date();
  const from = new Date(now.getTime() - (hours * 60 * 60 * 1000));
  const fromInput = document.getElementById("securityDateFrom");
  const toInput = document.getElementById("securityDateTo");
  if (fromInput) fromInput.value = formatDateTimeLocal(from);
  if (toInput) toInput.value = formatDateTimeLocal(now);
  loadBackupDryRunHistory();
}

function applySelectedPeriod() {
  const selected = (document.getElementById("securityPreset").value || "24").trim();
  if (selected === "custom") {
    return loadBackupDryRunHistory();
  }
  const hours = Number(selected);
  if (!Number.isFinite(hours) || hours <= 0) return log("Не удалось применить период");
  applySecurityPreset(hours);
}

async function resetSecurityFilters() {
  const mode = document.getElementById("securityExportMode");
  const from = document.getElementById("securityDateFrom");
  const to = document.getElementById("securityDateTo");
  const preset = document.getElementById("securityPreset");
  const ack = document.getElementById("securityAlertAckFilter");
  const severity = document.getElementById("securityAlertSeverityFilter");
  if (mode) mode.value = "all";
  if (from) from.value = "";
  if (to) to.value = "";
  if (preset) preset.value = "24";
  if (ack) ack.value = "all";
  if (severity) severity.value = "all";
  writeStateToUrl();
  await loadBackupDryRunHistory();
  await loadSecurityAlerts();
  setInlineStatus("alertsActionStatus", "Фильтры безопасности сброшены", "info");
  setInlineStatus("restoreActionStatus", "Применен период по умолчанию", "info");
  setActionStatus("Фильтры безопасности сброшены", "info");
}

async function exportSecurityJson() {
  const mode = (document.getElementById("securityExportMode") || {}).value || "all";
  const range = getSecurityDateRangeQuery();
  const r = await req("/admin/security/export.json?limit=50&mode=" + encodeURIComponent(mode) + range.query);
  if (r.status !== 200) {
    log(r);
    return false;
  }
  writeStateToUrl();
  const blob = new Blob([JSON.stringify(r.body || {}, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "admin-security-audit.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  log({ status: 200, message: "Технический отчет безопасности выгружен", mode, fromDate: range.from || null, toDate: range.to || null });
  return true;
}

async function exportSecurityCsv() {
  const mode = (document.getElementById("securityExportMode") || {}).value || "all";
  const range = getSecurityDateRangeQuery();
  const response = await fetch(base + "/admin/security/export.csv?limit=50&mode=" + encodeURIComponent(mode) + range.query, { headers: h() });
  if (!response.ok) {
    const txt = await response.text();
    log({ status: response.status, error: txt });
    return false;
  }
  const blob = await response.blob();
  writeStateToUrl();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "admin-security-audit.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  log({ status: 200, message: "Табличный отчет безопасности выгружен", mode, fromDate: range.from || null, toDate: range.to || null });
  return true;
}

async function exportSecurityByFormat() {
  const fmt = (document.getElementById("securityExportFormat").value || "json").trim().toLowerCase();
  if (fmt === "csv") {
    const result = await exportSecurityCsv();
    setInlineStatus("exportActionStatus", result ? "Табличный отчет выгружен" : "Ошибка выгрузки табличного отчета", result ? "ok" : "error");
    return result;
  }
  const result = await exportSecurityJson();
  setInlineStatus("exportActionStatus", result ? "Технический отчет выгружен" : "Ошибка выгрузки технического отчета", result ? "ok" : "error");
  return result;
}

async function loadSecurityActions() {
  const r = await req("/admin/security/actions");
  if (r.status !== 200) return log(r);
  const tbody = document.getElementById("securityActionsTbody");
  tbody.innerHTML = "";
  const actions = r.body.actions || [];
  for (const a of actions) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td>' + (a.title || "") + '</td>' +
      '<td>' + (a.ready ? "OK" : "Нужно сделать") + '</td>' +
      '<td>' + (a.command || "") + '</td>' +
      '<td>' + (a.owner || "-") + '</td>' +
      '<td>' + (a.sla || "-") + '</td>' +
      '<td>' + (a.note || "") + '</td>';
    tbody.appendChild(tr);
  }
  log({ status: 200, message: "Практические действия обновлены", ready: r.body.readyActions, total: r.body.totalActions });
}

async function loadBackupDryRunHistory() {
  const range = getSecurityDateRangeQuery();
  const r = await req("/admin/security/backup-dry-run/history?limit=10" + range.query);
  if (r.status !== 200) {
    setInlineStatus("restoreActionStatus", "Не удалось загрузить историю", "error");
    return log(r);
  }
  writeStateToUrl();
  const summary = document.getElementById("backupDryRunHistorySummary");
  const trend = document.getElementById("backupDryRunTrendSummary");
  const tbody = document.getElementById("backupDryRunHistoryTbody");
  const rows = r.body.history || [];

  if (summary) {
    summary.textContent = "Запусков: " + (r.body.totalRuns || 0) +
      ((r.body.lastSuccessAt ? ", последний успех: " + r.body.lastSuccessAt : ", успешных запусков пока нет")) +
      ((r.body.lastFailedReason ? ", последняя ошибка: " + r.body.lastFailedReason : "") ) +
      ((range.from || range.to) ? ", период: " + (range.from || "...") + " -> " + (range.to || "...") : "");
  }
  securityMobileState.range = (range.from || "...") + " -> " + (range.to || "...");

  if (trend) {
    trend.textContent = "Тренд: ok=" + (r.body.okRuns || 0) +
      ", ошибок=" + (r.body.failedRuns || 0) +
      ", процент успеха=" + (r.body.successRate == null ? "нет данных" : (r.body.successRate + "%"));
  }
  securityMobileState.trend = (r.body.okRuns || 0) + "/" + (r.body.failedRuns || 0) +
    " (" + (r.body.successRate == null ? "нет данных" : (r.body.successRate + "%")) + ")";
  renderMobileSecuritySummary();

  if (!tbody) return;
  tbody.innerHTML = "";
  for (const row of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td>' + (row.finishedAt || row.startedAt || "-") + '</td>' +
      '<td>' + ((row.status || "") === "ok" ? "OK" : "Ошибка") + '</td>' +
      '<td>' + (row.error || "-") + '</td>';
    tbody.appendChild(tr);
  }
}

function renderBackupDryRunStatus(data) {
  const target = document.getElementById("backupDryRunSummary");
  const tbody = document.getElementById("backupDryRunChecksTbody");
  if (!target) return;
  if (!data || data.exists === false) {
    target.textContent = "Тест восстановления еще не запускался";
    if (tbody) tbody.innerHTML = "";
    securityMobileState.dryRun = "не запускался";
    renderMobileSecuritySummary();
    return;
  }
  target.textContent = "Тест восстановления: " + dryRunStatusLabel(data.status) +
    (data.finishedAt ? ", завершен: " + data.finishedAt : "") +
    (data.error ? ", ошибка: " + data.error : "");
  securityMobileState.dryRun = dryRunStatusLabel(data.status);
  renderMobileSecuritySummary();

  if (!tbody) return;
  tbody.innerHTML = "";
  const evidence = data.evidence || [];
  for (const item of evidence) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      "<td>" + (item.label || item.key || "") + "</td>" +
      "<td>" + (item.ok ? "OK" : "Проблема") + "</td>" +
      "<td>" + String(item.value) + "</td>";
    tbody.appendChild(tr);
  }
}

async function loadBackupDryRunStatus() {
  const r = await req("/admin/security/backup-dry-run");
  if (r.status !== 200) {
    setInlineStatus("restoreActionStatus", "Не удалось загрузить состояние", "error");
    return log(r);
  }
  renderBackupDryRunStatus(r.body || {});
  loadBackupDryRunHistory();
  setInlineStatus("restoreActionStatus", "Состояние теста восстановления обновлено", "ok");
  log({ status: 200, message: "Состояние теста восстановления обновлено", state: dryRunStatusLabel((r.body || {}).status) });
}

async function runBackupDryRun() {
  const r = await req("/admin/security/backup-dry-run/run", { method: "POST", body: JSON.stringify({}) });
  if (r.status !== 200) {
    setInlineStatus("restoreActionStatus", "Ошибка запуска теста восстановления", "error");
    return log(r);
  }
  renderBackupDryRunStatus(r.body || {});
  loadBackupDryRunHistory();
  setInlineStatus("restoreActionStatus", "Тест восстановления выполнен", "ok");
  log({ status: 200, message: "Тест восстановления выполнен", result: dryRunStatusLabel((r.body || {}).status) });
}

async function executeRestoreAction() {
  const action = (document.getElementById("restoreAction").value || "run").trim();
  if (action === "status") return loadBackupDryRunStatus();
  if (action === "history") return loadBackupDryRunHistory();
  return runBackupDryRun();
}

bindClick("btnCode", requestCode);
bindClick("btnLogin", login);
bindClick("btnAdminLogin", loginByPassword);
bindClick("btnUsers", async () => { state.usersOffset = 0; await loadUsers(); });
bindClick("btnCreateUser", createUser);
bindClick("btnSetRole", setRoleForSelected);
bindClick("btnUsersPrev", async () => { state.usersOffset = Math.max(0, state.usersOffset - pageSize); await loadUsers(); });
bindClick("btnUsersNext", async () => { state.usersOffset += pageSize; await loadUsers(); });
bindClick("btnGrant", grant);
bindClick("btnRevoke", revoke);
bindClick("btnKpi", loadKpi);
bindClick("btnGrantAccess", grantAccessForSelected);
bindClick("btnSchoolsOverview", loadSchoolsOverview);
bindClick("btnCreateSchool", createSchool);
bindClick("btnCreateSchoolClass", createSchoolClass);
bindClick("btnLoadSchoolClasses", loadSchoolClasses);
bindClick("btnCreateInvite", createSchoolInvite);
bindClick("btnLoadInvites", loadSchoolInvites);
bindClick("btnExportStudentCodesCsv", () => exportStudentCodes("csv"));
bindClick("btnExportStudentCodesXls", () => exportStudentCodes("xls"));
bindClick("btnBulkPreview", () => runBulk(true));
bindClick("btnBulkApply", () => runBulk(false));
bindClick("btnScope", saveScope);
bindClick("btnMatrix", loadMatrix);
bindClick("btnAudit", async () => { state.auditOffset = 0; await loadAudit(); });
bindClick("btnAuditPrev", async () => { state.auditOffset = Math.max(0, state.auditOffset - pageSize); await loadAudit(); });
bindClick("btnAuditNext", async () => { state.auditOffset += pageSize; await loadAudit(); });
bindClick("btnAuditCsv", exportAuditCsv);
bindClick("btnSecurity", loadSecurity);
bindClick("btnSecurityActions", loadSecurityActions);
bindClick("btnGoNoGo", loadGoNoGo);
bindClick("btnGoNoGoHistory", loadGoNoGoHistory);
bindClick("btnMorningCheck", runMorningCheck);
bindClick("btnIncidentCheck", runIncidentCheck);
bindClick("btnSecurityAutoRefresh", toggleSecurityAutorefresh);
bindClick("btnMobileReadiness", refreshMobileReadinessManual);
bindClick("btnMobileSmokeSave", saveMobileSmoke);
bindClick("btnContentIngestion", refreshContentIngestionManual);
bindClick("btnContentQaSummary", loadContentQaSummary);
bindClick("btnContentSourceSave", saveContentSource);
bindClick("btnContentBlockSave", saveContentBlock);
bindClick("btnContentTransition", transitionContentBlock);
bindClick("btnContentSourcesSearch", loadContentSources);
bindClick("btnContentBlocksSearch", loadContentBlocks);
bindClick("btnContentHistoryLoad", loadContentBlockHistory);
bindClick("btnSecurityAlerts", loadSecurityAlerts);
bindClick("btnSecurityAck", () => ackSecurityAlert(true));
bindClick("btnSecurityUnack", () => ackSecurityAlert(false));
bindChange("securityAlertAckFilter", loadSecurityAlerts);
bindChange("securityAlertSeverityFilter", loadSecurityAlerts);
bindClick("btnRestoreAction", executeRestoreAction);
bindClick("btnSecurityExport", exportSecurityByFormat);
bindChange("securityDateFrom", loadBackupDryRunHistory);
bindChange("securityDateTo", loadBackupDryRunHistory);
bindClick("btnApplyPeriod", applySelectedPeriod);
bindClick("btnSecurityResetFilters", resetSecurityFilters);
bindClick("btnShortcuts", openShortcutsModal);
bindClick("btnCloseShortcuts", closeShortcutsModal);
bindClick("btnOpenGuide", openGuideModal);
bindClick("btnLegalComplianceRefresh", loadLegalComplianceStatus);
bindClick("btnLegalComplianceHistory", loadLegalComplianceHistory);
bindClick("btnCloseGuide", closeGuideModal);
bindClick("btnGuidePrint", openPrintableGuide);
bindClick("btnSaveHandover", saveHandover);
bindClick("btnExportHandover", exportHandover);
bindClick("btnArchiveHandover", () => archiveHandover(false));
bindClick("btnExportHandoverArchiveCsv", exportHandoverArchiveCsv);
bindClick("btnOpenAuth", openAuthModal);
bindClick("btnCloseAuth", closeAuthModal);
bindClick("btnLogout", logout);
bindClick("btnCompactMode", toggleCompactMode);
document.getElementById("authOverlay")?.addEventListener("click", (event) => {
  if (event.target && event.target.id === "authOverlay") {
    closeAuthModal();
  }
});
document.getElementById("shortcutsOverlay")?.addEventListener("click", (event) => {
  if (event.target && event.target.id === "shortcutsOverlay") {
    closeShortcutsModal();
  }
});
document.getElementById("guideOverlay")?.addEventListener("click", (event) => {
  if (event.target && event.target.id === "guideOverlay") {
    closeGuideModal();
  }
});

document.addEventListener("keydown", (event) => {
  const target = event.target;
  const tag = target && target.tagName ? String(target.tagName).toLowerCase() : "";
  const isTyping = tag === "input" || tag === "textarea" || tag === "select" || (target && target.isContentEditable);
  if (event.key === "Escape") {
    closeShortcutsModal();
    closeGuideModal();
    closeAuthModal();
    return;
  }
  if (isTyping) return;
  if (event.key === "/") {
    event.preventDefault();
    focusCurrentViewSearch();
    return;
  }
  if (event.altKey && [1, 2, 3, 4, 5, 6, 7, 8, 9].includes(Number(event.key))) {
    event.preventDefault();
    const map = {
      1: "home",
      2: "schools",
      3: "users",
      4: "subscriptions",
      5: "content",
      6: "ai",
      7: "security",
      8: "audit",
      9: "docs",
    };
    const view = map[Number(event.key)] || "users";
    switchView(view);
  }
});

readStateFromUrl();
initViews();
initSchoolTabs();
initUserCardTabs();
initMobileCollapses();
initCompactMode();
initSecurityAutorefresh();
initHandoverForm();
bindLegalComplianceActions();
initRightsBadgeSlogan();
renderMobileSecuritySummary();
loadOptions();

if (token) {
  document.getElementById("authMsg").textContent = "Токен восстановлен";
  setAuthorized(true);
  closeAuthModal();
  loadWorkspace();
} else {
  setAuthorized(false);
}
