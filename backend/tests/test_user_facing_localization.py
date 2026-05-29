from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


USER_FACING_FILES = [
    ROOT / "backend/app/web_public/index.html",
    ROOT / "backend/app/web_public/app.js",
    ROOT / "backend/app/web_admin/index.html",
    ROOT / "backend/app/web_admin/app.js",
    ROOT / "mobile/app/screens/HomeScreen.tsx",
    ROOT / "mobile/app/screens/OnboardingRoleScreen.tsx",
    ROOT / "mobile/app/screens/CabinetScreen.tsx",
    ROOT / "mobile/app/screens/PhysicsLessonsScreen.tsx",
    ROOT / "mobile/app/screens/WebFallbackShell.tsx",
]


FORBIDDEN_USER_FACING_STRINGS = [
    "Pro Monthly",
    "School Quarter",
    "Family Year",
    "Ученик / студент",
    "browser cache",
    "user web",
    "MVP baseline",
    "Student/parent/teacher mode",
    "Add at least one studentId",
    "Start live session first",
    "Teacher Live",
    "Teacher live (real-time)",
    "QR generating",
    "Join code",
    "Participants",
    "High-risk",
    "live-демо",
    "Live-демо",
    "Открыть live",
    "Web live-урок",
    "live-работа",
]


def test_user_facing_ui_has_no_known_technical_or_english_labels() -> None:
    offenders: list[str] = []
    for path in USER_FACING_FILES:
        assert path.exists(), f"Файл не найден: {path}"
        text = path.read_text(encoding="utf-8")
        for forbidden in FORBIDDEN_USER_FACING_STRINGS:
            if forbidden in text:
                offenders.append(f"{path.relative_to(ROOT)}: {forbidden}")
    assert not offenders, "Найдены user-facing технические или английские строки:\n" + "\n".join(offenders)
