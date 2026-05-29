# Hardening Plan (SLO / Alerts / Backup / Compliance)

## SLO

- API availability: 99.5% monthly.
- p95 latency: <= 450 ms for core endpoints (`/health`, `/modules`, `/progress/analytics/*`).
- Error budget policy: freeze non-critical releases when budget exhausted.

## Alerts

- Critical:
  - healthcheck non-200 > 2 min
  - DB connection errors > 5/min
  - 5xx > 3% for 5 min
- Warning:
  - p95 latency > 800 ms for 10 min
  - disk usage > 80%

## Backup

- Daily PostgreSQL dump + weekly full archive.
- Copy backups to offsite bucket.
- Keep retention: 7 daily + 4 weekly.
- Quarterly restore drill with checklist.

## Anti-cheat

- Track `too_fast_answer`, repeated impossible accuracy spikes, unusual event bursts.
- API-level response includes integrity counters and flags.
- Policy outcomes:
  - low: warn
  - medium: teacher review
  - high: lock graded attempts pending review

## Legal/compliance

- Data export/delete endpoints for account owner.
- Consent versioning with audit trail.
- Parent approval requirement for minors.
- Audit logging for admin actions.
