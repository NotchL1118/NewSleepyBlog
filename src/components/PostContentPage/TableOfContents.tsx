"use client";

import { useEffect, useState } from "react";
import type { PostHeading } from "@/features/posts/types";
import styles from "./index.module.css";

type TableOfContentsProps = {
  headings: readonly PostHeading[];
};

function TocLinks({ headings, activeId }: TableOfContentsProps & { activeId: string }) {
  return (
    <ol className={styles.tocList}>
      {headings.map((heading) => (
        <li key={heading.id} className={heading.depth === 3 ? styles.tocNested : undefined}>
          <a
            href={`#${heading.id}`}
            aria-current={activeId === heading.id ? "location" : undefined}
            className={activeId === heading.id ? styles.tocActive : undefined}
          >
            {heading.title}
          </a>
        </li>
      ))}
    </ol>
  );
}

export function TableOfContents({ headings }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState(headings[0]?.id ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleHeading = entries.find((entry) => entry.isIntersecting);
        if (visibleHeading) setActiveId(visibleHeading.target.id);
      },
      { rootMargin: "-18% 0px -68%", threshold: 0 },
    );

    headings.forEach(({ id }) => {
      const heading = document.getElementById(id);
      if (heading) observer.observe(heading);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 3) return null;

  return (
    <>
      <details className={styles.mobileToc}>
        <summary>本文目录</summary>
        <nav aria-label="文章目录">
          <TocLinks headings={headings} activeId={activeId} />
        </nav>
      </details>
      <aside className={styles.desktopTocRail}>
        <nav aria-label="文章目录" className={styles.desktopToc}>
          <p>本文目录</p>
          <TocLinks headings={headings} activeId={activeId} />
        </nav>
      </aside>
    </>
  );
}
