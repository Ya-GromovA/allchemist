from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class APIModel(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class SubjectOut(APIModel):
    id: str
    name: str
    name_ru: str = Field(alias="nameRu")


class GradeOut(APIModel):
    id: str
    number: int


class TopicOut(APIModel):
    id: str
    title: str
    title_ru: str = Field(alias="titleRu")
    order: int


class LessonOut(APIModel):
    id: str
    title: str
    title_ru: str = Field(alias="titleRu")
    description: str
    description_ru: str = Field(alias="descriptionRu")
    status: str


class ModuleOut(APIModel):
    id: str
    type: str
    order: int


class HomeModuleOut(APIModel):
    id: str
    title: str
    title_ru: str = Field(alias="titleRu")
    description: str
    available: bool


class TheoryContentOut(APIModel):
    id: str
    goals: List[str]
    key_terms: List[str] = Field(alias="keyTerms")
    content_blocks: List[Dict[str, Any]] = Field(alias="contentBlocks")
    examples: List[Dict[str, Any]]


class PracticeContentOut(APIModel):
    id: str
    tasks: List[Dict[str, Any]]


class QuestionOut(APIModel):
    prompt: str
    choices: List[str]
    correct_index: int = Field(alias="correctIndex")


class QuizOut(APIModel):
    id: str
    questions: List[QuestionOut]


class AttemptIn(APIModel):
    answers: List[int]


class AttemptOut(APIModel):
    score: int
    total: int
    correct: List[bool]


class LabOut(APIModel):
    id: str
    subject: str
    grade: int
    title: str
    title_ru: str = Field(alias="titleRu")
    description: str
    description_ru: str = Field(alias="descriptionRu")
    lab_type: str = Field(alias="labType")
    difficulty: str
    estimated_time_min: int = Field(alias="estimatedTimeMin")
    learning_goals: List[str] = Field(alias="learningGoals")
    required_theory_refs: List[str] = Field(alias="requiredTheoryRefs")
    safety_notes: List[str] = Field(alias="safetyNotes")
    payload: Dict[str, Any]


class LabSessionIn(APIModel):
    parameters: Dict[str, Any]


class LabSessionOut(APIModel):
    session_id: str = Field(alias="sessionId")
    outcome: Dict[str, Any]


class AIMentorContext(APIModel):
    subject: Optional[str] = None
    grade: Optional[int] = None
    topic_id: Optional[str] = Field(default=None, alias="topicId")


class AIMentorRequest(APIModel):
    question: str
    context: Optional[AIMentorContext] = None


class AIMentorResponse(APIModel):
    answer: str


class ConsentAcceptIn(APIModel):
    user_id: str = Field(alias="userId")
    role: str
    version: str
    accepted_at: Optional[str] = Field(default=None, alias="acceptedAt")
    parent_approved: bool = Field(default=False, alias="parentApproved")


class ConsentOut(APIModel):
    user_id: str = Field(alias="userId")
    role: str
    version: str
    accepted_at: str = Field(alias="acceptedAt")
    parent_approved: bool = Field(alias="parentApproved")


class EntitlementOut(APIModel):
    user_id: str = Field(alias="userId")
    plans: List[str]
    modules: List[str]
    ai_quota_left: int = Field(alias="aiQuotaLeft")


class DeviceSyncIn(APIModel):
    user_id: str = Field(alias="userId")
    content_versions: Dict[str, str] = Field(alias="contentVersions")
    purchases: List[str]
    preferences: Dict[str, Any]


class DeviceSyncOut(APIModel):
    user_id: str = Field(alias="userId")
    content_versions: Dict[str, str] = Field(alias="contentVersions")
    purchases: List[str]
    preferences: Dict[str, Any]


class TelemetryEventIn(APIModel):
    name: str
    user_id: Optional[str] = Field(default=None, alias="userId")
    role: Optional[str] = None
    payload: Dict[str, Any] = Field(default_factory=dict)


class TelemetryBatchIn(APIModel):
    events: List[TelemetryEventIn]


class LearningEventIn(APIModel):
    event_type: str = Field(alias="eventType")
    user_id: Optional[str] = Field(default=None, alias="userId")
    role: Optional[str] = None
    module_id: Optional[str] = Field(default=None, alias="moduleId")
    lesson_id: Optional[str] = Field(default=None, alias="lessonId")
    task_id: Optional[str] = Field(default=None, alias="taskId")
    outcome: Optional[str] = None
    session_id: Optional[str] = Field(default=None, alias="sessionId")
    classroom: Optional[str] = None
    mistake_tag: Optional[str] = Field(default=None, alias="mistakeTag")
    payload: Dict[str, Any] = Field(default_factory=dict)


class LearningBatchIn(APIModel):
    events: List[LearningEventIn]


class PhoneCodeRequestIn(APIModel):
    phone: str


class PhoneCodeRequestOut(APIModel):
    phone: str
    expires_at: str = Field(alias="expiresAt")
    debug_code: Optional[str] = Field(default=None, alias="debugCode")
    sms_status: str = Field(alias="smsStatus")


class PhoneCodeVerifyIn(APIModel):
    phone: str
    code: str
    local_user_id: Optional[str] = Field(default=None, alias="localUserId")
    local_purchases: List[str] = Field(default_factory=list, alias="localPurchases")
    local_content_versions: Dict[str, str] = Field(default_factory=dict, alias="localContentVersions")
    local_preferences: Dict[str, Any] = Field(default_factory=dict, alias="localPreferences")


class PhoneCodeVerifyOut(APIModel):
    user_id: str = Field(alias="userId")
    phone: str
    display_name: Optional[str] = Field(default=None, alias="displayName")
    role: str = "student"
    active_role: str = Field(default="student", alias="activeRole")
    available_roles: List[Dict[str, Any]] = Field(default_factory=list, alias="availableRoles")
    school_memberships: List[Dict[str, Any]] = Field(default_factory=list, alias="schoolMemberships")
    class_memberships: List[Dict[str, Any]] = Field(default_factory=list, alias="classMemberships")
    subscriptions: List[Dict[str, Any]] = Field(default_factory=list)
    grants: List[Dict[str, Any]] = Field(default_factory=list)
    capabilities: Dict[str, Any] = Field(default_factory=dict)
    feature_flags: Dict[str, Any] = Field(default_factory=dict, alias="featureFlags")
    access_token: str = Field(alias="accessToken")
    access_token_expires_at: str = Field(alias="accessTokenExpiresAt")
    refresh_token: str = Field(alias="refreshToken")
    refresh_token_expires_at: str = Field(alias="refreshTokenExpiresAt")


class AuthLoginIn(APIModel):
    login: str
    password: str


class AuthLoginOut(APIModel):
    user_id: str = Field(alias="userId")
    login: str
    display_name: Optional[str] = Field(default=None, alias="displayName")
    role: str
    active_role: str = Field(alias="activeRole")
    available_roles: List[Dict[str, Any]] = Field(default_factory=list, alias="availableRoles")
    school_memberships: List[Dict[str, Any]] = Field(default_factory=list, alias="schoolMemberships")
    class_memberships: List[Dict[str, Any]] = Field(default_factory=list, alias="classMemberships")
    subscriptions: List[Dict[str, Any]] = Field(default_factory=list)
    grants: List[Dict[str, Any]] = Field(default_factory=list)
    capabilities: Dict[str, Any] = Field(default_factory=dict)
    feature_flags: Dict[str, Any] = Field(default_factory=dict, alias="featureFlags")
    access_token: str = Field(alias="accessToken")
    access_token_expires_at: str = Field(alias="accessTokenExpiresAt")
    refresh_token: str = Field(alias="refreshToken")
    refresh_token_expires_at: str = Field(alias="refreshTokenExpiresAt")


class AuthPasswordResetByCodeIn(APIModel):
    login: str
    code: str
    password: str
    password_confirm: str = Field(alias="passwordConfirm")


class AuthChangePasswordIn(APIModel):
    current_password: str = Field(alias="currentPassword")
    new_password: str = Field(alias="newPassword")
    new_password_confirm: str = Field(alias="newPasswordConfirm")


class AuthRoleSwitchIn(APIModel):
    role: str


class AuthRefreshIn(APIModel):
    refresh_token: str = Field(alias="refreshToken")


class AuthRefreshOut(APIModel):
    access_token: str = Field(alias="accessToken")
    access_token_expires_at: str = Field(alias="accessTokenExpiresAt")
    refresh_token: str = Field(alias="refreshToken")
    refresh_token_expires_at: str = Field(alias="refreshTokenExpiresAt")


class AuthLogoutIn(APIModel):
    refresh_token: str = Field(alias="refreshToken")


class AuthMeOut(APIModel):
    user_id: str = Field(alias="userId")
    display_name: Optional[str] = Field(default=None, alias="displayName")
    role: str
    active_role: str = Field(alias="activeRole")
    available_roles: List[Dict[str, Any]] = Field(default_factory=list, alias="availableRoles")
    school_memberships: List[Dict[str, Any]] = Field(default_factory=list, alias="schoolMemberships")
    class_memberships: List[Dict[str, Any]] = Field(default_factory=list, alias="classMemberships")
    subscriptions: List[Dict[str, Any]] = Field(default_factory=list)
    grants: List[Dict[str, Any]] = Field(default_factory=list)
    capabilities: Dict[str, Any] = Field(default_factory=dict)
    feature_flags: Dict[str, Any] = Field(default_factory=dict, alias="featureFlags")
    access_token_expires_at: str = Field(alias="accessTokenExpiresAt")


class UserProfileOut(APIModel):
    user_id: str = Field(alias="userId")
    display_name: Optional[str] = Field(default=None, alias="displayName")
    role: str
    active_role: str = Field(alias="activeRole")
    available_roles: List[Dict[str, Any]] = Field(default_factory=list, alias="availableRoles")
    school_memberships: List[Dict[str, Any]] = Field(default_factory=list, alias="schoolMemberships")
    class_memberships: List[Dict[str, Any]] = Field(default_factory=list, alias="classMemberships")
    subscriptions: List[Dict[str, Any]] = Field(default_factory=list)
    grants: List[Dict[str, Any]] = Field(default_factory=list)
    capabilities: Dict[str, Any] = Field(default_factory=dict)
    feature_flags: Dict[str, Any] = Field(default_factory=dict, alias="featureFlags")
    plans: List[str]
    modules: List[str]
    preferences: Dict[str, Any]
    role_data: Dict[str, Any] = Field(alias="roleData")


class PaymentCreateIn(APIModel):
    provider: str
    module_id: str = Field(alias="moduleId")
    amount_rub: int = Field(alias="amountRub")
    return_url: Optional[str] = Field(default=None, alias="returnUrl")
    idempotency_key: Optional[str] = Field(default=None, alias="idempotencyKey")


class PaymentCreateOut(APIModel):
    payment_id: str = Field(alias="paymentId")
    provider: str
    status: str
    amount_rub: int = Field(alias="amountRub")
    currency: str
    checkout_url: str = Field(alias="checkoutUrl")
    module_id: str = Field(alias="moduleId")
    idempotency_key: Optional[str] = Field(default=None, alias="idempotencyKey")


class PaymentStatusOut(APIModel):
    payment_id: str = Field(alias="paymentId")
    provider: str
    status: str
    amount_rub: int = Field(alias="amountRub")
    module_id: str = Field(alias="moduleId")
    paid_at: Optional[str] = Field(default=None, alias="paidAt")
    failure_reason: Optional[str] = Field(default=None, alias="failureReason")


class PaymentWebhookIn(APIModel):
    payment_id: str = Field(alias="paymentId")
    status: str
    amount_rub: Optional[int] = Field(default=None, alias="amountRub")
    module_id: Optional[str] = Field(default=None, alias="moduleId")
    event_id: Optional[str] = Field(default=None, alias="eventId")
    payload: Dict[str, Any] = Field(default_factory=dict)


class TeacherCabinetOut(APIModel):
    user_id: str = Field(alias="userId")
    role: str
    classes: List[Dict[str, Any]]
    homework_summary: Dict[str, Any] = Field(alias="homeworkSummary")
    analytics: Dict[str, Any]


class ParentCabinetOut(APIModel):
    user_id: str = Field(alias="userId")
    role: str
    children: List[Dict[str, Any]]
    alerts: List[Dict[str, Any]]
    recommendations: List[str]


class ChildProgressOut(APIModel):
    child_id: str = Field(alias="childId")
    solved_tasks: int = Field(alias="solvedTasks")
    exams_started: int = Field(alias="examsStarted")
    weak_topics: List[str] = Field(alias="weakTopics")


class AdminRoleSetIn(APIModel):
    user_id: str = Field(alias="userId")
    role: str


class AdminScopeOverrideIn(APIModel):
    role: str
    scope: str
    allow: bool


class AdminSubscriptionGrantIn(APIModel):
    user_id: str = Field(alias="userId")
    plan: Optional[str] = None
    module_id: Optional[str] = Field(default=None, alias="moduleId")


class AdminSubscriptionRevokeIn(APIModel):
    user_id: str = Field(alias="userId")
    plan: Optional[str] = None
    module_id: Optional[str] = Field(default=None, alias="moduleId")


class AdminAccessGrantIn(APIModel):
    user_id: str = Field(alias="userId")
    source_type: str = Field(alias="sourceType")
    title: Optional[str] = None
    plan: Optional[str] = None
    module_id: Optional[str] = Field(default=None, alias="moduleId")
    feature: Optional[str] = None
    organization_id: Optional[str] = Field(default=None, alias="organizationId")
    school_id: Optional[str] = Field(default=None, alias="schoolId")
    site_id: Optional[str] = Field(default=None, alias="siteId")
    license_id: Optional[str] = Field(default=None, alias="licenseId")
    expires_at: Optional[str] = Field(default=None, alias="expiresAt")
    price_rub: Optional[int] = Field(default=None, alias="priceRub")


class AdminBulkSubscriptionIn(APIModel):
    action: str
    query: Optional[str] = None
    role: Optional[str] = None
    plan: Optional[str] = None
    module_id: Optional[str] = Field(default=None, alias="moduleId")
    dry_run: bool = Field(default=True, alias="dryRun")
    limit: int = 300


class AdminBootstrapOwnerIn(APIModel):
    user_id: str = Field(alias="userId")
    secret: str


class AdminSchoolCreateIn(APIModel):
    title: str
    organization_title: Optional[str] = Field(default=None, alias="organizationTitle")
    site_title: Optional[str] = Field(default=None, alias="siteTitle")
    status: str = "active"


class AdminSchoolClassIn(APIModel):
    class_id: Optional[str] = Field(default=None, alias="classId")
    school_id: str = Field(alias="schoolId")
    site_id: Optional[str] = Field(default=None, alias="siteId")
    title: str
    subject: Optional[str] = None
    teacher_user_id: Optional[str] = Field(default=None, alias="teacherUserId")


class AdminInviteCodeIn(APIModel):
    class_id: Optional[str] = Field(default=None, alias="classId")
    school_id: str = Field(alias="schoolId")
    site_id: Optional[str] = Field(default=None, alias="siteId")
    role: str
    title: Optional[str] = None
    subject: Optional[str] = None
    expires_at: Optional[str] = Field(default=None, alias="expiresAt")
    max_activations: int = Field(default=1, alias="maxActivations")
    teacher_user_id: Optional[str] = Field(default=None, alias="teacherUserId")
    student_label: Optional[str] = Field(default=None, alias="studentLabel")


class AdminPasswordResetCodeIn(APIModel):
    ttl_hours: int = Field(default=72, alias="ttlHours")


class InviteActivateIn(APIModel):
    code: str
    phone: str
    user_id: Optional[str] = Field(default=None, alias="userId")
    display_name: Optional[str] = Field(default=None, alias="displayName")
    login: Optional[str] = None
    password: Optional[str] = None
    password_confirm: Optional[str] = Field(default=None, alias="passwordConfirm")


class InvitePreviewIn(APIModel):
    code: str


class InvitePreviewOut(APIModel):
    code: str
    status: str
    status_label_ru: str = Field(alias="statusLabelRu")
    school_id: Optional[str] = Field(default=None, alias="schoolId")
    school_title: Optional[str] = Field(default=None, alias="schoolTitle")
    site_id: Optional[str] = Field(default=None, alias="siteId")
    site_title: Optional[str] = Field(default=None, alias="siteTitle")
    class_id: Optional[str] = Field(default=None, alias="classId")
    class_title: Optional[str] = Field(default=None, alias="classTitle")
    role: str
    role_label_ru: str = Field(alias="roleLabelRu")
    expires_at: Optional[str] = Field(default=None, alias="expiresAt")
    license_title: Optional[str] = Field(default=None, alias="licenseTitle")
    modules: List[str] = Field(default_factory=list)
    features: List[str] = Field(default_factory=list)
    modules_label_ru: Optional[str] = Field(default=None, alias="modulesLabelRu")
    message_ru: str = Field(alias="messageRu")


class InviteActivateOut(APIModel):
    user_id: str = Field(alias="userId")
    phone: str
    login: Optional[str] = None
    role: str
    display_name: Optional[str] = Field(default=None, alias="displayName")
    active_role: str = Field(alias="activeRole")
    available_roles: List[Dict[str, Any]] = Field(default_factory=list, alias="availableRoles")
    school_memberships: List[Dict[str, Any]] = Field(default_factory=list, alias="schoolMemberships")
    class_memberships: List[Dict[str, Any]] = Field(default_factory=list, alias="classMemberships")
    subscriptions: List[Dict[str, Any]] = Field(default_factory=list)
    grants: List[Dict[str, Any]] = Field(default_factory=list)
    capabilities: Dict[str, Any] = Field(default_factory=dict)
    feature_flags: Dict[str, Any] = Field(default_factory=dict, alias="featureFlags")
    role_label_ru: str = Field(alias="roleLabelRu")
    school_id: Optional[str] = Field(default=None, alias="schoolId")
    site_id: Optional[str] = Field(default=None, alias="siteId")
    class_id: Optional[str] = Field(default=None, alias="classId")
    access_token: str = Field(alias="accessToken")
    access_token_expires_at: str = Field(alias="accessTokenExpiresAt")
    refresh_token: str = Field(alias="refreshToken")
    refresh_token_expires_at: str = Field(alias="refreshTokenExpiresAt")


class AdminCreateUserIn(APIModel):
    user_id: Optional[str] = Field(default=None, alias="userId")
    phone: str
    role: str = "student"
    plan: Optional[str] = None
    module_id: Optional[str] = Field(default=None, alias="moduleId")
