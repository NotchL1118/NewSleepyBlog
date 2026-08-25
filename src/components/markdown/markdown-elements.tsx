import type { ComponentPropsWithoutRef } from "react";
import {
  isAllowedMarkdownImageSrc,
  markdownLinkOpensInNewTab,
  markdownLinkRel,
} from "./markdown";

type MarkdownLinkProps = ComponentPropsWithoutRef<"a"> & { node?: unknown };
type MarkdownImageProps = ComponentPropsWithoutRef<"img"> & { node?: unknown };

function withoutNode<T extends { node?: unknown }>(props: T) {
  const rest = { ...props };
  delete rest.node;
  return rest;
}

export function MarkdownLink(props: MarkdownLinkProps) {
  const { href, children, ...anchorProps } = withoutNode(props);
  const opensInNewTab = Boolean(href && markdownLinkOpensInNewTab(href));

  return (
    <a
      {...anchorProps}
      href={href}
      rel={opensInNewTab ? markdownLinkRel(href ?? "") : undefined}
      target={opensInNewTab ? "_blank" : undefined}
    >
      {children}
    </a>
  );
}

export function MarkdownImage(props: MarkdownImageProps) {
  const { alt, src, ...imageProps } = withoutNode(props);
  const imageSrc = typeof src === "string" ? src : undefined;
  if (!imageSrc || !isAllowedMarkdownImageSrc(imageSrc)) return null;

  return (
    // Markdown images use Admin-supplied relative or HTTPS URLs, not the
    // Next.js image optimizer.
    // eslint-disable-next-line @next/next/no-img-element
    <img {...imageProps} alt={alt ?? ""} src={imageSrc} />
  );
}

export const markdownComponents = {
  a: MarkdownLink,
  img: MarkdownImage,
};
