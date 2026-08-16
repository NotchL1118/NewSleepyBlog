import type { Metadata } from "next";
import { listPostRoutes } from "@/features/posts/content";
import { buildPostMetadata, renderPostRoute, type PostRouteProps } from "@/features/posts/post-route";

export async function generateStaticParams() {
  const routes = await listPostRoutes();
  return routes.filter((route) => route.kind === "heartwork").map(({ slug }) => ({ slug }));
}

export function generateMetadata(props: PostRouteProps): Promise<Metadata> {
  return buildPostMetadata(props, "heartwork");
}

export default function HeartworkPage(props: PostRouteProps) {
  return renderPostRoute(props, "heartwork");
}
