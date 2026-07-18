# ALC-007 Infrastructure, Data, Security and Observability Audit

## Method and boundary

Read-only server inspection covered OS, filesystem permissions, users/groups, systemd/nginx/Docker metadata, listeners/firewall/TLS, source/config names, HTTP health, and PostgreSQL catalogs. No secret values or user rows were read. PostgreSQL ran inside `BEGIN READ ONLY` and ended with `ROLLBACK`; writes: 0.

## Evidence summary

- Ubuntu 22.04.2 LTS/kernel 5.15; root filesystem 77% used.
- `/root/synapse` is mode 777. Canonical 3011 uses a dedicated non-login account and hardening; legacy 3010 runs root from the production checkout.
- nginx terminates TLS for public/admin/API/preview. Certbot timer exists. Preview uses Basic Auth. Values and credential files were not read.
- Docker publishes backend 8000 and PostgreSQL 5433 on all interfaces. UFW is inactive and host INPUT policy accepts; only 80/443/22 should be intentionally public after owner-approved remediation.
- Production and preview are separated for canonical web artifact, but backend/database and legacy preview remain single-host single points of failure.
- No Redis/queue runtime or managed object-storage boundary is present.

## Decisions

Adopt immutable releases, least-privilege service accounts, private Docker networks, deny-by-default host firewall, managed environment-specific PostgreSQL, S3-compatible object storage, and an observable queued-worker plane. Provider, HA topology, regions, RPO/RTO and legal retention are **DECISION REQUIRES OWNER/ARCHITECT APPROVAL**.
