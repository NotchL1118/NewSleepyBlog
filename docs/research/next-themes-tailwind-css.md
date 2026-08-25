# Research: next-themes × Tailwind CSS

**Date:** 2026-08-06  
**Versions in this repo:** `next-themes@0.4.6`, `tailwindcss@4.3.3`  
**Primary sources:**
- [next-themes README — With TailwindCSS](https://github.com/pacocoursey/next-themes#with-tailwindcss)
- [Tailwind CSS v4 — Dark mode](https://tailwindcss.com/docs/dark-mode)

---

## 核心契约（必须对齐）

两个库分工不同，靠 **同一个 DOM 信号** 对接：

| 库 | 职责 |
| --- | --- |
| **next-themes** | 读 `localStorage` / 系统偏好，在 **`<html>`** 上写入主题标记（`class` 或 `data-*`），并注入防闪烁脚本 |
| **Tailwind** | 根据该标记决定 `dark:` 工具类是否生效 |

**两边的选择器必须一致。** 一边写 `class="dark"`，另一边仍监听 `prefers-color-scheme`，就会出现：用户强制浅色、系统却是深色时，`dark:bg-*` 仍按系统显示深色。

```
用户点 Toggle
    → next-themes setTheme(...)
    → <html class="dark"> 或移除 .dark
    → Tailwind dark: 工具类开关
    → 自定义 CSS（.dark { --token }）开关
```

---

## 官方推荐组合（class 策略）

### next-themes 侧

```tsx
<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
```

- `attribute="class"` 时，暗色会在 `<html>` 上加上 `class="dark"`。
- 若用 `value` 映射主题名，**暗色对应的 DOM 值必须仍是 `"dark"`**，否则 Tailwind 的 `dark:` 认不到。

### Tailwind 侧（按大版本）

#### Tailwind v3（next-themes README 仍写的是这一套）

```js
// tailwind.config.js
module.exports = {
  darkMode: "selector", // Tailwind ≥ 3.4.1
  // 更旧：darkMode: "class"
};
```

自定义 data 属性时：

```js
darkMode: ["selector", '[data-mode="dark"]']
// 对应 <ThemeProvider attribute="data-mode">
```

#### Tailwind v4（本仓库，无 `tailwind.config`）

v4 默认 `dark:` 走 **`prefers-color-scheme`**。手动切换时必须在 CSS 里覆盖 variant：

```css
@import "tailwindcss";

/* 与 attribute="class" 对齐 — Tailwind 官方文档 */
@custom-variant dark (&:where(.dark, .dark *));
```

效果：只要祖先（通常是 `html`）带 `.dark`，`dark:*` 就生效，不再只看系统偏好。

data 属性写法：

```css
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));
/* 对应 attribute="data-theme"（next-themes 默认） */
```

---

## 两条样式路径（可并存）

对接 next-themes 后，页面样式通常有两层，**都要绑到同一个 `.dark`（或 data 属性）**：

### A. 语义 CSS 变量（Sleepy 主路径）

```css
:root {
  --background: #fefefb;
  --foreground: #1a1a1a;
}

.dark {
  --background: #1c1c1e;
  --foreground: #ededed;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
}
```

用法：`bg-background`、`text-foreground` — **不必写 `dark:`**，变量随 `.dark` 切换。

这一层 **不依赖** `@custom-variant`，只依赖 `.dark` 选择器本身。

### B. Tailwind `dark:` 工具类

```tsx
<h1 className="text-black dark:text-white">
```

这一层 **依赖** v4 的 `@custom-variant dark`（或 v3 的 `darkMode: 'selector'`）。  
漏配时：系统深色 + 用户强制浅色 → `dark:text-white` 仍可能生效，和 next-themes 打架。

### 不要混用的错误

| 错误 | 后果 |
| --- | --- |
| Provider 用 `attribute="class"`，CSS 仍只写 `@media (prefers-color-scheme: dark)` | Toggle 无法覆盖系统偏好下的 token |
| 有 `dark:` 类，但未配 `@custom-variant` / `darkMode` | `dark:` 仍跟系统，不跟 toggle |
| Provider 默认 `data-theme`，Tailwind 却按 `.dark` 配 | 两边对不上，`dark:` 永不亮 |
| `value={{ dark: "midnight" }}` 却未同步改 Tailwind 选择器 | `class="midnight"`，Tailwind 只认 `dark` |

---

## 版本对照表

| Tailwind | next-themes `attribute` | Tailwind 配置 |
| --- | --- | --- |
| v3 &lt; 3.4.1 | `"class"` | `darkMode: "class"` |
| v3 ≥ 3.4.1 | `"class"` | `darkMode: "selector"` |
| **v4（本仓库）** | **`"class"`** | **`@custom-variant dark (&:where(.dark, .dark *));`** |
| 任意 | `"data-theme"` / `"data-mode"` | 对应 attribute 的 selector / custom-variant |

---

## 与本仓库当前实现对照

| 检查项 | 状态 | 位置 |
| --- | --- | --- |
| `attribute="class"` | ✅ | `src/app/layout.tsx` |
| `@custom-variant dark (&:where(.dark, .dark *))` | ✅ | `src/app/globals.css` |
| 语义变量用 `.dark { --* }` 而非仅 media | ✅ | `src/app/globals.css` |
| `@theme inline` 映射到 token | ✅ | 同上 |
| 纸张噪点跟 `.dark` | ✅ | `.dark body::before` |
| 未再单独用 media 驱动 token | ✅ | 已移除 |

**结论：** 按官方契约，Sleepy 的 next-themes × Tailwind v4 接线已经齐；A/B 两层都绑在 `html.dark` 上。

### 可选增强（非必须）

1. **同时写 class + data-theme**（排查 / 双轨工具时有用）  
   `attribute={["class", "data-theme"]}` — 一般不需要。
2. **`color-scheme`** — next-themes 默认 `enableColorScheme={true}`，会设浏览器原生控件配色，建议保持。
3. **`dark:` 与变量混用时的优先级** — 同一元素上硬编码 `dark:bg-black` 会盖过 `bg-background`；组件层优先语义 token，少写裸 `dark:bg-gray-*`，更贴视觉规范。

---

## 最小正确模板（Tailwind v4 + next-themes）

```tsx
// layout.tsx
<html lang="zh-CN" suppressHydrationWarning className={fonts}>
  <body>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  </body>
</html>
```

```css
/* globals.css */
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));

:root { --background: #fefefb; /* light tokens */ }
.dark  { --background: #1c1c1e; /* dark tokens */ }

@theme inline {
  --color-background: var(--background);
}
```

```tsx
// 组件
<div className="bg-background text-foreground">
  {/* 语义 token：自动跟主题 */}
  <span className="text-muted dark:text-accent">
    {/* 仅在确需覆写时用 dark: */}
  </span>
</div>
```

---

## 验收（专门测 Tailwind 结合）

1. 系统深色 → 选 **浅色** → `html` 无 `.dark`，且页面上任意 `dark:*` **不**生效。  
2. 系统浅色 → 选 **深色** → `html` 有 `.dark`，`dark:*` 与 CSS 变量同时为深色。  
3. DevTools 看编译后的 `dark:` 选择器应类似 `:where(.dark, .dark *) ...`，而不是仅 `@media (prefers-color-scheme: dark)`。  
4. 刷新后 class 与 localStorage 一致，无错误主题闪一下（production 更可靠）。

---

## Sources

1. [next-themes — With TailwindCSS](https://github.com/pacocoursey/next-themes#with-tailwindcss) — `attribute="class"` + `darkMode: 'selector'`  
2. [Tailwind v4 — Toggling dark mode manually](https://tailwindcss.com/docs/dark-mode#toggling-dark-mode-manually) — `@custom-variant dark`  
3. 本仓库：`src/app/layout.tsx`、`src/app/globals.css`
