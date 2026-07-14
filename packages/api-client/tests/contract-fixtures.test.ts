import authLoginFixture from "./fixtures/contracts/auth-login.json";
import authMeFixture from "./fixtures/contracts/auth-me.json";
import entitlementsFixture from "./fixtures/contracts/access-entitlements.json";
import adminDashboardFixture from "./fixtures/contracts/admin-dashboard.json";
import teacherCabinetFixture from "./fixtures/contracts/teacher-cabinet.json";
import parentCabinetFixture from "./fixtures/contracts/parent-cabinet.json";
import contentQaQueueFixture from "./fixtures/contracts/content-qa-queue.json";
import progressSyncFixture from "./fixtures/contracts/progress-sync.json";
import moleculesFixture from "./fixtures/contracts/chemistry-molecules.json";
import reactionsFixture from "./fixtures/contracts/chemistry-reactions.json";
import paymentFixture from "./fixtures/contracts/payment-subscription.json";
import type {
  AuthContext,
  LoginResponse,
  Entitlement,
  Payment,
  ProgressSyncResponse,
  Molecule,
  Reaction,
  TeacherCabinetSummary,
  ParentCabinetSummary,
} from "../src";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

type ContractFixture<T> = T & { contractFixture: boolean };

export function testAuthMeFixtureShape() {
  const fixture = authMeFixture as unknown as ContractFixture<AuthContext>;
  assert(fixture.contractFixture === true, "auth me is contract fixture");
  assert(fixture.role === "student", "auth role shape");
}

export function testAuthLoginFixtureShape() {
  const fixture = authLoginFixture as unknown as ContractFixture<LoginResponse>;
  assert(Boolean(fixture.accessToken), "login has access token");
}

export function testEntitlementsFixtureShape() {
  const fixture = entitlementsFixture as unknown as ContractFixture<Entitlement>;
  assert(fixture.modules.includes("chemistry"), "entitlements modules shape");
}

export function testAdminDashboardFixtureShape() {
  const fixture = adminDashboardFixture as unknown as ContractFixture<Record<string, unknown>>;
  assert(typeof fixture.summary === "object", "admin dashboard remains raw dict");
}

export function testCabinetFixtureShapes() {
  const teacher = teacherCabinetFixture as unknown as ContractFixture<TeacherCabinetSummary>;
  const parent = parentCabinetFixture as unknown as ContractFixture<ParentCabinetSummary>;
  assert(teacher.role === "teacher", "teacher cabinet shape");
  assert(parent.role === "parent", "parent cabinet shape");
}

export function testContentQaQueueFixtureShape() {
  const fixture = contentQaQueueFixture as unknown as ContractFixture<{ queues: Array<{ status: string; items: unknown[]; count: number }> }>;
  assert(fixture.queues[0]?.status === "draft", "content QA queue shape");
}

export function testProgressSyncFixtureShape() {
  const fixture = progressSyncFixture as unknown as ContractFixture<ProgressSyncResponse>;
  assert(fixture.acceptedTaskIds.length === 1, "progress sync shape");
}

export function testScienceFixturesShape() {
  const molecules = moleculesFixture as unknown as ContractFixture<{ molecules: Molecule[]; count: number }>;
  const reactions = reactionsFixture as unknown as ContractFixture<{ reactions: Reaction[]; count: number }>;
  assert(molecules.molecules[0]?.formula === "H2O", "molecule shape");
  assert(reactions.reactions[0]?.equation === "A + B -> C", "reaction shape");
}

export function testPaymentFixtureShape() {
  const fixture = paymentFixture as unknown as ContractFixture<Payment>;
  assert(fixture.status === "pending", "payment status shape");
}
