export type StudioTableColumn = {
  key: string;
  label: string;
  className?: string;
};

export type StudioCollection = {
  title: string;
  eyebrow: string;
  description: string;
  actionLabel: string;
  columns: ReadonlyArray<StudioTableColumn>;
  rows: ReadonlyArray<Record<string, string>>;
};

export const studioCollections = {
  posts: {
    title: "普通文章",
    eyebrow: "内容",
    description: "管理技术、折腾与经验记录。",
    actionLabel: "新建文章",
    columns: [
      { key: "title", label: "标题", className: "min-w-72" },
      { key: "category", label: "分类" },
      { key: "status", label: "状态" },
      { key: "updated", label: "最近更新", className: "min-w-32" },
    ],
    rows: [
      { title: "把复杂的事情慢慢说清楚", category: "设计", status: "已发布", updated: "2026.08.07" },
      { title: "我的第一套个人网站工作流", category: "折腾", status: "已归档", updated: "2026.07.28" },
      { title: "从一次迁移谈起", category: "技术", status: "草稿", updated: "2026.07.19" },
      { title: "把日志留在能找到的地方", category: "经历", status: "已发布", updated: "2026.06.30" },
    ],
  },
  heartworks: {
    title: "心作",
    eyebrow: "内容",
    description: "整理生活札记与不急着得出结论的想法。",
    actionLabel: "新建心作",
    columns: [
      { key: "title", label: "标题", className: "min-w-72" },
      { key: "column", label: "专栏" },
      { key: "status", label: "状态" },
      { key: "updated", label: "最近更新", className: "min-w-32" },
    ],
    rows: [
      { title: "夜里适合读些什么", column: "夜读", status: "已发布", updated: "2026.07.16" },
      { title: "雨停以后慢慢走", column: "生活札记", status: "草稿", updated: "2026.07.10" },
      { title: "一些关于远方的旧照片", column: "远行", status: "已归档", updated: "2026.06.18" },
    ],
  },
  categories: {
    title: "分类",
    eyebrow: "内容组织",
    description: "用于组织普通文章的主题集合。",
    actionLabel: "新建分类",
    columns: [
      { key: "name", label: "名称", className: "min-w-52" },
      { key: "slug", label: "Slug", className: "min-w-48" },
      { key: "count", label: "文章数" },
      { key: "updated", label: "最近更新" },
    ],
    rows: [
      { name: "技术", slug: "technology", count: "82", updated: "2026.08.07" },
      { name: "折腾", slug: "tinkering", count: "14", updated: "2026.07.28" },
      { name: "设计", slug: "design", count: "5", updated: "2026.07.12" },
      { name: "经历", slug: "experience", count: "11", updated: "2026.06.30" },
    ],
  },
  columns: {
    title: "专栏",
    eyebrow: "内容组织",
    description: "用于组织心作的长期主题。",
    actionLabel: "新建专栏",
    columns: [
      { key: "name", label: "名称", className: "min-w-52" },
      { key: "slug", label: "Slug", className: "min-w-48" },
      { key: "count", label: "心作数" },
      { key: "updated", label: "最近更新" },
    ],
    rows: [
      { name: "生活札记", slug: "life-notes", count: "9", updated: "2026.07.10" },
      { name: "所思所想", slug: "thoughts", count: "7", updated: "2026.07.03" },
      { name: "夜读", slug: "night-reading", count: "5", updated: "2026.07.16" },
      { name: "远行", slug: "journeys", count: "3", updated: "2026.06.18" },
    ],
  },
  tags: {
    title: "标签",
    eyebrow: "内容组织",
    description: "跨普通文章和心作复用的主题标记。",
    actionLabel: "新建标签",
    columns: [
      { key: "name", label: "标签", className: "min-w-52" },
      { key: "slug", label: "Slug", className: "min-w-48" },
      { key: "count", label: "使用次数" },
      { key: "updated", label: "最近更新" },
    ],
    rows: [
      { name: "Next.js", slug: "nextjs", count: "18", updated: "2026.08.07" },
      { name: "Supabase", slug: "supabase", count: "7", updated: "2026.08.03" },
      { name: "阅读", slug: "reading", count: "12", updated: "2026.07.16" },
      { name: "随想", slug: "notes", count: "23", updated: "2026.07.10" },
    ],
  },
  pages: {
    title: "页面",
    eyebrow: "站点",
    description: "维护文章流之外的独立内容。",
    actionLabel: "新建页面",
    columns: [
      { key: "name", label: "页面", className: "min-w-64" },
      { key: "path", label: "地址", className: "min-w-48" },
      { key: "comments", label: "评论" },
      { key: "updated", label: "最近更新" },
    ],
    rows: [
      { name: "关于 Sleepy", path: "/about", comments: "开启", updated: "2026.06.21" },
      { name: "常用工具", path: "/uses", comments: "关闭", updated: "2026.05.09" },
      { name: "友情链接", path: "/friends", comments: "开启", updated: "2026.04.18" },
    ],
  },
  comments: {
    title: "评论",
    eyebrow: "站点",
    description: "查看读者在文章和页面下留下的公开回应。",
    actionLabel: "评论设置",
    columns: [
      { key: "reader", label: "读者", className: "min-w-36" },
      { key: "content", label: "内容", className: "min-w-80" },
      { key: "target", label: "位置", className: "min-w-56" },
      { key: "time", label: "时间" },
    ],
    rows: [
      { reader: "northwind", content: "这段关于边界的描述很有启发。", target: "把复杂的事情慢慢说清楚", time: "2 小时前" },
      { reader: "sora", content: "期待后续分享完整的工作流。", target: "我的第一套个人网站工作流", time: "昨天" },
      { reader: "leaf", content: "夜里读散文确实很合适。", target: "夜里适合读些什么", time: "3 天前" },
    ],
  },
} as const satisfies Record<string, StudioCollection>;

export const overviewMetrics = [
  { label: "普通文章", value: "112", note: "8 篇草稿" },
  { label: "心作", value: "24", note: "2 篇草稿" },
  { label: "本月评论", value: "38", note: "3 条待查看" },
  { label: "独立页面", value: "3", note: "全部公开" },
] as const;

export const recentActivity = [
  { action: "更新了普通文章", target: "把复杂的事情慢慢说清楚", time: "2 小时前" },
  { action: "收到新评论", target: "夜里适合读些什么", time: "昨天" },
  { action: "归档了普通文章", target: "我的第一套个人网站工作流", time: "3 天前" },
] as const;
