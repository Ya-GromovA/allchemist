# ALC-007A P0 remediation report

Base `05705796e6b6585f1353af75d94e08f238be5084`; execution 2026-07-18 UTC.

Production repository root changed from UID/GID 1000 mode `0777` to `root:root 0750`; runtime subtrees were not recursively altered. Backend 8000 and PostgreSQL 5433 changed from all-interface publication to IPv4 loopback. UFW changed from inactive to inbound-deny with only verified TCP 22, 80 and 443 allowed. Obsolete preview 3010 was stopped and disabled after canonical 3011 passed nine routes and referenced assets.

No migration, database command, row write, volume recreation, feature deployment, or secret read occurred. P0-A and P0-B are resolved.
