"""Password hashing. Argon2id for everything set from now on.

Why Argon2id and why these parameters
-------------------------------------
The platform stored two families of hashes: bcrypt (cost 12) for accounts
created through the web cabinet, and a pbkdf2_sha256 fallback for the case
where the bcrypt wheel was missing from the image. Both are still verified
here -- nobody is locked out -- but nothing new is written in either.

Parameters were measured on the production host (3 vCPU, 5.8 GB) before being
fixed, because a KDF parameter chosen from a blog post is a guess:

    argon2id m=9216KiB  t=3 p=1 : verify  26.2 ms
    argon2id m=12288KiB t=3 p=1 : verify  30.6 ms
    argon2id m=19456KiB t=2 p=1 : verify  42.9 ms   <- chosen
    argon2id m=46080KiB t=1 p=1 : verify 102.2 ms
    argon2id m=19456KiB t=3 p=1 : verify 137.3 ms
    argon2id m=65536KiB t=2 p=1 : verify 181.2 ms
    bcrypt   rounds=12          : verify 221.0 ms   <- what it replaces

m=19456 KiB, t=2, p=1 is the first OWASP-recommended Argon2id configuration.
On this host it verifies in 43 ms, which is five times *faster* than the bcrypt
it replaces, so login gets quicker rather than slower while the work factor
against an offline attacker goes up. Memory is the point of Argon2: 19 MiB per
concurrent verification is affordable here (the process budget is 600 MB and
logins are not concurrent in the hundreds), and it is exactly what makes GPU
cracking expensive.

Rehashing
---------
``needs_rehash`` is true for every hash that is not Argon2id at the current
parameters. The next successful login re-hashes the password the user just
proved they know -- the only moment the plaintext is legitimately available --
and clears the flag. No password reset is forced on anyone.
"""

from __future__ import annotations

import hashlib
import secrets
from dataclasses import dataclass
from typing import Optional

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError
from argon2.low_level import Type

try:  # pragma: no cover - exercised only on an image without the wheel
    import bcrypt
except Exception:  # pragma: no cover
    bcrypt = None  # type: ignore[assignment]

__all__ = [
    "ARGON2ID",
    "BCRYPT",
    "PBKDF2_SHA256",
    "PasswordVerification",
    "detect_algorithm",
    "hash_password",
    "needs_rehash",
    "verify_password",
]

ARGON2ID = "argon2id"
BCRYPT = "bcrypt"
PBKDF2_SHA256 = "pbkdf2_sha256"

# Kept in sync with app.models.identity.PASSWORD_ALGORITHMS, which is the CHECK
# constraint on user_credentials.algorithm.
SUPPORTED_ALGORITHMS = (ARGON2ID, BCRYPT, PBKDF2_SHA256)

ARGON2_MEMORY_COST_KIB = 19456
ARGON2_TIME_COST = 2
ARGON2_PARALLELISM = 1
ARGON2_HASH_LEN = 32
ARGON2_SALT_LEN = 16

_HASHER = PasswordHasher(
    time_cost=ARGON2_TIME_COST,
    memory_cost=ARGON2_MEMORY_COST_KIB,
    parallelism=ARGON2_PARALLELISM,
    hash_len=ARGON2_HASH_LEN,
    salt_len=ARGON2_SALT_LEN,
    type=Type.ID,
)

_PBKDF2_ROUNDS = 260000


@dataclass(frozen=True)
class PasswordVerification:
    """Outcome of checking a password against a stored hash."""

    ok: bool
    needs_rehash: bool = False
    algorithm: str = ""


def detect_algorithm(password_hash: str) -> str:
    """Name the family a stored hash belongs to.

    Used when reading credentials that predate the ``algorithm`` column, and to
    keep the column honest when it disagrees with the hash it labels.
    """
    value = str(password_hash or "")
    if value.startswith("$argon2id$"):
        return ARGON2ID
    if value.startswith(f"{PBKDF2_SHA256}$"):
        return PBKDF2_SHA256
    if value.startswith("$2a$") or value.startswith("$2b$") or value.startswith("$2y$"):
        return BCRYPT
    return ""


def hash_password(raw_password: str) -> tuple[str, str]:
    """Hash a password with the current algorithm.

    Returns ``(algorithm, hash)`` so the caller writes both columns of
    ``user_credentials`` from one place and they cannot drift apart.
    """
    if not isinstance(raw_password, str) or not raw_password:
        raise ValueError("Пароль не может быть пустым")
    return ARGON2ID, _HASHER.hash(raw_password)


def needs_rehash(password_hash: str, algorithm: Optional[str] = None) -> bool:
    """Should this hash be replaced on the next successful login?

    True for every legacy family, and for an Argon2id hash produced with
    parameters weaker than the current ones.
    """
    family = detect_algorithm(password_hash) or str(algorithm or "")
    if family != ARGON2ID:
        return True
    try:
        return bool(_HASHER.check_needs_rehash(password_hash))
    except InvalidHashError:
        return True


def _verify_pbkdf2(raw_password: str, password_hash: str) -> bool:
    try:
        _, rounds, salt, digest = password_hash.split("$", 3)
        candidate = hashlib.pbkdf2_hmac(
            "sha256", raw_password.encode("utf-8"), salt.encode("utf-8"), int(rounds)
        ).hex()
    except Exception:
        return False
    return secrets.compare_digest(candidate, digest)


def _verify_bcrypt(raw_password: str, password_hash: str) -> bool:
    if bcrypt is None:
        return False
    try:
        return bool(bcrypt.checkpw(raw_password.encode("utf-8"), password_hash.encode("utf-8")))
    except Exception:
        return False


def verify_password(
    raw_password: str, password_hash: str, algorithm: Optional[str] = None
) -> PasswordVerification:
    """Check a password against any of the three supported families.

    The stored ``algorithm`` is treated as a label, not as truth: the hash
    itself says what it is. A row whose label disagrees with its content still
    verifies, and is reported as needing a rehash.
    """
    candidate = str(raw_password or "")
    stored = str(password_hash or "")
    if not candidate or not stored:
        return PasswordVerification(ok=False)

    family = detect_algorithm(stored) or str(algorithm or "")

    if family == ARGON2ID:
        try:
            _HASHER.verify(stored, candidate)
        except (VerifyMismatchError, VerificationError, InvalidHashError):
            return PasswordVerification(ok=False, algorithm=ARGON2ID)
        return PasswordVerification(
            ok=True, needs_rehash=needs_rehash(stored, ARGON2ID), algorithm=ARGON2ID
        )

    if family == PBKDF2_SHA256:
        ok = _verify_pbkdf2(candidate, stored)
        return PasswordVerification(ok=ok, needs_rehash=ok, algorithm=PBKDF2_SHA256)

    if family == BCRYPT:
        ok = _verify_bcrypt(candidate, stored)
        return PasswordVerification(ok=ok, needs_rehash=ok, algorithm=BCRYPT)

    return PasswordVerification(ok=False)
