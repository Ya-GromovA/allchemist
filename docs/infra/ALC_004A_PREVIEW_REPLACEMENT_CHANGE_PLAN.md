# ALC-004A Preview Replacement Change Plan

## Decision

Port 3011 is the canonical replacement preview runtime. Port 3010 remains a
temporary legacy fallback and must be retired after ALC-004B. The replacement
service will not move back to or reuse port 3010.

## Scope

- Source commit: 32aef1ecc8f49cc21436954cbd479205450fa1bc
- Verified artifact: /root/allchemist-runtime/preview/releases/20260714-112717
- Runtime release: /opt/allchemist/preview/releases/20260714-112717
- Runtime selector: /opt/allchemist/preview/current
- Bind address: 127.0.0.1:3011
- Unit: allchemist-preview.service
- Runtime identity: allchemist-preview
- Environment file: /etc/allchemist/preview.env

No build, migration, database operation, nginx change, DNS change, TLS change,
or public route switch is part of ALC-004A.

## Safety gates

1. Confirm the exact source commit and a clean task worktree.
2. Confirm port 3011 is free.
3. Confirm the legacy 3010 PID and HTTP response before and after every test.
4. Verify all 1399 checksums before and after copying the artifact.
5. Refuse to overwrite an existing release, environment file, or unit.
6. Verify the unit with systemd-analyze verify before installation.
7. Run cold-start, smoke, restart, and rollback rehearsals.
8. Confirm production checkout and public routing configurations are unchanged.

## Runtime construction

The release is copied once from the verified artifact. Runtime content is owned
by root:allchemist-preview; directories are 0750 and regular files are
read-only. The current symlink selects the release. The service account is a
system account with no password, no sudo membership, and /usr/sbin/nologin.

Environment names are NODE_ENV, HOSTNAME, and PORT. No secret is stored in Git.

## Service controls

The repository template is infra/systemd/allchemist-preview.service. The
operational copy is /etc/systemd/system/allchemist-preview.service. The service
runs the standalone entry with /usr/bin/node, uses Restart=on-failure, handles
SIGTERM, writes logs to journald, and applies systemd hardening.

## Acceptance boundary

ALC-004A is accepted when the local 3011 runtime is restart-safe and the branch
is published. Gate G3 remains PARTIAL because preview.allchemist.ru is not yet
routed to 3011, access protection is not configured, and legacy 3010 has not
been retired. ALC-004B must complete those steps without reusing port 3010.
