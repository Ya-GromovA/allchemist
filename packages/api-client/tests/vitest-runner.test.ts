import { describe, it } from "vitest";
import { testAccessHelper } from "./access.test";
import { testLoginEndpoint } from "./auth.test";
import { testContentQaFixtureShape } from "./content-qa.test";
import {
  testAuthLoginFixtureShape,
  testAuthMeFixtureShape,
  testEntitlementsFixtureShape,
  testAdminDashboardFixtureShape,
  testCabinetFixtureShapes,
  testContentQaQueueFixtureShape,
  testProgressSyncFixtureShape,
  testScienceFixturesShape,
  testPaymentFixtureShape,
} from "./contract-fixtures.test";
import {
  testAuthHeaderInjection,
  testBaseRequestSuccess,
  testEmptyResponseHandling,
  testErrorMapping,
  testNetworkError,
  testRefreshCallbackPath,
} from "./http.test";
import { testStableMethodReturnTypes } from "./method-return-types.test";
import { testMoleculeReactionFixtureShapes } from "./science.test";

describe("api-client contract runtime tests", () => {
  it("handles base request success and JSON parsing", testBaseRequestSuccess);
  it("handles empty responses", testEmptyResponseHandling);
  it("injects auth headers", testAuthHeaderInjection);
  it("retries once through refresh callback", testRefreshCallbackPath);
  it("maps HTTP errors", testErrorMapping);
  it("maps network errors", testNetworkError);
  it("runs auth client login through mocked fetch", testLoginEndpoint);
  it("checks access helper", testAccessHelper);
  it("parses content QA fixture shape", testContentQaFixtureShape);
  it("parses molecule/reaction fixture shapes", testMoleculeReactionFixtureShapes);
  it("validates contract auth/me fixture", testAuthMeFixtureShape);
  it("validates contract auth/login fixture", testAuthLoginFixtureShape);
  it("validates entitlements fixture", testEntitlementsFixtureShape);
  it("validates admin dashboard fixture", testAdminDashboardFixtureShape);
  it("validates cabinet fixtures", testCabinetFixtureShapes);
  it("validates content QA queue fixture", testContentQaQueueFixtureShape);
  it("validates progress sync fixture", testProgressSyncFixtureShape);
  it("validates science contract fixtures", testScienceFixturesShape);
  it("validates payment fixture", testPaymentFixtureShape);
  it("checks stable API-client method return types", testStableMethodReturnTypes);
});
