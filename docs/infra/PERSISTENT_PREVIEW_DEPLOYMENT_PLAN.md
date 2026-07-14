# Persistent Preview Deployment Plan

## Current Decision

PREVIEW-PROD-1 uses a dedicated systemd service for `apps/web` in production mode on `127.0.0.1:3010`.

This does not switch the main production route and does not apply nginx changes.

## Why `127.0.0.1:3010` Fell Before

The local browser URL depended on two temporary processes:

- a remote `next start` process launched from an interactive SSH session;
- a local Windows SSH tunnel from `127.0.0.1:3010` to the server.

If the laptop sleeps, terminal closes, SSH session exits, or the remote shell loses its child process, the preview becomes unavailable. systemd fixes the remote process lifetime. A local tunnel or preview domain is still needed for browser access.

## Why A Domain Alone Does Not Solve It

A DNS/domain record only points traffic to a server. It does not keep the Next.js preview running, restart it after crash/reboot, or define reverse proxy behavior. A stable preview needs:

1. Next production build.
2. systemd service.
3. nginx reverse proxy for a preview domain.
4. HTTPS certificate.

## Active Preview Service

Recommended service path:

`/etc/systemd/system/allchemist-web-preview.service`

Source example:

`infra/systemd/allchemist-web-preview.service.example`

Service behavior:

- Working directory: `/root/synapse`
- Command: `/usr/bin/node /root/synapse/apps/web/.next/standalone/apps/web/server.js`
- Bind host: `127.0.0.1`
- Port: `3010`
- Restart: `always`

Because `apps/web/next.config.mjs` uses `output: "standalone"`, the service also copies `apps/web/public` and `apps/web/.next/static` into the standalone tree before start. Binding to `127.0.0.1` keeps the preview private until nginx/domain are explicitly approved.

## Nginx Preview Domain Plan

Recommended preview domain:

`preview.allchemist.ru`

Example config:

`infra/nginx/allchemist-web-preview.conf.example`

Do not enable this config without separate approval.

## DNS Instruction

Create an A record:

- Name: `preview`
- Type: `A`
- Value: server public IP
- TTL: 300 or provider default

If the preview should be private, restrict by VPN/IP allowlist in nginx before enabling public DNS.

## HTTPS Instruction

After DNS resolves and nginx config is approved:

```bash
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d preview.allchemist.ru
sudo systemctl reload nginx
```

## Rollback Steps

Systemd rollback:

```bash
sudo systemctl stop allchemist-web-preview
sudo systemctl disable allchemist-web-preview
sudo rm /etc/systemd/system/allchemist-web-preview.service
sudo systemctl daemon-reload
```

Nginx rollback, only if preview config was enabled:

```bash
sudo rm /etc/nginx/sites-enabled/allchemist-web-preview.conf
sudo nginx -t
sudo systemctl reload nginx
```

## Safety Notes

- Do not touch `infra/docker-compose.yml`.
- Do not modify primary production nginx server blocks.
- Do not attach preview config to the main production domain.
- Do not switch production routes.
