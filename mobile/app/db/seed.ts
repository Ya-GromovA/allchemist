import { bootstrapDatabase } from "./bootstrap";
import { applyContentPacksIfNeeded } from "@app/content/contentPacks";

/**
 * Единая точка “поднять БД и наполнить”.
 * Вызывай это в App.tsx один раз при старте.
 */
export async function initLocalContent(): Promise<void> {
  await bootstrapDatabase();
  await applyContentPacksIfNeeded();
}
