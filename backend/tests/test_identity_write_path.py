"""The identity write path lands in the database, not in a JSON file.

The closing criterion for the migration, stated by the owner, is that a new
registration appears in ``users`` without anyone running an import script. That
is asserted here directly against the tables, not through a projection, so a
bug in the compatibility bridge cannot make these tests pass.
"""

from __future__ import annotations

import time
import unittest

import bcrypt
from fastapi.testclient import TestClient
from sqlalchemy import select, text

from app.core.passwords import (
    ARGON2_MEMORY_COST_KIB,
    ARGON2_PARALLELISM,
    ARGON2_TIME_COST,
    hash_password,
    needs_rehash,
    verify_password,
)
from app.db.session import SessionLocal
from app.main import app
from app.models.identity import (
    AuthAttemptEvent,
    User,
    UserCredential,
    UserEntitlementItem,
    UserIdentifier,
    UserSession,
)
from app.models.telemetry import LearningEvent, TelemetryEvent
from app.services import user_state_store as store


class IdentityWritePathTest(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)
        self.session = SessionLocal()

    def tearDown(self) -> None:
        self.session.close()

    def _register(self, phone: str) -> str:
        requested = self.client.post("/api/v1/auth/phone/request-code", json={"phone": phone})
        self.assertEqual(requested.status_code, 200, requested.text)
        code = requested.json()["debugCode"]
        verified = self.client.post(
            "/api/v1/auth/phone/verify", json={"phone": phone, "code": code}
        )
        self.assertEqual(verified.status_code, 200, verified.text)
        return verified.json()["userId"]

    # ------------------------------------------------------------------ #
    # The closing criterion
    # ------------------------------------------------------------------ #

    def test_new_registration_lands_in_users_without_an_import_script(self) -> None:
        phone = "+79995550101"
        before = self.session.execute(select(User.user_id)).scalars().all()

        user_id = self._register(phone)

        self.session.expire_all()
        self.assertNotIn(user_id, before)

        user = self.session.get(User, user_id)
        self.assertIsNotNone(user, "регистрация не создала строку в users")
        self.assertEqual(user.status, "active")

        identifier = self.session.execute(
            select(UserIdentifier).where(
                UserIdentifier.kind == "phone", UserIdentifier.value_normalized == phone
            )
        ).scalars().one()
        self.assertEqual(identifier.user_id, user_id)
        self.assertTrue(identifier.is_primary)
        self.assertIsNotNone(identifier.verified_at)

        # The free plan and the core module are granted in the same transaction.
        granted = {
            (row.kind, row.value)
            for row in self.session.execute(
                select(UserEntitlementItem).where(UserEntitlementItem.user_id == user_id)
            ).scalars().all()
        }
        self.assertIn(("plan", "free"), granted)
        self.assertIn(("module", "chemistry_core"), granted)

        sessions = self.session.execute(
            select(UserSession).where(UserSession.user_id == user_id)
        ).scalars().all()
        self.assertEqual(len(sessions), 1)
        self.assertFalse(sessions[0].revoked)

    def test_registration_is_atomic(self) -> None:
        """A failed verification must leave no half-built account behind."""
        phone = "+79995550102"
        self.client.post("/api/v1/auth/phone/request-code", json={"phone": phone})
        rejected = self.client.post(
            "/api/v1/auth/phone/verify", json={"phone": phone, "code": "000000"}
        )
        self.assertEqual(rejected.status_code, 400, rejected.text)

        self.session.expire_all()
        orphan = self.session.execute(
            select(UserIdentifier).where(
                UserIdentifier.kind == "phone", UserIdentifier.value_normalized == phone
            )
        ).scalars().first()
        self.assertIsNone(orphan, "неудачная проверка кода создала учётную запись")

        # The failed attempt itself is still recorded: rate limiting and the
        # audit trail have to survive the rollback that refuses the request.
        attempts = self.session.execute(
            select(AuthAttemptEvent).where(AuthAttemptEvent.kind == "otp_verify")
        ).scalars().all()
        self.assertTrue(any(row.result == "failed" for row in attempts))

    def test_one_phone_cannot_belong_to_two_accounts(self) -> None:
        phone = "+79995550103"
        first = self._register(phone)
        second = self._register(phone)
        self.assertEqual(first, second)
        self.session.expire_all()
        rows = self.session.execute(
            select(UserIdentifier).where(
                UserIdentifier.kind == "phone", UserIdentifier.value_normalized == phone
            )
        ).scalars().all()
        self.assertEqual(len(rows), 1)

    def test_state_file_is_out_of_the_write_path(self) -> None:
        """Registration must not touch backend/data/user_state.json at all."""
        from app.services import legacy_state_bridge

        path = legacy_state_bridge.STATE_PATH
        before = path.read_text(encoding="utf-8") if path.exists() else ""
        self._register("+79995550104")
        after = path.read_text(encoding="utf-8") if path.exists() else ""
        self.assertEqual(before, after, "регистрация записала JSON-файл")

    # ------------------------------------------------------------------ #
    # Argon2id
    # ------------------------------------------------------------------ #

    def test_new_password_is_argon2id_at_the_measured_parameters(self) -> None:
        user_id = self._register("+79995550105")
        store.attach_login_password(None, user_id, "argon_user", "Passw0rd123")

        self.session.expire_all()
        credential = self.session.get(UserCredential, user_id)
        self.assertEqual(credential.algorithm, "argon2id")
        self.assertTrue(credential.password_hash.startswith("$argon2id$"))
        self.assertFalse(credential.needs_rehash)
        self.assertIn(f"m={ARGON2_MEMORY_COST_KIB}", credential.password_hash)
        self.assertIn(f"t={ARGON2_TIME_COST}", credential.password_hash)
        self.assertIn(f"p={ARGON2_PARALLELISM}", credential.password_hash)

    def test_bcrypt_password_still_works_and_is_upgraded_on_login(self) -> None:
        """The whole point of the migration: nobody is locked out, nobody resets."""
        user_id = self._register("+79995550106")
        store.attach_login_password(None, user_id, "legacy_user", "Passw0rd123")

        legacy_hash = bcrypt.hashpw(b"Passw0rd123", bcrypt.gensalt(rounds=12)).decode()
        self.session.execute(
            text(
                "UPDATE user_credentials SET algorithm='bcrypt', password_hash=:h, "
                "needs_rehash=true WHERE user_id=:u"
            ),
            {"h": legacy_hash, "u": user_id},
        )
        self.session.commit()

        result = store.login_with_password("legacy_user", "Passw0rd123")
        self.assertEqual(result["userId"], user_id)

        self.session.expire_all()
        credential = self.session.get(UserCredential, user_id)
        self.assertEqual(credential.algorithm, "argon2id")
        self.assertTrue(credential.password_hash.startswith("$argon2id$"))
        self.assertFalse(credential.needs_rehash)
        self.assertNotEqual(credential.password_hash, legacy_hash)

        # And the upgraded credential still verifies the same password.
        self.assertTrue(verify_password("Passw0rd123", credential.password_hash).ok)
        self.assertFalse(verify_password("wrong-password", credential.password_hash).ok)

    def test_wrong_password_does_not_upgrade_the_hash(self) -> None:
        user_id = self._register("+79995550107")
        store.attach_login_password(None, user_id, "keep_user", "Passw0rd123")
        legacy_hash = bcrypt.hashpw(b"Passw0rd123", bcrypt.gensalt(rounds=12)).decode()
        self.session.execute(
            text(
                "UPDATE user_credentials SET algorithm='bcrypt', password_hash=:h, "
                "needs_rehash=true WHERE user_id=:u"
            ),
            {"h": legacy_hash, "u": user_id},
        )
        self.session.commit()

        with self.assertRaises(ValueError):
            store.login_with_password("keep_user", "not-the-password")

        self.session.expire_all()
        credential = self.session.get(UserCredential, user_id)
        self.assertEqual(credential.algorithm, "bcrypt")
        self.assertTrue(credential.needs_rehash)

    def test_pbkdf2_password_still_verifies(self) -> None:
        import hashlib

        salt = "0123456789abcdef0123456789abcdef"
        digest = hashlib.pbkdf2_hmac("sha256", b"Passw0rd123", salt.encode(), 260000).hex()
        legacy = f"pbkdf2_sha256$260000${salt}${digest}"
        outcome = verify_password("Passw0rd123", legacy)
        self.assertTrue(outcome.ok)
        self.assertTrue(outcome.needs_rehash)
        self.assertFalse(verify_password("wrong", legacy).ok)

    def test_argon2_verification_stays_inside_the_login_budget(self) -> None:
        """A KDF that makes login feel slow will be weakened by the next person.

        The bcrypt cost 12 it replaces measured 221 ms on this host, so the
        budget is generous: anything at or under that is not a regression. The
        assertion is deliberately loose because it runs on shared CI hardware --
        the number that matters is in the report, this only catches a parameter
        change that makes login an order of magnitude slower.
        """
        _, password_hash = hash_password("Passw0rd123")
        started = time.perf_counter()
        for _ in range(5):
            self.assertTrue(verify_password("Passw0rd123", password_hash).ok)
        elapsed_ms = (time.perf_counter() - started) / 5 * 1000
        self.assertLess(elapsed_ms, 250, f"проверка пароля заняла {elapsed_ms:.0f} мс")
        self.assertFalse(needs_rehash(password_hash))

    # ------------------------------------------------------------------ #
    # Event streams
    # ------------------------------------------------------------------ #

    def test_telemetry_and_learning_events_are_rows(self) -> None:
        user_id = self._register("+79995550108")
        store.ingest_telemetry([{"name": "open_lab", "userId": user_id, "deviceId": "d1"}])
        accepted = store.ingest_learning_events(
            [
                {
                    "eventId": "evt-1",
                    "userId": user_id,
                    "taskId": "zn_hcl_1",
                    "lessonId": "zn_hcl",
                    "outcome": "correct",
                    "payload": {"durationSec": 42},
                }
            ]
        )
        self.assertEqual(accepted["accepted"], 1)

        self.session.expire_all()
        telemetry = self.session.execute(
            select(TelemetryEvent).where(TelemetryEvent.user_id == user_id)
        ).scalars().all()
        self.assertEqual(len(telemetry), 1)
        self.assertEqual(telemetry[0].event_name, "open_lab")

        learning = self.session.execute(
            select(LearningEvent).where(LearningEvent.user_id == user_id)
        ).scalars().all()
        self.assertEqual(len(learning), 1)
        self.assertEqual(learning[0].outcome, "correct")
        self.assertEqual(learning[0].task_id, "zn_hcl_1")

    def test_a_retried_learning_event_is_not_counted_twice(self) -> None:
        user_id = self._register("+79995550109")
        payload = {
            "eventId": "evt-retry",
            "userId": user_id,
            "taskId": "zn_hcl_1",
            "outcome": "correct",
        }
        store.ingest_learning_events([payload])
        store.ingest_learning_events([payload])

        self.session.expire_all()
        rows = self.session.execute(
            select(LearningEvent).where(LearningEvent.client_event_id == "evt-retry")
        ).scalars().all()
        self.assertEqual(len(rows), 1, "повторная отправка удвоила попытку")

    def test_event_streams_refuse_to_be_rewritten(self) -> None:
        user_id = self._register("+79995550110")
        store.ingest_telemetry([{"name": "open_lab", "userId": user_id}])
        self.session.commit()
        with self.assertRaises(Exception):
            self.session.execute(text("UPDATE telemetry_events SET event_name='forged'"))
            self.session.commit()
        self.session.rollback()

    # ------------------------------------------------------------------ #
    # Erasure
    # ------------------------------------------------------------------ #

    def test_deletion_removes_the_identifying_data(self) -> None:
        user_id = self._register("+79995550111")
        store.attach_login_password(None, user_id, "erase_user", "Passw0rd123")
        store.delete_user_data(user_id)

        self.session.expire_all()
        user = self.session.get(User, user_id)
        self.assertEqual(user.status, "deleted")
        self.assertIsNotNone(user.deleted_at)
        self.assertIsNone(user.display_name)
        self.assertIsNone(self.session.get(UserCredential, user_id))
        self.assertEqual(
            self.session.execute(
                select(UserIdentifier).where(UserIdentifier.user_id == user_id)
            ).scalars().all(),
            [],
        )
        # The freed phone number can be used by somebody else afterwards.
        reused = self._register("+79995550111")
        self.assertNotEqual(reused, user_id)


if __name__ == "__main__":
    unittest.main()
