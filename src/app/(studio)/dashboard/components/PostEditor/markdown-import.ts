export const MARKDOWN_FILE_ACCEPT = ".md,.markdown";

type NamedFile = {
  name: string;
};

export function isMarkdownFileName(name: string) {
  return /\.(?:md|markdown)$/i.test(name);
}

export function markdownFileSelectionError(files: readonly NamedFile[]) {
  if (files.length !== 1) {
    return "请一次只导入一个 Markdown 文件。";
  }
  if (!isMarkdownFileName(files[0].name)) {
    return "仅支持 .md 或 .markdown 文件。";
  }
  return null;
}

export function markdownFileContentError(content: string) {
  return content.trim() ? null : "Markdown 文件为空，未导入。";
}
