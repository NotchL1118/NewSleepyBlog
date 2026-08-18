import type { PostKind } from "./types";
import styles from "./markdown-prose.module.css";

export function markdownProseClassName(kind: PostKind) {
  return kind === "heartwork"
    ? `${styles.prose} ${styles.heartworkProse}`
    : styles.prose;
}
