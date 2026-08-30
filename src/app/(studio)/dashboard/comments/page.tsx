import type { Metadata } from "next";

export const metadata: Metadata = { title: "评论" };

export default function Page() {
  return (
    <>
      <header>
        <p className="text-xs font-semibold tracking-[0.12em] text-accent uppercase">
          站点
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
          评论
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted sm:text-base">
          查看读者在文章和页面下留下的公开回应。
        </p>
      </header>

      <section className="mt-9 rounded-2xl border border-border bg-background px-5 py-16 text-center">
        <p className="text-base font-medium text-foreground">评论管理尚未接入</p>
        <p className="mt-2 text-sm leading-6 text-muted">
          这里暂时没有可管理的评论。
        </p>
      </section>
    </>
  );
}
