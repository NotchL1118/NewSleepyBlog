import type { ComponentType } from "react";
import type { IconProps } from "@/components/icons";
import {
  CommentIcon,
  DashboardIcon,
  DocumentIcon,
  FolderIcon,
  HeartIcon,
  PageIcon,
  SettingsIcon,
  TagIcon,
} from "@/components/icons";

export type StudioNavigationItem = {
  href: string;
  label: string;
  icon: ComponentType<IconProps>;
};

export const studioNavigation = [
  {
    label: "工作台",
    items: [
      { href: "/dashboard", label: "概览", icon: DashboardIcon },
    ],
  },
  {
    label: "技术",
    items: [
      { href: "/dashboard/posts", label: "普通文章", icon: DocumentIcon },
      { href: "/dashboard/categories", label: "分类", icon: FolderIcon },
    ],
  },
  {
    label: "生活",
    items: [
      { href: "/dashboard/heartworks", label: "心作", icon: HeartIcon },
      { href: "/dashboard/columns", label: "专栏", icon: FolderIcon },
    ],
  },
  {
    label: "标签",
    items: [
      { href: "/dashboard/tags", label: "标签", icon: TagIcon },
    ],
  },
  {
    label: "站点",
    items: [
      { href: "/dashboard/pages", label: "页面", icon: PageIcon },
      { href: "/dashboard/comments", label: "评论", icon: CommentIcon },
      { href: "/dashboard/settings", label: "站点设置", icon: SettingsIcon },
    ],
  },
] as const satisfies ReadonlyArray<{
  label: string;
  items: ReadonlyArray<StudioNavigationItem>;
}>;
