# ALC-007A network containment report

| Service | Before | After |
|---|---|---|
| Backend | `0.0.0.0/[::]:8000` | `127.0.0.1:8000` |
| PostgreSQL | `0.0.0.0/[::]:5433` | `127.0.0.1:5433` |
| Legacy preview | `127.0.0.1:3010` | unbound |
| Canonical preview | `127.0.0.1:3011` | unchanged |

No established non-local consumers were found. nginx uses 8000 and 3011 over loopback. Public site, admin, API docs and protected preview retained expected responses.
