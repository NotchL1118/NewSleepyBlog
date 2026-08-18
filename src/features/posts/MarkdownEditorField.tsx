"use client";

import { useState } from "react";
import { MarkdownPreview } from "./MarkdownPreview";
import type { PostKind } from "./types";

export function MarkdownEditorField({
  error,
  kind,
  onChange,
  readOnly,
  value,
}: {
  error?: string;
  kind: PostKind;
  onChange: (value: string) => void;
  readOnly: boolean;
  value: string;
}) {
  const [pane, setPane] = useState<"edit" | "preview">("edit");

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="bodyMarkdown" className="text-sm font-medium">
          Markdown 正文
        </label>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface p-1 lg:hidden">
          <button
            type="button"
            aria-pressed={pane === "edit"}
            onClick={() => setPane("edit")}
            className={`min-h-9 rounded-lg px-3 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
              pane === "edit"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            编辑
          </button>
          <button
            type="button"
            aria-pressed={pane === "preview"}
            onClick={() => setPane("preview")}
            className={`min-h-9 rounded-lg px-3 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
              pane === "preview"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            预览
          </button>
        </div>
      </div>

      <div className="mt-2 grid min-w-0 gap-4 lg:grid-cols-2">
        <div className={pane === "edit" ? "min-w-0" : "hidden min-w-0 lg:block"}>
          <textarea
            id="bodyMarkdown"
            name="bodyMarkdown"
            value={value}
            readOnly={readOnly}
            rows={20}
            onChange={(event) => onChange(event.target.value)}
            placeholder="从这里开始写，空正文也可以保存为草稿。"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "bodyMarkdown-error" : undefined}
            className="min-h-[28rem] w-full min-w-0 resize-y rounded-xl border border-border bg-background px-4 py-3 font-mono text-sm leading-7 outline-none transition-colors placeholder:font-sans placeholder:text-muted/65 focus:border-accent"
          />
        </div>
        <div
          className={
            pane === "preview" ? "min-w-0" : "hidden min-w-0 lg:block"
          }
        >
          <p className="mb-2 hidden text-xs text-muted lg:block">
            预览当前未保存的正文
          </p>
          <div
            aria-label="正文预览"
            className="min-h-[28rem] min-w-0 overflow-auto rounded-xl border border-border bg-surface/55 px-4 py-3"
          >
            <MarkdownPreview kind={kind} markdown={value} />
          </div>
        </div>
      </div>
      {error ? (
        <p id="bodyMarkdown-error" className="mt-1.5 text-xs leading-5 text-foreground">
          {error}
        </p>
      ) : null}
    </div>
  );
}
