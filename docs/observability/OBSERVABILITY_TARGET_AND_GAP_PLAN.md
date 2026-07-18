# Observability Target and Gap Plan

Current evidence includes process logs, health endpoints, security status documents and some operational probes. No complete structured logging, correlation IDs, metrics, distributed traces, frontend/backend error tracking, DB/job monitoring, alert routing, SLO dashboards, retention/redaction policy or synthetic-monitor ownership is evidenced.

Target: OpenTelemetry SDK/collector; JSON logs with request/correlation/tenant-safe identifiers; Prometheus-compatible metrics and Grafana; Loki or managed log store; Sentry (or approved equivalent) for frontend/backend errors with PII scrubbing; Alertmanager/on-call routing; PostgreSQL exporter; queue/backup/restore/security alerts; external synthetic health/readiness checks. Define availability, latency, error-rate and job-age SLIs/SLOs. Redaction tests and retention policy are release gates. Exact managed/self-hosted selection requires approval.
