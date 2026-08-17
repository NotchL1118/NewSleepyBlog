import type { Metadata } from "next";
import { Suspense } from "react";
import { buildPostMetadata, renderPostRoute, type PostRouteProps } from "@/features/posts/post-route";

export function generateMetadata(props: PostRouteProps): Promise<Metadata> {
  return buildPostMetadata(props, "regular");
}

async function RegularPostContent(props: PostRouteProps) {
  return renderPostRoute(props, "regular");
}

export default function RegularPostPage(props: PostRouteProps) {
  return (
    <Suspense
      fallback={
        <main
          aria-hidden="true"
          className="mx-auto min-h-[60vh] w-[calc(100%-2rem)] max-w-[760px] py-16"
        >
          <div className="h-4 w-32 rounded-full bg-surface" />
          <div className="mt-6 h-12 w-3/4 rounded-xl bg-surface" />
          <div className="mt-10 h-72 rounded-2xl bg-surface/60" />
        </main>
      }
    >
      <RegularPostContent {...props} />
    </Suspense>
  );
}
