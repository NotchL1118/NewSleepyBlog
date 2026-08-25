"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

function serializeForm(form: HTMLFormElement) {
  const data = new FormData(form);
  data.delete("expectedUpdatedAt");
  return [...data.entries()]
    .map(([key, value]) => `${key}=${typeof value === "string" ? value : ""}`)
    .sort()
    .join("\n");
}

export function useUnsavedChanges(
  formRef: RefObject<HTMLFormElement | null>,
  savedSnapshot: string | null,
  enabled = true,
) {
  const snapshotRef = useRef("");
  const [dirty, setDirty] = useState(false);

  const captureSnapshot = useCallback(() => {
    if (!formRef.current) return;
    snapshotRef.current = serializeForm(formRef.current);
    setDirty(false);
  }, [formRef]);

  useEffect(() => {
    if (!formRef.current) return;
    if (savedSnapshot === null) {
      captureSnapshot();
      return;
    }

    snapshotRef.current = savedSnapshot;
    setDirty(serializeForm(formRef.current) !== savedSnapshot);
  }, [captureSnapshot, formRef, savedSnapshot]);

  useEffect(() => {
    if (!dirty || !enabled) return;

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target === "_blank") return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      if (!window.confirm("有未保存的修改，确定离开吗？")) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty, enabled]);

  const markMaybeDirty = useCallback(() => {
    if (!formRef.current) return;
    setDirty(serializeForm(formRef.current) !== snapshotRef.current);
  }, [formRef]);

  const readSnapshot = useCallback(() => {
    return formRef.current ? serializeForm(formRef.current) : "";
  }, [formRef]);

  return { dirty, markMaybeDirty, readSnapshot };
}
