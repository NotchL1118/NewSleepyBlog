"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CloseIcon } from "@/components/icons";
import {
  dismissToast,
  getServerToasts,
  getToasts,
  subscribeToasts,
  type ToastRecord,
} from "./store";

const PAUSE_QUERY = "(min-width: 640px) and (hover: hover) and (pointer: fine)";

function useDesktopPause() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(PAUSE_QUERY);
    const sync = () => setEnabled(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return enabled;
}

function ToastCard({
  toast,
  reduceMotion,
}: {
  toast: ToastRecord;
  reduceMotion: boolean;
}) {
  const pauseEnabled = useDesktopPause();
  const remainingRef = useRef(toast.duration);
  const pausedRef = useRef(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pauseEnabled) {
      pausedRef.current = false;
    }
  }, [pauseEnabled]);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const delta = now - last;
      last = now;

      if (!pausedRef.current) {
        remainingRef.current -= delta;
        if (barRef.current) {
          barRef.current.style.transform = `scaleX(${Math.max(0, remainingRef.current / toast.duration)})`;
        }
        if (remainingRef.current <= 0) {
          dismissToast(toast.id);
          return;
        }
      }

      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [toast.duration, toast.id]);

  function setPaused(next: boolean) {
    if (!pauseEnabled) {
      pausedRef.current = false;
      return;
    }
    pausedRef.current = next;
  }

  return (
    <motion.div
      layout={!reduceMotion}
      initial={reduceMotion ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
      role={toast.tone === "error" ? "alert" : "status"}
      className={`pointer-events-auto overflow-hidden rounded-2xl border bg-background shadow-lg ${
        toast.tone === "error" ? "border-foreground/20" : "border-border"
      }`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <span
          aria-hidden="true"
          className={`mt-2 size-2 shrink-0 rounded-full ${
            toast.tone === "error" ? "bg-foreground" : "bg-accent"
          }`}
        />
        <p className="min-w-0 flex-1 text-sm leading-6">{toast.message}</p>
        <button
          type="button"
          onClick={() => dismissToast(toast.id)}
          className="rounded-md text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent"
          aria-label="关闭提示"
        >
          <CloseIcon className="size-4" />
        </button>
      </div>
      <div className="h-0.5 bg-border">
        <div
          ref={barRef}
          className={`h-full origin-left ${
            toast.tone === "error" ? "bg-foreground" : "bg-foreground/45"
          }`}
          style={{ transform: "scaleX(1)" }}
        />
      </div>
    </motion.div>
  );
}

export function Toaster() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getServerToasts);
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed top-5 right-5 z-[10000] flex w-[min(28rem,calc(100vw-2rem))] flex-col gap-2 max-sm:inset-x-0 max-sm:top-0 max-sm:w-full max-sm:pt-[env(safe-area-inset-top)] max-sm:pr-[env(safe-area-inset-right)] max-sm:pl-[env(safe-area-inset-left)]"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} reduceMotion={reduceMotion} />
        ))}
      </AnimatePresence>
    </div>
  );
}
