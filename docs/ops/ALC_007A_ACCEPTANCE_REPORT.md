# ALC-007A acceptance report

PASS requires: repository root not world-writable; 8000/5433 loopback-only; SSH plus public 80/443 healthy; backend/PostgreSQL healthy; 3010 retired or safely contained; 3011 healthy; no DB writes or secrets; verified rollback; six stable checkpoints; clean published worktree. Runtime gates passed; final Git/publication gates are recorded in the handoff.
