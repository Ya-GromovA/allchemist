# Stage 17: CI/CD Baseline

Дата фиксации: 2026-05-28

Цель этапа: добавить проверяемый CI/CD baseline в проект, чтобы backend/web/mobile/ops gates запускались одинаково в pull request и перед production release.

## Добавленные workflow

1. `.github/workflows/ci.yml`
   - backend contract regression с PostgreSQL service;
   - syntax compile ключевых backend файлов;
   - public/admin web `node --check`;
   - ops tools `bash -n` и `python -m py_compile`;
   - mobile `npm ci` и `npx tsc --noEmit`.
2. `.github/workflows/production-release-gate.yml`
   - manual `workflow_dispatch` gate;
   - требует `apk_version`;
   - проверяет `content_packs/allchemist-apk-latest.json` и наличие APK artifact;
   - запускает release regression и web/ops syntax checks.

## Что это закрывает

1. В репозитории появляется baseline CI вместо устного runbook.
2. PR/push проверки покрывают текущие критичные контракты auth/content/public web/mobile typecheck.
3. Production release gate становится повторяемым и metadata-driven для APK.

## Что остаётся внешним

1. Нужно подключить эти workflow в реальном GitHub/GitLab репозитории.
2. Нужно завести repository secrets для будущих provider checks.
3. Нужен реальный dev/stage/prod promotion с protected environments.
4. Production deploy по SSH не добавлен намеренно: без repository secrets и protected environments это небезопасно.

## Проверки Stage 17

1. Workflow-файлы синтаксически читаются как YAML.
2. Проверены ключевые команды локально на сервере:
   - backend regression;
   - web `node --check`;
   - ops scripts syntax;
   - Stage 15 hardening gate.
