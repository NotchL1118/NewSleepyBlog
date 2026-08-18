export function committedWriteFeedback(
  successMessage: string,
  cacheUpdated: boolean,
) {
  if (cacheUpdated) {
    return { message: successMessage, tone: "success" as const };
  }

  return {
    message: "数据已保存，但公开缓存刷新失败。公开页面稍后可能仍显示旧内容。",
    tone: "warning" as const,
  };
}
