# Preview Domain Owner Actions

ALC-004B1 did not change DNS. The domain owner must perform this action
manually before ALC-004B2.

## Add the record

1. Sign in to Cloudflare using the owner's normal secure workflow.
2. Open the allchemist.ru zone.
3. Open DNS, then Records.
4. Add the following record:

| Field | Exact value |
| --- | --- |
| Type | A |
| Name | preview |
| IPv4 address | 45.128.205.38 |
| Proxy status | DNS only |
| TTL | Auto, expected effective value 300 seconds |

Do not add AAAA or CNAME. Do not point the record to 100.67.164.12. Do not edit
the root, www, admin, or api records.

## Verify propagation

Wait at least five minutes, then run:

    dig @1.1.1.1 preview.allchemist.ru A +noall +answer
    dig @8.8.8.8 preview.allchemist.ru A +noall +answer
    dig @1.1.1.1 preview.allchemist.ru AAAA +noall +answer
    dig @1.1.1.1 preview.allchemist.ru CNAME +noall +answer

The A answer must be exactly 45.128.205.38. AAAA and CNAME must remain empty.
Check from a second network if possible.

## Confirmation to provide

Confirm only:

- the record was added;
- proxy status is DNS only;
- both public resolvers return 45.128.205.38;
- AAAA and CNAME are absent.

Do not send:

- Cloudflare password;
- one-time code;
- API token or global API key;
- account recovery code;
- server, Tailscale, GitHub, database, or preview password;
- Basic Auth password or password hash;
- certificate private key.

Codex does not need any of these secrets for the next preflight.

## If the record is wrong

Edit or delete only the preview A record. Do not compensate by changing another
hostname or creating a wildcard. Wait the effective TTL and repeat the public
resolver checks. If a conflicting record or Worker route exists, stop and
report only its type and hostname, not account details or tokens.

## DNS rollback

Deleting the preview A record restores the confirmed pre-ALC-004B1 DNS state.
After deletion, authoritative, 1.1.1.1, and 8.8.8.8 answers for preview should
be empty after cache expiry.

## Start condition for ALC-004B2

Start ALC-004B2 only after propagation is confirmed. DNS propagation is
necessary but does not authorize nginx, TLS, credential, or legacy-process
changes by itself.

Port 3010 is an unrestartable legacy fallback with a deleted cwd. It will be
stopped only after the protected 3011 public route passes all ALC-004B2 checks.
It must never be assigned to the replacement service or reused afterward.
