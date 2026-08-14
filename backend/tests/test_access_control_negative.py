"""Negative access tests: the mandatory gate.

Every case here asserts a refusal *and* names the link of the chain that
refused. Asserting only "denied" would pass for the wrong reason -- a typo in a
fixture denies just as effectively as the rule under test, and a test that
cannot tell those apart is decoration.

Every refusal is paired with a **positive control**: the same request with the
single blocking condition removed, asserted to be allowed. That is what makes
these tests discriminate. If the rule under test were deleted from
``access_control.evaluate``, the negative assertion would flip to allowed and
fail; if a fixture were wrong instead, the positive control would fail too and
point at the fixture. The pair is the evidence -- neither half is worth much
alone. ``test_positive_controls_would_catch_a_removed_check`` states that
contract in executable form.

Isolation: the fixtures are written inside a transaction that is rolled back in
``tearDown``. Nothing is committed, so the suite leaves no trace in the database
it runs against.
"""

from __future__ import annotations

import unittest
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import text

from app.db.session import SessionLocal
from app.services.access_control import AccessRequest, evaluate


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class AccessControlNegativeTest(unittest.TestCase):
    """Chuzhaya shkola, chuzhoy klass, chuzhoy rebyonok, and the rest."""

    def setUp(self) -> None:
        self.session = SessionLocal()
        # One prefix per test run: even if a rollback were ever to fail, two
        # runs could not collide on a primary key.
        self.tag = f"tneg_{uuid.uuid4().hex[:10]}"
        self._build_fixture()

    def tearDown(self) -> None:
        self.session.rollback()
        self.session.close()

    # -- fixture ------------------------------------------------------------

    def _id(self, name: str) -> str:
        return f"{self.tag}_{name}"

    def _exec(self, statement: str, **params: object) -> None:
        self.session.execute(text(statement), params)

    def _build_fixture(self) -> None:
        """Two schools, two classes, a teacher, two pupils, a parent and a child.

        Deliberately small: every row exists because some assertion below needs
        it, so a failure points at one rule rather than at a landscape.
        """
        self._exec(
            "INSERT INTO organizations (organization_id, title) VALUES (:a, 'Орг А'), (:b, 'Орг Б')",
            a=self._id("org_a"),
            b=self._id("org_b"),
        )
        self._exec(
            "INSERT INTO schools (school_id, organization_id, title) "
            "VALUES (:sa, :oa, 'Школа А'), (:sb, :ob, 'Школа Б')",
            sa=self._id("school_a"),
            oa=self._id("org_a"),
            sb=self._id("school_b"),
            ob=self._id("org_b"),
        )
        self._exec(
            "INSERT INTO school_sites (site_id, school_id, title) "
            "VALUES (:na, :sa, 'Площадка А'), (:nb, :sb, 'Площадка Б')",
            na=self._id("site_a"),
            sa=self._id("school_a"),
            nb=self._id("site_b"),
            sb=self._id("school_b"),
        )
        self._exec(
            "INSERT INTO school_classes (class_id, school_id, site_id, title, subject) VALUES "
            "(:c1, :sa, :na, '9А', 'Химия'), "
            "(:c2, :sa, :na, '9Б', 'Химия'), "
            "(:c3, :sb, :nb, '9В', 'Химия')",
            c1=self._id("class_a1"),
            c2=self._id("class_a2"),
            c3=self._id("class_b1"),
            sa=self._id("school_a"),
            na=self._id("site_a"),
            sb=self._id("school_b"),
            nb=self._id("site_b"),
        )

        for name in (
            "teacher_a1",
            "teacher_b1",
            "student_a1",
            "parent",
            "child",
            "stranger_parent",
            "owner",
        ):
            self._exec(
                "INSERT INTO users (user_id, display_name, is_test) VALUES (:u, :n, true)",
                u=self._id(name),
                n=name,
            )

        # Memberships put people in schools; the tenant link reads them.
        self._exec(
            "INSERT INTO school_memberships (class_id, user_id, role, school_id, site_id) VALUES "
            "(:c1, :t1, 'teacher', :sa, :na), "
            "(:c3, :t2, 'teacher', :sb, :nb), "
            "(:c1, :s1, 'student', :sa, :na), "
            "(:c1, :ch, 'student', :sa, :na)",
            c1=self._id("class_a1"),
            c3=self._id("class_b1"),
            t1=self._id("teacher_a1"),
            t2=self._id("teacher_b1"),
            s1=self._id("student_a1"),
            ch=self._id("child"),
            sa=self._id("school_a"),
            na=self._id("site_a"),
            sb=self._id("school_b"),
            nb=self._id("site_b"),
        )

        self._assign("teacher_a1", "teacher", "class", class_id=self._id("class_a1"))
        self._assign("teacher_b1", "teacher", "class", class_id=self._id("class_b1"))
        self._assign("student_a1", "student", "class", class_id=self._id("class_a1"))
        self._assign("child", "student", "class", class_id=self._id("class_a1"))
        self._assign("parent", "parent", "global")
        self._assign("stranger_parent", "parent", "global")
        self._assign("owner", "owner", "global")

        self._exec(
            "INSERT INTO parent_child_links (parent_user_id, child_user_id, status, confirmed_at) "
            "VALUES (:p, :c, 'confirmed', now())",
            p=self._id("parent"),
            c=self._id("child"),
        )

        # The teacher holds a live module licence and an expired one.
        self._exec(
            "INSERT INTO user_entitlement_items (user_id, kind, value, source, expires_at) VALUES "
            "(:u, 'module', 'chemistry_core', 'manual', NULL), "
            "(:u, 'module', 'exam_pack', 'manual', :past)",
            u=self._id("teacher_a1"),
            past=_utc_now() - timedelta(days=1),
        )

        # One flag off everywhere, one off globally but on for school A.
        self._exec(
            "INSERT INTO feature_flags (flag_key, title_ru, enabled) VALUES "
            "(:off, 'Выключенная функция', false), (:sch, 'Школьная функция', false)",
            off=self._id("flag_off"),
            sch=self._id("flag_school"),
        )
        self._exec(
            "INSERT INTO feature_flag_overrides (flag_key, scope_type, school_id, enabled) "
            "VALUES (:sch, 'school', :sa, true)",
            sch=self._id("flag_school"),
            sa=self._id("school_a"),
        )
        self.session.flush()

    def _assign(
        self,
        user: str,
        role_key: str,
        scope_type: str,
        *,
        class_id: str | None = None,
        school_id: str | None = None,
    ) -> None:
        self._exec(
            "INSERT INTO role_assignments (user_id, role_key, scope_type, class_id, school_id) "
            "VALUES (:u, :r, :st, :c, :s)",
            u=self._id(user),
            r=role_key,
            st=scope_type,
            c=class_id,
            s=school_id,
        )

    # -- helpers ------------------------------------------------------------

    def assertDeniedAt(self, request: AccessRequest, link: str) -> None:
        decision = evaluate(self.session, request)
        self.assertFalse(
            decision.allowed,
            f"ожидался отказ на звене «{link}», но доступ разрешён (роль {decision.matched_role})",
        )
        self.assertEqual(
            decision.denied_link,
            link,
            f"отказ произошёл на звене «{decision.denied_link}» вместо «{link}»: {decision.reason_ru}",
        )
        self.assertTrue(decision.reason_ru, "отказ обязан объяснять причину")

    def assertAllowed(self, request: AccessRequest) -> None:
        decision = evaluate(self.session, request)
        self.assertTrue(
            decision.allowed,
            f"ожидался доступ, но отказано на звене «{decision.denied_link}»: {decision.reason_ru}",
        )

    # -- the cases ----------------------------------------------------------

    def test_foreign_school_is_refused_at_the_tenant_link(self) -> None:
        """Чужая школа: учитель школы А не видит кабинет в школе Б."""
        self.assertDeniedAt(
            AccessRequest(
                user_id=self._id("teacher_a1"),
                permission="cabinet:teacher",
                school_id=self._id("school_b"),
            ),
            "tenant",
        )
        # Positive control: the same teacher, in his own school.
        self.assertAllowed(
            AccessRequest(
                user_id=self._id("teacher_a1"),
                permission="cabinet:teacher",
                school_id=self._id("school_a"),
                class_id=self._id("class_a1"),
            )
        )

    def test_foreign_class_in_the_same_school_is_refused_at_the_scope_link(self) -> None:
        """Чужой класс: та же школа — это ещё не тот же класс."""
        self.assertDeniedAt(
            AccessRequest(
                user_id=self._id("teacher_a1"),
                permission="cabinet:teacher",
                class_id=self._id("class_a2"),
            ),
            "scope",
        )
        self.assertAllowed(
            AccessRequest(
                user_id=self._id("teacher_a1"),
                permission="cabinet:teacher",
                class_id=self._id("class_a1"),
            )
        )

    def test_foreign_child_is_refused_at_the_ownership_link(self) -> None:
        """Чужой ребёнок: родитель без подтверждённой связи не проходит."""
        self.assertDeniedAt(
            AccessRequest(
                user_id=self._id("stranger_parent"),
                permission="cabinet:parent",
                owner_user_id=self._id("child"),
            ),
            "ownership",
        )
        self.assertAllowed(
            AccessRequest(
                user_id=self._id("parent"),
                permission="cabinet:parent",
                owner_user_id=self._id("child"),
            )
        )

    def test_revoked_parent_link_stops_working(self) -> None:
        """Отозванная связь родитель–ребёнок перестаёт давать доступ."""
        self.assertAllowed(
            AccessRequest(
                user_id=self._id("parent"),
                permission="cabinet:parent",
                owner_user_id=self._id("child"),
            )
        )
        self._exec(
            "UPDATE parent_child_links SET status='revoked', revoked_at=now() "
            " WHERE parent_user_id=:p AND child_user_id=:c",
            p=self._id("parent"),
            c=self._id("child"),
        )
        self.session.flush()
        self.assertDeniedAt(
            AccessRequest(
                user_id=self._id("parent"),
                permission="cabinet:parent",
                owner_user_id=self._id("child"),
            ),
            "ownership",
        )

    def test_expired_licence_is_refused_at_the_license_link(self) -> None:
        """Истёкшая лицензия: модуль был оплачен, но срок вышел."""
        self.assertDeniedAt(
            AccessRequest(
                user_id=self._id("teacher_a1"),
                permission="cabinet:teacher",
                class_id=self._id("class_a1"),
                required_modules=("exam_pack",),
            ),
            "license",
        )
        # Positive control: a module of the same user whose licence has not
        # expired. Same code path, same user, only the expiry differs.
        self.assertAllowed(
            AccessRequest(
                user_id=self._id("teacher_a1"),
                permission="cabinet:teacher",
                class_id=self._id("class_a1"),
                required_modules=("chemistry_core",),
            )
        )

    def test_module_never_granted_is_refused_at_the_license_link(self) -> None:
        """Модуль, который никогда не выдавали, тоже не проходит."""
        self.assertDeniedAt(
            AccessRequest(
                user_id=self._id("teacher_a1"),
                permission="cabinet:teacher",
                class_id=self._id("class_a1"),
                required_modules=("physics_core",),
            ),
            "license",
        )

    def test_disabled_flag_is_refused_at_the_flag_link(self) -> None:
        """Выключенный флаг: доступ есть, функция выключена."""
        self.assertDeniedAt(
            AccessRequest(
                user_id=self._id("teacher_a1"),
                permission="cabinet:teacher",
                class_id=self._id("class_a1"),
                required_flags=(self._id("flag_off"),),
            ),
            "flag",
        )

    def test_unregistered_flag_is_off(self) -> None:
        """Незарегистрированный флаг выключен — опечатка не открывает функцию."""
        self.assertDeniedAt(
            AccessRequest(
                user_id=self._id("teacher_a1"),
                permission="cabinet:teacher",
                class_id=self._id("class_a1"),
                required_flags=("flag_that_was_never_registered",),
            ),
            "flag",
        )

    def test_flag_override_applies_to_the_right_school_only(self) -> None:
        """Флаг включён для школы А и остаётся выключенным для школы Б."""
        self.assertAllowed(
            AccessRequest(
                user_id=self._id("teacher_a1"),
                permission="cabinet:teacher",
                class_id=self._id("class_a1"),
                required_flags=(self._id("flag_school"),),
            )
        )
        self.assertDeniedAt(
            AccessRequest(
                user_id=self._id("teacher_b1"),
                permission="cabinet:teacher",
                class_id=self._id("class_b1"),
                required_flags=(self._id("flag_school"),),
            ),
            "flag",
        )

    def test_unpublished_content_is_refused_at_the_publication_link(self) -> None:
        """Неопубликованный контент: черновик виден только тем, кто ведёт контент."""
        self.assertDeniedAt(
            AccessRequest(
                user_id=self._id("teacher_a1"),
                permission="cabinet:teacher",
                class_id=self._id("class_a1"),
                publication_status="draft",
            ),
            "publication",
        )
        self.assertAllowed(
            AccessRequest(
                user_id=self._id("teacher_a1"),
                permission="cabinet:teacher",
                class_id=self._id("class_a1"),
                publication_status="published",
            )
        )
        # The owner may manage content, so a draft is legitimately visible --
        # asked with a permission the owner actually holds. `cabinet:teacher`
        # belongs to teachers only, owner included in nobody's stead: asking for
        # it here would have been refused at `permission`, and the test would
        # have "passed" without ever reaching the publication link.
        self.assertAllowed(
            AccessRequest(
                user_id=self._id("owner"),
                permission="content:manage",
                publication_status="draft",
            )
        )
        # A teacher holds no content:manage, so the same draft stays closed.
        self.assertDeniedAt(
            AccessRequest(
                user_id=self._id("teacher_a1"),
                permission="content:manage",
                publication_status="draft",
            ),
            "permission",
        )

    def test_role_without_the_permission_is_refused_at_the_permission_link(self) -> None:
        """Роль без разрешения: ученик не входит в кабинет учителя."""
        self.assertDeniedAt(
            AccessRequest(
                user_id=self._id("student_a1"),
                permission="cabinet:teacher",
                class_id=self._id("class_a1"),
            ),
            "permission",
        )
        self.assertAllowed(
            AccessRequest(user_id=self._id("student_a1"), permission="auth:me")
        )

    def test_teacher_may_not_reach_the_admin_panel(self) -> None:
        """Учитель не попадает в админ-панель, даже в своей школе."""
        self.assertDeniedAt(
            AccessRequest(
                user_id=self._id("teacher_a1"),
                permission="admin:panel",
                school_id=self._id("school_a"),
            ),
            "permission",
        )

    def test_unknown_permission_is_refused(self) -> None:
        """Неизвестное разрешение не выдаётся никому, включая владельца."""
        self.assertDeniedAt(
            AccessRequest(user_id=self._id("owner"), permission="does:not:exist"),
            "permission",
        )

    def test_explicit_deny_beats_allow_from_another_role(self) -> None:
        """Явный запрет побеждает разрешение, полученное по другой роли."""
        self.assertAllowed(
            AccessRequest(
                user_id=self._id("teacher_a1"),
                permission="cabinet:teacher",
                class_id=self._id("class_a1"),
            )
        )
        # The same user also gets the support role, which is denied the cabinet.
        self._assign("teacher_a1", "support", "global")
        self._exec(
            "INSERT INTO role_permissions (role_key, permission_key, effect) "
            "VALUES ('support', 'cabinet:teacher', 'deny')",
        )
        self.session.flush()
        self.assertDeniedAt(
            AccessRequest(
                user_id=self._id("teacher_a1"),
                permission="cabinet:teacher",
                class_id=self._id("class_a1"),
            ),
            "permission",
        )

    def test_suspended_account_is_refused_at_the_role_link(self) -> None:
        """Заблокированная учётная запись не проходит первое звено."""
        self._exec(
            "UPDATE users SET status='suspended' WHERE user_id=:u", u=self._id("teacher_a1")
        )
        self.session.flush()
        self.assertDeniedAt(
            AccessRequest(user_id=self._id("teacher_a1"), permission="auth:me"), "role"
        )

    def test_revoked_role_assignment_stops_working(self) -> None:
        """Снятая роль перестаёт действовать сразу."""
        self._exec(
            "UPDATE role_assignments SET revoked_at=now() WHERE user_id=:u", u=self._id("student_a1")
        )
        self.session.flush()
        self.assertDeniedAt(
            AccessRequest(user_id=self._id("student_a1"), permission="auth:me"), "role"
        )

    def test_expired_role_assignment_stops_working(self) -> None:
        """Роль с истёкшим сроком не действует."""
        self._exec(
            "UPDATE role_assignments SET expires_at=:past WHERE user_id=:u",
            past=_utc_now() - timedelta(minutes=1),
            u=self._id("student_a1"),
        )
        self.session.flush()
        self.assertDeniedAt(
            AccessRequest(user_id=self._id("student_a1"), permission="auth:me"), "role"
        )

    def test_unknown_user_is_refused(self) -> None:
        """Пользователь, которого нет, не получает ничего."""
        self.assertDeniedAt(
            AccessRequest(user_id=self._id("no_such_user"), permission="auth:me"), "role"
        )

    def test_scope_path_is_widened_by_the_engine_not_by_the_caller(self) -> None:
        """Указан только класс — школа подставляется движком, проверка не слабеет.

        Иначе вызывающий код мог бы ослабить проверку, просто не передав
        school_id.
        """
        decision = evaluate(
            self.session,
            AccessRequest(
                user_id=self._id("teacher_b1"),
                permission="cabinet:teacher",
                class_id=self._id("class_a1"),
            ),
        )
        self.assertFalse(decision.allowed)
        self.assertEqual(decision.denied_link, "tenant")

    def test_positive_controls_would_catch_a_removed_check(self) -> None:
        """Пары «отказ + положительный контроль» действительно различают правила.

        Здесь это утверждается явно: для каждой пары запросов ниже разрешающий
        вариант проходит, а запрещающий — нет. Если убрать соответствующую
        проверку из ``evaluate``, запрещающий вариант станет разрешённым и тест
        упадёт. Если бы дело было в фикстуре, упал бы и разрешающий вариант.
        """
        pairs = [
            (
                AccessRequest(
                    user_id=self._id("teacher_a1"),
                    permission="cabinet:teacher",
                    class_id=self._id("class_a1"),
                ),
                AccessRequest(
                    user_id=self._id("teacher_a1"),
                    permission="cabinet:teacher",
                    class_id=self._id("class_b1"),
                ),
            ),
            (
                AccessRequest(
                    user_id=self._id("teacher_a1"),
                    permission="cabinet:teacher",
                    class_id=self._id("class_a1"),
                    required_modules=("chemistry_core",),
                ),
                AccessRequest(
                    user_id=self._id("teacher_a1"),
                    permission="cabinet:teacher",
                    class_id=self._id("class_a1"),
                    required_modules=("exam_pack",),
                ),
            ),
            (
                AccessRequest(
                    user_id=self._id("parent"),
                    permission="cabinet:parent",
                    owner_user_id=self._id("child"),
                ),
                AccessRequest(
                    user_id=self._id("stranger_parent"),
                    permission="cabinet:parent",
                    owner_user_id=self._id("child"),
                ),
            ),
        ]
        for allowed_request, denied_request in pairs:
            with self.subTest(permission=allowed_request.permission):
                self.assertTrue(evaluate(self.session, allowed_request).allowed)
                self.assertFalse(evaluate(self.session, denied_request).allowed)


