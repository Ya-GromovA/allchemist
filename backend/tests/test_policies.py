import unittest

from app.security.policies import can, normalize_role


class PoliciesUnitTest(unittest.TestCase):
    def test_normalize_role(self) -> None:
        self.assertEqual(normalize_role(" Student "), "student")
        self.assertEqual(normalize_role(None), "")

    def test_known_scope_access(self) -> None:
        self.assertTrue(can("student", "auth:me"))
        self.assertTrue(can("teacher", "user:profile_self"))
        self.assertTrue(can("parent", "telemetry:write_self"))
        self.assertTrue(can("teacher", "payments:admin"))
        self.assertTrue(can("admin", "admin:panel"))
        self.assertTrue(can("owner", "admin:roles"))
        self.assertTrue(can("teacher", "cabinet:teacher"))
        self.assertTrue(can("parent", "cabinet:parent"))

    def test_unknown_scope_or_role(self) -> None:
        self.assertFalse(can("guest", "auth:me"))
        self.assertFalse(can("student", "unknown:scope"))
        self.assertFalse(can("student", "payments:admin"))
        self.assertFalse(can("teacher", "cabinet:parent"))
        self.assertFalse(can("parent", "admin:panel"))


if __name__ == "__main__":
    unittest.main()
