import type { ID, ISODateTime } from "./common";

export type MediaAssetType = "image" | "video" | "audio" | "svg" | "rive" | "lottie" | "glb" | "gltf" | "texture" | "sound" | "document" | "other";
export type MediaUploadStatus = "draft" | "uploading" | "uploaded" | "failed";
export type MediaProcessingStatus = "pending" | "processing" | "ready" | "failed";
export type MediaVisibility = "private" | "content_team" | "school" | "public";

export interface MediaPreview {
  url: string;
  width?: number;
  height?: number;
}

export interface MediaAsset {
  assetId: ID;
  type: MediaAssetType;
  url?: string;
  titleRu?: string;
  uploadStatus?: MediaUploadStatus;
  processingStatus?: MediaProcessingStatus;
  visibility?: MediaVisibility;
  preview?: MediaPreview;
  sourceLicense?: string;
  createdAt?: ISODateTime;
}

export interface ModelAssetRef {
  assetId: ID;
  format: "glb" | "gltf" | "other";
  url?: string;
}

export interface AnimationAssetRef {
  assetId: ID;
  format: "rive" | "lottie" | "other";
  url?: string;
}

export interface TextureAssetRef {
  assetId: ID;
  url?: string;
}

export interface SoundAssetRef {
  assetId: ID;
  url?: string;
}
