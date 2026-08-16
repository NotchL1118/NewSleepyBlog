import type { Metadata } from "next";
import { requireAdmin } from "@/features/auth/server";
import { DemoButton } from "@/features/studio/DemoButton";
import { overviewMetrics, recentActivity } from "@/features/studio/fixtures";

export const metadata: Metadata = { title: "概览" };

export default async function DashboardPage() {
  const viewer = await requireAdmin();

  return (
    <>
      <header>
        <p className="text-xs font-semibold tracking-[0.12em] text-accent uppercase">工作台</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
          晚上好，{viewer.displayName}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted sm:text-base">
          这里是 Sleepy 全站内容的概览。当前数据为前端演示内容。
        </p>
      </header>

      <section className="mt-9 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {overviewMetrics.map((metric) => (
          <article key={metric.label} className="rounded-2xl border border-border bg-surface/60 p-5">
            <p className="text-sm text-muted">{metric.label}</p>
            <p className="mt-5 text-3xl font-semibold tracking-[-0.04em]">{metric.value}</p>
            <p className="mt-1 text-xs text-muted">{metric.note}</p>
          </article>
        ))}
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)]">
        <section className="rounded-2xl border border-border bg-background">
          <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <h2 className="font-semibold">最近动态</h2>
              <p className="mt-1 text-xs text-muted">来自内容与评论的演示记录</p>
            </div>
            <DemoButton variant="quiet" className="min-h-9 px-3">查看全部</DemoButton>
          </header>
          <div className="divide-y divide-border">
            {recentActivity.map((item) => (
              <article key={`${item.action}-${item.target}`} className="px-5 py-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                  <p className="text-sm">
                    <span className="text-muted">{item.action}</span>
                    <span className="ml-2 font-medium">{item.target}</span>
                  </p>
                  <time className="shrink-0 text-xs text-muted">{item.time}</time>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="rounded-2xl border border-border bg-surface/55 p-5">
          <p className="text-xs font-semibold tracking-[0.1em] text-muted uppercase">快速开始</p>
          <h2 className="mt-3 text-xl font-semibold tracking-[-0.025em]">今天想写些什么？</h2>
          <p className="mt-2 text-sm leading-7 text-muted">
            编辑器将在内容 API 接入后实现，现在可以先浏览完整的工作区结构。
          </p>
          <div className="mt-6 grid gap-2">
            <DemoButton variant="primary">新建普通文章</DemoButton>
            <DemoButton>新建心作</DemoButton>
          </div>
        </aside>
      </div>
    </>
  );
}
