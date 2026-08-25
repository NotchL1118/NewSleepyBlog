import Link from "next/link";
import { DemoButton } from "./DemoButton";
import type { StudioCollection } from "../lib/fixtures";

function Status({ value }: { value: string }) {
  return (
    <span className="inline-flex rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-muted">
      {value}
    </span>
  );
}

export function StudioCollectionPage({
  collection,
  actionHref,
}: {
  collection: StudioCollection;
  actionHref?: string;
}) {
  return (
    <>
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-accent uppercase">
            {collection.eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            {collection.title}
          </h1>
          <p className="mt-3 text-sm leading-7 text-muted sm:text-base">
            {collection.description}
          </p>
        </div>
        {actionHref ? (
          <Link
            href={actionHref}
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {collection.actionLabel}
          </Link>
        ) : (
          <DemoButton variant="primary">{collection.actionLabel}</DemoButton>
        )}
      </header>

      <section className="mt-9 overflow-hidden rounded-2xl border border-border bg-background">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <p className="text-sm text-muted">共 {collection.rows.length} 条演示记录</p>
          <DemoButton variant="quiet" className="min-h-9 px-3">
            筛选与排序
          </DemoButton>
        </div>
        <div className="max-w-full overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-surface/70 text-xs text-muted">
                {collection.columns.map((column) => (
                  <th key={column.key} className={`px-5 py-3.5 font-medium ${column.className ?? ""}`}>
                    {column.label}
                  </th>
                ))}
                <th className="w-20 px-5 py-3.5 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {collection.rows.map((row, index) => (
                <tr key={`${row[collection.columns[0].key]}-${index}`} className="border-t border-border transition-colors hover:bg-surface/45">
                  {collection.columns.map((column, columnIndex) => (
                    <td
                      key={column.key}
                      className={`px-5 py-4 ${columnIndex === 0 ? "font-medium text-foreground" : "text-muted"}`}
                    >
                      {column.key === "status" ? <Status value={row[column.key]} /> : row[column.key]}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    <DemoButton variant="quiet" className="min-h-9 px-3" aria-label={`操作：${row[collection.columns[0].key]}`}>
                      ···
                    </DemoButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
