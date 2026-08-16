import Link from "next/link";

const recentPosts = [
  {
    href: "/posts/make-complex-things-clear",
    title: "把复杂的事情慢慢说清楚",
    summary: "关于表达、系统设计，以及为什么好的边界往往比聪明的实现更重要。",
    date: "2026.08.07",
  },
  {
    href: "/heartworks/what-to-read-at-night",
    title: "夜里适合读些什么",
    summary: "一些不急着得出结论的书、文章与琐碎想法。",
    date: "2026.07.16",
  },
  {
    href: "/posts/first-personal-site-workflow",
    title: "我的第一套个人网站工作流",
    summary: "一份留在原处的旧实践，以及它后来为什么被替换。",
    date: "2023.04.12",
  },
] as const;

export default function Page() {
  return (
    <main className="mx-auto w-[calc(100%-2.25rem)] max-w-[1040px] pb-36 pt-16 sm:pt-20 min-[821px]:pt-24">
      <section>
        <p className="mb-4 text-xs font-semibold tracking-[0.12em] text-accent uppercase">
          Sleepy 的个人角落
        </p>
        <h1 className="max-w-3xl text-[clamp(2.75rem,7vw,5.125rem)] leading-[1.05] font-medium tracking-[-0.055em] text-foreground">
          写下技术，
          <br />
          也写下生活。
        </h1>
        <p className="mt-7 max-w-2xl text-[17px] leading-[1.85] text-muted sm:text-xl">
          这里收集我在技术、设计与日常生活中的观察。希望每一篇文字，都值得你安静地读上一会儿。
        </p>
      </section>

      <section id="recent" className="mt-24 scroll-mt-32 min-[821px]:mt-28">
        <header className="mb-3 flex items-baseline justify-between gap-6">
          <h2 className="text-xl font-semibold tracking-[-0.02em]">最近写下</h2>
          <Link href="#recent" className="text-[13px] text-muted transition-colors hover:text-foreground">
            查看全部 →
          </Link>
        </header>
        <div className="border-t border-border">
          {recentPosts.map((post) => (
            <article
              key={post.title}
              className="grid gap-3 border-b border-border py-7 min-[640px]:grid-cols-[minmax(0,1fr)_auto] min-[640px]:gap-8"
            >
              <div>
                <h3 className="text-xl font-medium tracking-[-0.025em] sm:text-2xl">
                  <Link href={post.href} className="transition-colors hover:text-accent">
                    {post.title}
                  </Link>
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">{post.summary}</p>
              </div>
              <time className="text-sm text-muted">{post.date}</time>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
