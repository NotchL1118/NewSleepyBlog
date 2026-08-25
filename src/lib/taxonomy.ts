export type TaxonomySortKey = "name" | "public" | "total" | "updated";

type SortableTaxonomyRow = {
  name: string;
  slug: string | null;
  updatedAt: string;
  totalCount: number;
  publicCount: number;
};

export const tagNameMaxLength = 80;

export function validateTagName(value: string) {
  const name = value.trim();

  if (!name) return { name, error: "请输入标签名称。" };
  if (/\s/u.test(name)) {
    return { name, error: "标签名称不能包含空格或其他空白字符。" };
  }
  if ([...name].length > tagNameMaxLength) {
    return { name, error: `标签名称不能超过 ${tagNameMaxLength} 个字符。` };
  }

  return { name, error: null };
}

export function filterAndSortTaxonomyRows<T extends SortableTaxonomyRow>(
  rows: readonly T[],
  query: string,
  sort: TaxonomySortKey,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");
  const filtered = normalizedQuery
    ? rows.filter((row) =>
        row.name.toLocaleLowerCase("zh-CN").includes(normalizedQuery)
        || row.slug?.includes(normalizedQuery),
      )
    : [...rows];

  return filtered.sort((left, right) => {
    if (sort === "total") {
      return right.totalCount - left.totalCount
        || left.name.localeCompare(right.name, "zh-CN");
    }
    if (sort === "public") {
      return right.publicCount - left.publicCount
        || left.name.localeCompare(right.name, "zh-CN");
    }
    if (sort === "updated") {
      return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
    }
    return left.name.localeCompare(right.name, "zh-CN");
  });
}
