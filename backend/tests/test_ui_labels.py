from app.services.ui_labels import (
    access_source_label,
    module_label,
    plan_label,
    platform_label,
    role_label,
    status_label,
)


def test_required_ui_labels_do_not_expose_technical_keys() -> None:
    cases = {
        "student": role_label("student"),
        "teacher": role_label("teacher"),
        "homeroom_teacher": role_label("homeroom_teacher"),
        "Pro Monthly": plan_label("pro_monthly"),
        "School Quarter": plan_label("school_quarter"),
        "Family Year": plan_label("family_year"),
        "biology_core": module_label("biology_core"),
        "chemistry_basic": module_label("chemistry_basic"),
        "chemistry_labs_advanced": module_label("chemistry_labs_advanced"),
        "physics_basic": module_label("physics_basic"),
        "exam_pack": module_label("exam_pack"),
        "ai_basic": module_label("ai_basic"),
        "ai_extended": module_label("ai_extended"),
        "offline_pack": module_label("offline_pack"),
        "structured_plan_with_verified_gates": status_label("structured_plan_with_verified_gates"),
        "standard": status_label("standard"),
        "web": platform_label("web"),
        "browser": platform_label("browser"),
        "mobile": platform_label("mobile"),
        "partner_license": access_source_label("partner_license"),
    }
    for raw_key, label in cases.items():
        assert label
        assert label != raw_key
        assert "_" not in label
        assert label not in {"web", "browser", "mobile", "standard"}


def test_unknown_labels_fall_back_only_for_debug_or_admin_context() -> None:
    assert module_label("unknown_module") == "unknown_module"
