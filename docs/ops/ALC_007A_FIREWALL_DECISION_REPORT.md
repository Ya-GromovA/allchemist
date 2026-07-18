# ALC-007A firewall decision report

SSH was verified on TCP 22. UFW had no added rules and was inactive. It is now inbound-deny/outbound-allow with TCP 22, 80 and 443 allowed for IPv4/IPv6. A five-minute automatic disable timer protected enablement. The current session and a second independent SSH connection passed before cancellation. No rule allows 8000, 5433, 3010 or 3011. Verdict: PASS.
