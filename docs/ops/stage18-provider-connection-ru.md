# Stage 18: Real VCS Provider Connection

Дата фиксации: 2026-05-28

Цель: подключить CI/CD workflow к реальному GitHub/GitLab provider, repository secrets и protected `dev/stage/prod` environments.

## Фактический blocker

На текущем production host:

1. `/root/synapse` не является git repository: `fatal: not a git repository`.
2. Git remote отсутствует.
3. `gh`/`glab` не установлены или не авторизованы.
4. Provider token/repository owner доступ не передан.

Поэтому реальное подключение к GitHub/GitLab сейчас невозможно без внешнего доступа. Это не должно быть отмечено как `СДЕЛАНО И ПРОВЕРЕНО`.

## Добавленная автоматизация

Добавлен скрипт `/root/synapse/tools/github_provider_setup.py`.

Он умеет:

1. Создавать GitHub environments `dev`, `stage`, `prod` через GitHub REST API.
2. Включать branch protection для выбранной ветки.
3. Загружать repository secrets через `gh secret set`.
4. Работать в dry-run по умолчанию.
5. Применять изменения только с `--apply`, `GITHUB_TOKEN` и `GITHUB_REPOSITORY`.

## Dry-run

```bash
GITHUB_REPOSITORY=owner/repo /root/synapse/tools/github_provider_setup.py
```

## Реальное применение

Нужно выполнить на машине, где есть `gh`, доступ к repo и права admin/maintainer:

```bash
export GITHUB_TOKEN=<token-with-repo-admin-access>
export GITHUB_REPOSITORY=owner/repo
export PROD_SSH_HOST=<prod-host>
export PROD_SSH_USER=<prod-user>
export PROD_SSH_PRIVATE_KEY=<private-key>
export STAGE_SSH_HOST=<stage-host>
export STAGE_SSH_USER=<stage-user>
export STAGE_SSH_PRIVATE_KEY=<private-key>
/root/synapse/tools/github_provider_setup.py --apply --branch main
```

## Требуемые права token

1. `repo` или fine-grained access к repository administration.
2. Actions secrets write.
3. Environments administration.
4. Branch protection administration.

## Статус

Stage 18 остаётся `ЧАСТИЧНО СДЕЛАНО`: автоматизация и runbook готовы, но реальный provider не подключён из-за отсутствия repository/remote/token/CLI authorization на сервере.
