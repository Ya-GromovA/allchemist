#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import json
import os
import subprocess
import sys
import urllib.request
from dataclasses import dataclass
from typing import Any


REQUIRED_ENVIRONMENTS = ("dev", "stage", "prod")
DEFAULT_SECRET_NAMES = (
    "PROD_SSH_HOST",
    "PROD_SSH_USER",
    "PROD_SSH_PRIVATE_KEY",
    "STAGE_SSH_HOST",
    "STAGE_SSH_USER",
    "STAGE_SSH_PRIVATE_KEY",
)


@dataclass
class GitHubClient:
    repo: str
    token: str
    dry_run: bool

    def request(self, method: str, path: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        url = f"https://api.github.com/repos/{self.repo}{path}"
        if self.dry_run:
            print(json.dumps({"dryRun": True, "method": method, "url": url, "payload": payload}, ensure_ascii=False))
            return {}
        body = None if payload is None else json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=body,
            method=method,
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {self.token}",
                "X-GitHub-Api-Version": "2022-11-28",
                "Content-Type": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as res:
                raw = res.read().decode("utf-8")
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise SystemExit(f"GitHub API failed: {method} {path}: {exc.code} {detail}") from exc


def _run(cmd: list[str], *, input_text: str | None = None, dry_run: bool = False) -> None:
    if dry_run:
        redacted = ["<secret>" if "PRIVATE" in item or "TOKEN" in item else item for item in cmd]
        print(json.dumps({"dryRun": True, "command": redacted}, ensure_ascii=False))
        return
    subprocess.run(cmd, input=input_text, text=True, check=True)


def _ensure_repo_shape(repo: str) -> None:
    if "/" not in repo or repo.count("/") != 1:
        raise SystemExit("GITHUB_REPOSITORY must look like owner/repo")


def setup_environments(client: GitHubClient) -> None:
    for name in REQUIRED_ENVIRONMENTS:
        payload: dict[str, Any] = {}
        if name == "prod":
            payload = {"wait_timer": 5}
        client.request("PUT", f"/environments/{name}", payload)


def setup_branch_protection(client: GitHubClient, branch: str) -> None:
    payload = {
        "required_status_checks": {
            "strict": True,
            "contexts": [
                "Backend contract tests",
                "Public/admin web static checks",
                "Ops tools syntax",
                "Mobile TypeScript",
            ],
        },
        "enforce_admins": True,
        "required_pull_request_reviews": {"required_approving_review_count": 1},
        "restrictions": None,
    }
    client.request("PUT", f"/branches/{branch}/protection", payload)


def setup_actions_secrets(repo: str, names: list[str], dry_run: bool) -> list[str]:
    missing = []
    for name in names:
        value = os.environ.get(name, "")
        if not value:
            missing.append(name)
            continue
        _run(["gh", "secret", "set", name, "--repo", repo], input_text=value, dry_run=dry_run)
    return missing


def main() -> int:
    parser = argparse.ArgumentParser(description="Configure GitHub Actions environments, branch protection and repository secrets for Allchemist.")
    parser.add_argument("--repo", default=os.environ.get("GITHUB_REPOSITORY", ""), help="GitHub repository as owner/repo.")
    parser.add_argument("--branch", default=os.environ.get("GITHUB_PROTECTED_BRANCH", "main"), help="Protected branch name.")
    parser.add_argument("--apply", action="store_true", help="Apply changes. Without this flag the script is dry-run.")
    parser.add_argument("--secret", action="append", default=[], help="Additional repository secret env var name to upload with gh secret set.")
    args = parser.parse_args()

    repo = args.repo.strip()
    if not repo:
        raise SystemExit("Set GITHUB_REPOSITORY=owner/repo or pass --repo")
    _ensure_repo_shape(repo)
    token = os.environ.get("GITHUB_TOKEN", "")
    dry_run = not args.apply
    if not dry_run and not token:
        raise SystemExit("Set GITHUB_TOKEN before --apply")

    if not dry_run:
        try:
            subprocess.run(["gh", "--version"], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception as exc:
            raise SystemExit("gh CLI is required for repository secrets") from exc

    client = GitHubClient(repo=repo, token=token or "dry-run-token", dry_run=dry_run)
    setup_environments(client)
    setup_branch_protection(client, args.branch)
    missing = setup_actions_secrets(repo, list(DEFAULT_SECRET_NAMES) + args.secret, dry_run)
    print(json.dumps({"ok": True, "dryRun": dry_run, "repo": repo, "branch": args.branch, "missingSecrets": missing}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
