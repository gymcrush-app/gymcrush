import { toast as burntToast } from 'burnt';
import type { ToastOptions } from 'burnt/build/types';

export type ActiveToast = {
  id: string;
  title: string;
  message?: string;
  startedAt: number;
  expectedDurationSec: number;
};

const DEFAULT_DURATION_SEC = 5;

const activeById = new Map<string, ActiveToast>();
const dismissTimers = new Map<string, ReturnType<typeof setTimeout>>();
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

function resolveDurationSec(options: ToastOptions): number {
  return options.duration ?? DEFAULT_DURATION_SEC;
}

/**
 * Best-effort list of toasts shown through this module. Native dismiss (e.g. drag)
 * is not reported — entries are removed after the expected duration only.
 */
export function getActiveToasts(): ActiveToast[] {
  return Array.from(activeById.values());
}

/** Subscribe to registry changes (add/remove). Returns unsubscribe. */
export function subscribeActiveToasts(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Present a toast and track it in the JS registry for debugging / inspection.
 */
export function toast(options: ToastOptions) {
  const durationSec = resolveDurationSec(options);
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  const entry: ActiveToast = {
    id,
    title: options.title,
    message: options.message,
    startedAt: Date.now(),
    expectedDurationSec: durationSec,
  };
  activeById.set(id, entry);
  notifyListeners();

  const t = setTimeout(() => {
    dismissTimers.delete(id);
    activeById.delete(id);
    notifyListeners();
  }, durationSec * 1000);
  dismissTimers.set(id, t);

  burntToast(options);
}
