import type { Metadata } from "next";
import { DemoButton } from "../components/DemoButton";

export const metadata: Metadata = { title: "站点设置" };

const settingSections = [
  {
    title: "站点资料",
    description: "公开展示的名称与简短介绍。",
    fields: [
      ["站点名称", "Sleepy"],
      ["站点描述", "写下技术，也写下生活。"],
      ["生产域名", "https://lsyfighting.cn"],
    ],
  },
  {
    title: "社交链接",
    description: "读者可以找到你的其他地方。",
    fields: [
      ["GitHub", "https://github.com/lsyfighting"],
      ["邮箱", "hello@lsyfighting.cn"],
    ],
  },
] as const;

export default function SettingsPage() {
  return (
    <>
      <header>
        <p className="text-xs font-semibold tracking-[0.12em] text-accent uppercase">站点</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">站点设置</h1>
        <p className="mt-3 text-sm leading-7 text-muted sm:text-base">
          设置项为演示内容，保存功能将在接口接入后启用。
        </p>
      </header>

      <div className="mt-9 grid gap-5">
        {settingSections.map((section) => (
          <section key={section.title} className="rounded-2xl border border-border bg-background p-5 sm:p-6">
            <div className="border-b border-border pb-4">
              <h2 className="font-semibold">{section.title}</h2>
              <p className="mt-1 text-sm text-muted">{section.description}</p>
            </div>
            <div className="mt-5 grid gap-5">
              {section.fields.map(([label, value]) => (
                <label key={label} className="grid gap-2 text-sm font-medium sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center">
                  <span>{label}</span>
                  <input
                    value={value}
                    readOnly
                    className="min-h-11 rounded-xl border border-border bg-surface/45 px-3.5 font-normal text-foreground outline-none focus:border-accent"
                  />
                </label>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <DemoButton variant="primary">保存{section.title}</DemoButton>
            </div>
          </section>
        ))}

        <section className="rounded-2xl border border-border bg-background p-5 sm:p-6">
          <div className="border-b border-border pb-4">
            <h2 className="font-semibold">评论设置</h2>
            <p className="mt-1 text-sm text-muted">控制全站评论的默认行为。</p>
          </div>
          <div className="mt-5 space-y-4">
            <label className="flex items-start justify-between gap-6 rounded-xl bg-surface/50 p-4">
              <span>
                <span className="block text-sm font-medium">默认开启评论</span>
                <span className="mt-1 block text-xs leading-5 text-muted">新内容创建后允许读者发表评论。</span>
              </span>
              <input type="checkbox" defaultChecked disabled className="mt-1 size-4 accent-accent" />
            </label>
            <label className="flex items-start justify-between gap-6 rounded-xl bg-surface/50 p-4">
              <span>
                <span className="block text-sm font-medium">新评论提醒</span>
                <span className="mt-1 block text-xs leading-5 text-muted">收到评论时记录一条工作区提醒。</span>
              </span>
              <input type="checkbox" defaultChecked disabled className="mt-1 size-4 accent-accent" />
            </label>
          </div>
          <div className="mt-6 flex justify-end">
            <DemoButton variant="primary">保存评论设置</DemoButton>
          </div>
        </section>
      </div>
    </>
  );
}
