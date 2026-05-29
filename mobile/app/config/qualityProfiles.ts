export type QualityProfile = "lite" | "standard" | "enhanced";

export type QualityPolicy = {
  id: QualityProfile;
  targetFps: number;
  heavyEffects: boolean;
  preloadDepth: number;
  imageQuality: "low" | "medium" | "high";
};

const POLICIES: Record<QualityProfile, QualityPolicy> = {
  lite: {
    id: "lite",
    targetFps: 30,
    heavyEffects: false,
    preloadDepth: 1,
    imageQuality: "low",
  },
  standard: {
    id: "standard",
    targetFps: 45,
    heavyEffects: true,
    preloadDepth: 2,
    imageQuality: "medium",
  },
  enhanced: {
    id: "enhanced",
    targetFps: 60,
    heavyEffects: true,
    preloadDepth: 3,
    imageQuality: "high",
  },
};

export function getQualityPolicy(profile: QualityProfile): QualityPolicy {
  return POLICIES[profile] ?? POLICIES.standard;
}
