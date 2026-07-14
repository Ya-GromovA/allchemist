import type { ContentSource, ID, LicenseKind } from "./types";

export function isSourceUsableForPublication(source: ContentSource): boolean {
  return source.licenseKind === "owned" || source.licenseKind === "commissioned" || source.licenseKind === "open_license";
}

export function createSourceReference(id: ID, titleRu: string, licenseKind: LicenseKind): ContentSource {
  return {
    id,
    titleRu,
    licenseKind,
    trustLevel: licenseKind === "unknown" ? "low" : "medium",
  };
}
