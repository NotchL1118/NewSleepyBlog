import type { Metadata } from "next";
import { buildPostMetadata, renderPostRoute, type PostRouteProps } from "@/features/posts/post-route";

export const instant = false;

export function generateMetadata(props: PostRouteProps): Promise<Metadata> {
  return buildPostMetadata(props, "heartwork");
}

export default function HeartworkPage(props: PostRouteProps) {
  return renderPostRoute(props, "heartwork");
}
