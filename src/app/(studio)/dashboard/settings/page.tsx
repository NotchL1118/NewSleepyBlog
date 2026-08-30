import type { Metadata } from "next";

export const metadata: Metadata = { title: "站点设置" };

export default function SettingsPage() {
  return (
    <>
      <header>
        <p className="text-xs font-semibold tracking-[0.12em] text-accent uppercase">
          站点
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
          站点设置
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted sm:text-base">
          维护公开展示的站点资料与默认行为。
        </p>
      </header>

      <section className="mt-9 rounded-2xl border border-border bg-background px-5 py-16 text-center">
        <p className="text-base font-medium text-foreground">站点设置尚未接入</p>
        <p className="mt-2 text-sm leading-6 text-muted">
          这里暂时没有可保存的设置项。
        </p>
      </section>
    </>
  );
}
