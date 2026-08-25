export type ToastTone = "info" | "error";

export type ToastOptions = {
  tone?: ToastTone;
  duration?: number;
};

export type ToastRecord = {
  id: number;
  message: string;
  tone: ToastTone;
  duration: number;
};

const MAX_TOASTS = 3;
const EMPTY: ToastRecord[] = [];

let nextId = 0;
let toasts: ToastRecord[] = EMPTY;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function resolveDuration(tone: ToastTone, duration: number | undefined) {
  const fallback = tone === "error" ? 7000 : 4000;
  if (typeof duration !== "number" || !Number.isFinite(duration) || duration <= 0) {
    return fallback;
  }
  return duration;
}

export function subscribeToasts(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getToasts() {
  return toasts;
}

export function getServerToasts() {
  return EMPTY;
}

export function showToast(message: string, options: ToastOptions = {}) {
  if (typeof window === "undefined") {
    if (process.env.NODE_ENV !== "production") {
      console.warn("showToast() was called on the server and was ignored.");
    }
    return;
  }

  const tone = options.tone ?? "info";
  const duration = resolveDuration(tone, options.duration);
  toasts = [{ id: ++nextId, message, tone, duration }, ...toasts].slice(0, MAX_TOASTS);
  emit();
}

export function dismissToast(id: number) {
  const next = toasts.filter((item) => item.id !== id);
  if (next === toasts || next.length === toasts.length) {
    return;
  }
  toasts = next.length === 0 ? EMPTY : next;
  emit();
}
