"use client";

import { useEffect, useRef, useState } from "react";
import type { PostKind } from "@/lib/posts/types";
import { MarkdownPreview } from "./MarkdownPreview";

export type EditorView = "edit" | "split" | "preview";

const splitStorageKey = "sleepy:post-editor:split";

export function MarkdownEditorField({
  error,
  kind,
  onChange,
  readOnly,
  value,
  view,
}: {
  error?: string;
  kind: PostKind;
  onChange: (value: string) => void;
  readOnly: boolean;
  value: string;
  view: EditorView;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [editorShare, setEditorShare] = useState(50);
  const [previewMarkdown, setPreviewMarkdown] = useState(value);

  useEffect(() => {
    const storedShare = Number(window.localStorage.getItem(splitStorageKey));
    const frame = window.requestAnimationFrame(() => {
      if (Number.isFinite(storedShare) && storedShare >= 28 && storedShare <= 72) {
        setEditorShare(storedShare);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => setPreviewMarkdown(value), 180);
    return () => window.clearTimeout(timeout);
  }, [value]);

  useEffect(() => {
    window.localStorage.setItem(splitStorageKey, String(editorShare));
  }, [editorShare]);

  function beginResize(event: React.PointerEvent<HTMLButtonElement>) {
    const frame = frameRef.current;
    if (!frame) return;
    const frameElement = frame;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    function resize(pointerEvent: PointerEvent) {
      const bounds = frameElement.getBoundingClientRect();
      const percentage = ((pointerEvent.clientX - bounds.left) / bounds.width) * 100;
      setEditorShare(Math.max(28, Math.min(72, percentage)));
    }

    function finish() {
      window.removeEventListener("pointermove", resize);
      window.removeEventListener("pointerup", finish);
    }

    window.addEventListener("pointermove", resize);
    window.addEventListener("pointerup", finish, { once: true });
  }

  const columns = view === "split"
    ? `minmax(0, ${editorShare}fr) 0.5rem minmax(0, ${100 - editorShare}fr)`
    : "minmax(0, 1fr)";

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <div
        ref={frameRef}
        style={{ gridTemplateColumns: columns }}
        className="grid min-h-0 min-w-0 flex-1 grid-rows-[minmax(0,1fr)]"
      >
        {view !== "preview" ? (
          <textarea
            id="bodyMarkdown"
            name="bodyMarkdown"
            value={value}
            readOnly={readOnly}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Markdown 正文"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "bodyMarkdown-error" : undefined}
            className={`h-full w-full min-w-0 resize-none overflow-y-auto bg-transparent pt-3 pb-24 font-mono text-sm leading-7 outline-none [scrollbar-width:none] placeholder:font-sans placeholder:text-muted/55 [&::-webkit-scrollbar]:hidden ${
              view === "split" ? "pr-6" : ""
            }`}
          />
        ) : null}

        {view === "split" ? (
          <button
            type="button"
            aria-label="拖动调整编辑和预览宽度"
            title="拖动调整编辑和预览宽度"
            onPointerDown={beginResize}
            className="group relative hidden cursor-col-resize touch-none lg:block"
          >
            <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border transition-colors group-hover:bg-accent" />
          </button>
        ) : null}

        {view !== "edit" ? (
          <div
            aria-label="正文预览"
            className={`min-h-0 min-w-0 overflow-y-auto pt-3 pb-24 ${
              view === "split" ? "pl-6" : ""
            }`}
          >
            <div className="mx-auto w-full max-w-3xl">
              <MarkdownPreview kind={kind} markdown={previewMarkdown} />
            </div>
          </div>
        ) : null}
      </div>
      {error ? (
        <p
          id="bodyMarkdown-error"
          className="shrink-0 pb-2 text-xs leading-5 text-foreground"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
