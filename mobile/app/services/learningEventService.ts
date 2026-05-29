import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "@app/config/api";

type LearningEvent = {
  eventType: string;
  userId?: string;
  role?: string;
  moduleId?: string;
  lessonId?: string;
  taskId?: string;
  outcome?: string;
  sessionId?: string;
  classroom?: string;
  mistakeTag?: string;
  payload?: Record<string, unknown>;
};

type StoredLearningEvent = LearningEvent & {
  queuedAt: string;
  attempts: number;
  nextAttemptAt?: string;
};

const QUEUE_KEY = "synapse.learning.events.queue.v1";
const MAX_QUEUE = 1000;
const RETRY_WINDOWS_SEC = [5, 15, 30, 60, 120, 300, 900];

function nowIso(): string {
  return new Date().toISOString();
}

function nextRetryTime(attempts: number): string {
  const idx = Math.min(Math.max(attempts - 1, 0), RETRY_WINDOWS_SEC.length - 1);
  const sec = RETRY_WINDOWS_SEC[idx];
  return new Date(Date.now() + sec * 1000).toISOString();
}

async function readQueue(): Promise<StoredLearningEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as StoredLearningEvent[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(items: StoredLearningEvent[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-MAX_QUEUE)));
}

export async function flushLearningEventsQueue(batchSize = 30): Promise<number> {
  const queue = await readQueue();
  if (!queue.length) return 0;

  const now = Date.now();
  const eligible: StoredLearningEvent[] = [];
  const remaining: StoredLearningEvent[] = [];

  for (const item of queue) {
    const nextAt = item.nextAttemptAt ? Date.parse(item.nextAttemptAt) : 0;
    if (eligible.length < batchSize && (!nextAt || Number.isNaN(nextAt) || nextAt <= now)) {
      eligible.push(item);
    } else {
      remaining.push(item);
    }
  }

  if (!eligible.length) return 0;

  try {
    await api.post("/learning/events", {
      events: eligible.map((event) => ({
        eventType: event.eventType,
        userId: event.userId,
        role: event.role,
        moduleId: event.moduleId,
        lessonId: event.lessonId,
        taskId: event.taskId,
        outcome: event.outcome,
        sessionId: event.sessionId,
        classroom: event.classroom,
        mistakeTag: event.mistakeTag,
        payload: {
          ...(event.payload ?? {}),
          queuedAt: event.queuedAt,
          attempts: event.attempts,
        },
      })),
    });

    await writeQueue(remaining);
    return eligible.length;
  } catch {
    const failed = eligible.map((event) => {
      const attempts = Math.max(1, Number(event.attempts || 0) + 1);
      return {
        ...event,
        attempts,
        nextAttemptAt: nextRetryTime(attempts),
      };
    });
    await writeQueue([...failed, ...remaining]);
    return 0;
  }
}

export async function trackLearningEvent(event: LearningEvent): Promise<void> {
  const queue = await readQueue();
  queue.push({ ...event, queuedAt: nowIso(), attempts: 0 });
  await writeQueue(queue);
  await flushLearningEventsQueue();
}
