# ALC-004A Handoff Report

## Source and isolation

- Source: 32aef1ecc8f49cc21436954cbd479205450fa1bc
- Branch: chore/alc-004a-preview-replacement-20260717-010607
- Worktree: /root/worktrees/allchemist-preview-replacement-20260717-010607
- Production checkout and main: unchanged

## Runtime roles

- Port 3010: legacy emergency fallback
- Port 3011: canonical target preview runtime
- Future return to port 3010: not planned

The 3010 process stayed at PID 1603626 and HTTP 200 during every validation.

## Artifact and service

- Source artifact: /root/allchemist-runtime/preview/releases/20260714-112717
- Runtime artifact: /opt/allchemist/preview/releases/20260714-112717
- Selector: /opt/allchemist/preview/current
- Checksums: source 1399/1399 PASS; runtime 1399/1399 PASS
- BUILD_ID: foMZhxf6qk1kQrn7k-Y4I
- Ownership: root:allchemist-preview
- Unit: allchemist-preview.service
- Bind: 127.0.0.1:3011
- User/group: allchemist-preview
- Environment names: NODE_ENV, HOSTNAME, PORT
- Enabled and active: yes
- systemd verify: PASS
- systemd security exposure: 3.4 OK

Cold-start PID was 579076. Restart changed it to 579404. The rollback rehearsal
restored the service as PID 579532. PIDs are evidence, not configuration.

## Verification

- Nine required routes: HTTP 200
- Discovered JavaScript and CSS assets: HTTP 200
- BUILD_ID asset: HTTP 200
- HTTP 500 count: 0
- Missing asset count: 0
- Health command exit: 0
- Restart test: PASS
- Rollback rehearsal: PASS

No nginx, DNS, TLS, public routing, production build, database, migration, or
production checkout change was performed.

G3 remains PARTIAL because there is no protected public preview route and 3010
has not been retired.

Recommended ALC-004B:

1. Route preview.allchemist.ru to 127.0.0.1:3011.
2. Configure access protection and verify TLS, route, and assets.
3. Stop and retire legacy 3010 only after verification.
4. Never reuse port 3010 for the replacement service.

Production public-route changes are not authorized by ALC-004A.
