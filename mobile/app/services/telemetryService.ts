import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "@app/config/api";

type TelemetryEvent = {
  name: string;
  userId?: string;
  role?: string;
  payload?: Record<string, unknown>;
};

type StoredTelemetryEvent = TelemetryEvent & {
  queuedAt: string;
};

const QUEUE_KEY = "synapse.telemetry.queue.v1";
const MAX_QUEUE = 500;

async function readQueue(): Promise<StoredTelemetryEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as StoredTelemetryEvent[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(items: StoredTelemetryEvent[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-MAX_QUEUE)));
}

export async function flushTelemetryQueue(batchSize = 40): Promise<number> {
  const queue = await readQueue();
  if (!queue.length) return 0;

  const batch = queue.slice(0, batchSize);
  try {
    await api.post("/telemetry/events", {
      events: batch.map((event) => ({
        name: event.name,
        userId: event.userId,
        role: event.role,
        payload: { ...(event.payload ?? {}), queuedAt: event.queuedAt },
      })),
    });
    await writeQueue(queue.slice(batch.length));
    return batch.length;
  } catch {
    return 0;
  }
}

export async function trackEvent(event: TelemetryEvent): Promise<void> {
  const queue = await readQueue();
  queue.push({ ...event, queuedAt: new Date().toISOString() });
  await writeQueue(queue);
  await flushTelemetryQueue();
}
