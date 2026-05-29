from __future__ import annotations

from typing import Mapping


ROLE_LABELS_RU: dict[str, str] = {
    "owner": "Владелец",
    "admin": "Администратор системы",
    "school_admin": "Администратор школы",
    "teacher": "Учитель",
    "homeroom_teacher": "Классный руководитель",
    "student": "Учащийся",
    "learner": "Учащийся",
    "parent": "Родитель",
    "content_editor": "Редактор контента",
    "support": "Поддержка",
}

PLAN_LABELS_RU: dict[str, str] = {
    "free": "Бесплатный доступ",
    "basic": "Базовый доступ",
    "pro": "Полный доступ",
    "partner_school_full": "Партнёрская школьная лицензия",
    "family_ai_pro": "Семейный доступ с AI",
    "student_full": "Полный доступ учащегося",
    "school_quarter": "Школьный доступ на 3 месяца",
    "family_year": "Семейный доступ на год",
    "pro_monthly": "Личный доступ на месяц",
}

ACCESS_SOURCE_LABELS_RU: dict[str, str] = {
    "free": "Бесплатный доступ",
    "personal_subscription": "Личная подписка",
    "family_subscription": "Семейная подписка",
    "school_license": "Школьная лицензия",
    "university_license": "Вузовская лицензия",
    "promo": "Промодоступ",
    "manual": "Ручная выдача администратором",
    "manual_grant": "Ручная выдача администратором",
    "partner_license": "Партнёрская школьная лицензия",
    "admin_override": "Административное расширение доступа",
    "trial": "Временный ознакомительный доступ",
    "lifetime_purchase": "Пожизненная покупка",
}

MODULE_LABELS_RU: dict[str, str] = {
    "chemistry": "Химия",
    "physics": "Физика",
    "biology": "Биология",
    "chemistry_core": "Химия: базовый курс",
    "chemistry_basic": "Химия: базовый курс",
    "chemistry_labs_advanced": "Химия: расширенные лабораторные",
    "physics_core": "Физика: базовый курс",
    "physics_basic": "Физика: базовый курс",
    "biology_core": "Биология: базовый курс",
    "biology_preview": "Биология: вводный модуль",
    "chemistry_pro_lab": "Химия: расширенные лабораторные",
    "exam_pack": "Подготовка к экзаменам",
    "organic_pro": "Органическая химия: углублённый уровень",
    "ai_basic": "AI-помощник",
    "ai_extended": "Расширенный AI-помощник",
    "ai_mentor": "AI-помощник",
    "offline_pack": "Офлайн-материалы",
    "teacher_live": "Онлайн-уроки учителя",
}

FEATURE_LABELS_RU: dict[str, str] = {
    "molecules_3d": "3D-модели молекул",
    "virtual_reactions": "Виртуальные реакции",
    "virtual_labs": "Виртуальные лабораторные",
    "ai_basic": "AI-помощник",
    "ai_extended": "Расширенный AI-помощник",
    "offline_ai": "Офлайн-AI",
    "teacher_cabinet": "Кабинет учителя",
    "live_lesson": "Онлайн-урок",
    "lesson_demo": "Демонстрация на уроке",
    "parent_analytics": "Родительская аналитика",
    "exam_mode": "Экзаменационный режим",
    "tickets_mode": "Подготовка по билетам",
    "offline_mode": "Офлайн-режим",
}

STATUS_LABELS_RU: dict[str, str] = {
    "structured_plan_with_verified_gates": "Проверенный учебный план",
    "draft_training_template": "Учебный черновик для тренировки",
    "user_private_analysis": "Личный разбор пользователя",
    "draft": "Черновик",
    "author_review": "Проверка автором",
    "scientific_review": "Научная проверка",
    "methodist_review": "Методическая проверка",
    "content_qa": "Проверка качества контента",
    "legal_review": "Юридическая проверка",
    "published": "Опубликовано",
    "archived": "Архив",
    "standard": "Стандартный режим",
}

PLATFORM_LABELS_RU: dict[str, str] = {
    "web": "Веб-кабинет",
    "browser": "Браузер",
    "mobile": "Мобильное приложение",
    "android": "Android-приложение",
    "ios": "iOS-приложение",
}


def label_from(mapping: Mapping[str, str], value: str | None, fallback: str = "—") -> str:
    key = str(value or "").strip()
    return mapping.get(key, fallback if not key else key)


def role_label(value: str | None) -> str:
    return label_from(ROLE_LABELS_RU, value)


def plan_label(value: str | None) -> str:
    return label_from(PLAN_LABELS_RU, value)


def module_label(value: str | None) -> str:
    return label_from(MODULE_LABELS_RU, value)


def feature_label(value: str | None) -> str:
    return label_from(FEATURE_LABELS_RU, value)


def access_source_label(value: str | None) -> str:
    return label_from(ACCESS_SOURCE_LABELS_RU, value)


def status_label(value: str | None) -> str:
    return label_from(STATUS_LABELS_RU, value)


def platform_label(value: str | None) -> str:
    return label_from(PLATFORM_LABELS_RU, value)
