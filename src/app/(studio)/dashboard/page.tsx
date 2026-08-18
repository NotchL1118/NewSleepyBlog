import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/features/auth/server";

export const metadata: Metadata = { title: "概览" };

const createLinks = [
  { href: "/dashboard/posts/new", label: "新建普通文章" },
  { href: "/dashboard/heartworks/new", label: "新建心作" },
] as const;

const browseLinks = [
  { href: "/dashboard/posts", label: "普通文章" },
  { href: "/dashboard/heartworks", label: "心作" },
] as const;

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
          这里是 Sleepy 全站内容的工作台。普通文章和心作从空的内容库开始，不会显示演示文章。
        </p>
      </header>

      <div className="mt-9 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)]">
        <section className="rounded-2xl border border-border bg-background">
          <header className="border-b border-border px-5 py-4">
            <h2 className="font-semibold">内容入口</h2>
            <p className="mt-1 text-xs text-muted">打开真实的普通文章或心作列表</p>
          </header>
          <ul className="divide-y divide-border">
            {browseLinks.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex min-h-14 items-center justify-between gap-4 px-5 py-4 text-sm transition-colors hover:bg-surface/55 focus-visible:bg-surface/55 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
                >
                  <span className="font-medium">{item.label}</span>
                  <span className="text-muted">查看列表</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <aside className="rounded-2xl border border-border bg-surface/55 p-5">
          <p className="text-xs font-semibold tracking-[0.1em] text-muted uppercase">快速开始</p>
          <h2 className="mt-3 text-xl font-semibold tracking-[-0.025em]">今天想写些什么？</h2>
          <p className="mt-2 text-sm leading-7 text-muted">
            打开编辑器后，第一次保存才会创建草稿。未保存就离开，不会留下空记录。
          </p>
          <div className="mt-6 grid gap-2">
            {createLinks.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  index === 0
                    ? "bg-foreground text-background hover:opacity-85"
                    : "border border-border bg-background hover:bg-surface"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}
