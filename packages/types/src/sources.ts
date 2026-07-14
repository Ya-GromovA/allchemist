import type { ID, ISODateTime } from "./common";
import type { VerificationStatus } from "./science";

export type SourceType =
  | "official_standard"
  | "textbook_reference"
  | "scientific_database"
  | "methodist_material"
  | "open_dataset"
  | "internal_review"
  | "other";

export type SourceReliability = "high" | "high_after_review" | "medium" | "low" | "unverified";

export interface SourceReference {
  sourceId: ID;
  url?: string;
  titleRu?: string;
  citation?: string;
  accessedAt?: ISODateTime;
  verificationStatus?: VerificationStatus;
}

export interface ContentSource {
  id: ID;
  titleRu: string;
  organizationRu?: string | null;
  url?: string | null;
  licenseStatus: string;
  usageRu?: string | null;
  trustLevel: SourceReliability | string;
  accessedAt?: ISODateTime | null;
  updatedAt?: ISODateTime;
  sourceType?: SourceType;
}
