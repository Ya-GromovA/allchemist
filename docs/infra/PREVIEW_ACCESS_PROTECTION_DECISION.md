# Preview Access Protection Decision

## Evaluated models

| Model | Strengths | Costs and constraints | Current fit |
| --- | --- | --- | --- |
| Basic Auth + TLS + noindex | Simple, browser-native, desktop/mobile compatible, independent of an identity provider | Shared credentials, limited user audit, rotation required | Recommended |
| Tailscale-only | Strong network isolation, no public anonymous path | Every test device needs Tailscale; blocks ordinary public TLS/PWA behavior | Operator fallback only |
| Identity-aware access | Individual identity, revocation, audit | Requires configured provider, policy, and ownership | Not ready; no Access deployment confirmed |

Cloudflare DNS/proxy is confirmed, but Cloudflare Access is not. No corporate
identity proxy was found in nginx or the inspected environment.

## Decision

Use BASIC AUTH + TLS + NOINDEX for ALC-004B2.

Reasons:

1. It protects the first public preview without introducing a new identity
   platform.
2. It works on desktop and mobile browsers.
3. It permits real public DNS, TLS, asset, and PWA testing.
4. It is compatible with the installed nginx auth module.
5. It is replaceable by identity-aware access later.

## Credential storage

Future path:

    /etc/nginx/auth/preview.allchemist.ru.htpasswd

Required ownership and mode:

    root:www-data 0640

The apache htpasswd utility is not installed. ALC-004B2 may use the existing
OpenSSL binary with an interactive password read and stdin hashing. The
password and generated hash must never appear in command arguments, terminal
handoff, Git, documentation, logs, or chat.

Use a dedicated preview credential, not a GitHub, server, Tailscale, database,
or production account password.

## Rotation and revocation

- Create replacement content in a protected temporary file.
- Validate owner, group, and mode.
- Atomically replace only the preview auth file.
- Verify old credentials fail and new credentials succeed.
- Do not print the file or its hash during verification.
- Rotate immediately if a password or hash is disclosed.

## Logging and redaction

Use a separate access and error log. The standard combined format does not log
the Authorization header, but it can log the Basic Auth username and complete
request URI. Never add Authorization headers to log formats. Do not place
secrets in query strings. Redact usernames and query parameters from shared
diagnostic reports.

## Search-engine controls

Basic Auth is the primary control. The template additionally provides:

- X-Robots-Tag: noindex, nofollow, noarchive;
- a public robots.txt with Disallow: /;
- no unauthenticated application fallback.

Robots directives are advisory and do not replace authentication.

## Mobile and PWA implications

Mobile browsers support Basic Auth, but installed PWA behavior, service-worker
requests, credential prompts, and cache reuse must be tested explicitly.
Changing credentials may require closing browser sessions or clearing stored
authentication state. Long-lived shared credentials are not acceptable.

## Fallback access

Operator fallback is an authenticated Tailscale SSH tunnel to
127.0.0.1:3011. Port 3011 is loopback-only, so merely joining Tailscale does not
make it directly reachable. This fallback is for operators, not general
mobile/PWA testers.

## Residual risks

- Shared credentials provide weaker individual attribution.
- Password guessing remains possible; no rate-limit policy is currently
  configured.
- If Cloudflare proxy is enabled later, origin/client IP logging requires a
  separately reviewed trusted-proxy configuration.
- Basic Auth is not a substitute for application authorization.

No credential or password hash was created in ALC-004B1.
