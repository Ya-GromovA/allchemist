# ALC-007A rollback runbook

Restore only ALC-007A changes. Never reset/clean production or touch database data. Use the verified root-only backup `/root/backups/allchemist/ALC-007A/20260718T215913Z`. Restore repository root metadata only if a verified consumer fails. Recreate only an affected Compose service from the backed-up definition; never recreate volumes. Run `ufw --force disable` if SSH/routing becomes uncertain. Keep 3011 active and never restart legacy 3010 from its deleted cwd. Validate nginx before reload, then recheck SSH, public routes, health, listeners and restart counts.
