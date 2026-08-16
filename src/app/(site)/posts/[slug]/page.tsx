import type { Metadata } from "next";
import { listPostRoutes } from "@/features/posts/content";
import { buildPostMetadata, renderPostRoute, type PostRouteProps } from "@/features/posts/post-route";

export async function generateStaticParams() {
  const routes = await listPostRoutes();
  return routes.filter((route) => route.kind === "regular").map(({ slug }) => ({ slug }));
}

export function generateMetadata(props: PostRouteProps): Promise<Metadata> {
  return buildPostMetadata(props, "regular");
}

export default function RegularPostPage(props: PostRouteProps) {
  return renderPostRoute(props, "regular");
}
