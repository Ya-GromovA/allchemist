import type { ApiClientConfig } from "./config";
import { HttpClient } from "./http";
import { createAccessClient } from "./access";
import { createAdminClient } from "./admin";
import { createAiTutorClient } from "./ai-tutor";
import { createAnalyticsClient } from "./analytics";
import { createAuthClient } from "./auth";
import { createBiologyClient } from "./biology";
import { createCabinetClient } from "./cabinet";
import { createChemistryClient } from "./chemistry";
import { createContentClient } from "./content";
import { createContentQaClient } from "./content-qa";
import { createMediaClient } from "./media";
import { createPaymentsClient } from "./payments";
import { createPhysicsClient } from "./physics";
import { createProgressClient } from "./progress";
import { createSchoolsClient } from "./schools";
import { createScienceClient } from "./science";
import { createSourcesClient } from "./sources";
import { createUsersClient } from "./users";

export function createAllchemistApiClient(config: ApiClientConfig) {
  const http = new HttpClient(config);
  return {
    http,
    auth: createAuthClient(http),
    users: createUsersClient(http),
    access: createAccessClient(http),
    schools: createSchoolsClient(http),
    payments: createPaymentsClient(http),
    content: createContentClient(http),
    contentQa: createContentQaClient(http),
    sources: createSourcesClient(http),
    admin: createAdminClient(http),
    cabinet: createCabinetClient(http),
    progress: createProgressClient(http),
    aiTutor: createAiTutorClient(http),
    science: createScienceClient(http),
    chemistry: createChemistryClient(http),
    physics: createPhysicsClient(http),
    biology: createBiologyClient(http),
    media: createMediaClient(http),
    analytics: createAnalyticsClient(http),
  };
}

export type AllchemistApiClient = ReturnType<typeof createAllchemistApiClient>;
