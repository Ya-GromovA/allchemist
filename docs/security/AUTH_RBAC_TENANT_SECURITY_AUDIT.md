# Authentication, RBAC and Tenant Security Audit

Evidence shows server-side auth flows, refresh/revocation paths, OTP limits, an 8-character UI policy, admin permissions and school identifiers. It does not prove a complete hashing configuration, breached-password screening, privileged MFA, progressive lockout, CSRF posture for future cookie auth, or a comprehensive negative authorization matrix.

Target: Argon2id or reviewed bcrypt parameters; server-enforced password policy; compromised-password screening; progressive delay and Redis-backed limits; short access tokens; rotating refresh families with durable revocation; secure/HttpOnly/SameSite cookies if cookies are adopted; MFA and break-glass for privileged roles; audited reset/recovery and secret rotation.

Centralize deny-by-default RBAC plus object predicates for student, learner, parent, teacher, homeroom teacher, school administrator, methodist, Content QA, support, finance, system administrator and owner. Every tenant-owned relation carries tenant/school scope; use composite constraints and RLS where appropriate. Admin override/impersonation requires reason, time limit, dual control for sensitive actions and immutable audit. Full evidence remains ALC-008/009 work.