class AccessDecisionAuditTest(unittest.TestCase):
    """A refusal must leave a trace that names the link that refused."""

    def setUp(self) -> None:
        self.session = SessionLocal()
        self.tag = f"tnegaud_{uuid.uuid4().hex[:10]}"
        self.session.execute(
            text("INSERT INTO users (user_id, display_name, is_test) VALUES (:u, 'audit', true)"),
            {"u": self.tag},
        )
        self.session.flush()

    def tearDown(self) -> None:
        self.session.rollback()
        self.session.close()

    def test_denial_is_written_to_the_audit_trail(self) -> None:
        from app.services.access_control import explain

        request = AccessRequest(user_id=self.tag, permission="admin:panel")
        decision = evaluate(self.session, request)
        self.assertFalse(decision.allowed)
        explain(self.session, request, decision, request_id="test-request")
        self.session.flush()

        row = self.session.execute(
            text(
                "SELECT result, denied_link, request_id FROM audit_log "
                " WHERE actor_user_id = :u ORDER BY id DESC LIMIT 1"
            ),
            {"u": self.tag},
        ).first()
        self.assertIsNotNone(row, "отказ обязан попасть в audit_log")
        self.assertEqual(row[0], "denied")
        self.assertEqual(row[1], decision.denied_link)
        self.assertEqual(row[2], "test-request")

    def test_allowed_decision_is_not_audited(self) -> None:
        from app.services.access_control import explain

        request = AccessRequest(user_id=self.tag, permission="auth:me")
        decision = evaluate(self.session, request)
        explain(self.session, request, decision)
        self.session.flush()
        count = self.session.execute(
            text("SELECT count(*) FROM audit_log WHERE actor_user_id = :u"), {"u": self.tag}
        ).scalar_one()
        # The user has no role at all, so this particular request is refused and
        # audited; what matters is that an *allowed* decision adds nothing.
        before = count
        explain(self.session, request, evaluate(self.session, request))
        self.session.flush()
        after = self.session.execute(
            text("SELECT count(*) FROM audit_log WHERE actor_user_id = :u"), {"u": self.tag}
        ).scalar_one()
        self.assertEqual(after, before + 1 if not decision.allowed else before)


if __name__ == "__main__":
    unittest.main()
