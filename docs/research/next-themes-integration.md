# Research: Integrating next-themes

**Date:** 2026-08-06  
**Status:** Implemented (see also [next-themes × Tailwind CSS](./next-themes-tailwind-css.md))  
**Primary sources:** [pacocoursey/next-themes README](https://github.com/pacocoursey/next-themes), [Tailwind CSS v4 dark mode](https://tailwindcss.com/docs/dark-mode)

## Context in this repo

| Item | Current state |
| --- | --- |
| Framework | Next.js 16 App Router (`src/app/`) |
| Styling | Tailwind CSS v4 (`@import "tailwindcss"`, no `tailwind.config`) |
| Theme tokens | CSS variables in `src/app/globals.css` |
| Dark mode trigger | `@media (prefers-color-scheme: dark)` only |
| User toggle | None |
| Package | `next-themes` **not** installed |

Visual tokens already match `docs/agents/visual-style.md` (light paper palette + warm dark + accents). The missing piece is **manual theme control** with no FOUC, while still supporting system preference.

## What next-themes provides

From the official package:

- System preference via `prefers-color-scheme`
- No flash on load (injects a blocking script that sets `html` attributes before paint)
- Cross-tab sync via `localStorage`
- App Router support
- `class` or `data-*` attribute on `<html>`
- `useTheme` hook for toggles
- Optional forced theme per page

## Recommended integration path for Sleepy

Because this app styles primarily with **CSS variables** (not many `dark:` utilities), two attribute strategies work. Prefer **`attribute="class"`** — it matches Tailwind’s ecosystem and is the most common App Router setup.

### 1. Install

```bash
pnpm add next-themes
```

### 2. Client ThemeProvider wrapper

`ThemeProvider` from next-themes is a client component. Official README imports it in `layout` directly; a thin `"use client"` wrapper (shadcn-style) is clearer for props and re-export:

```tsx
// src/components/theme-provider.tsx
"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

### 3. Root layout

Requirements from next-themes docs:

1. Wrap children with `ThemeProvider`
2. Add `suppressHydrationWarning` on `<html>` (the library mutates that element before hydration; the prop only suppresses one level deep)

```tsx
// src/app/layout.tsx (sketch)
import { ThemeProvider } from "@/components/theme-provider";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

Useful props (defaults from README):

| Prop | Default | Notes for Sleepy |
| --- | --- | --- |
| `attribute` | `'data-theme'` | Use `"class"` for Tailwind-friendly `.dark` on `<html>` |
| `defaultTheme` | `'system'` | Matches calm “follow device” default |
| `enableSystem` | `true` | Keep system option |
| `disableTransitionOnChange` | `false` | Set `true` to avoid janky color transitions on toggle |
| `storageKey` | `'theme'` | Optional rename if needed |
| `enableColorScheme` | `true` | Sets browser `color-scheme` for native form UI |

### 4. CSS: stop using media query as the sole switch

**Critical:** once next-themes owns the theme, keep token switches on **class/attribute**, not only `@media (prefers-color-scheme: dark)`.

Why: if the user forces **light** while the OS is dark, a media query still applies dark variables and fights the toggle.

**Before (current):**

```css
:root { --background: #fefefb; /* light */ }
@media (prefers-color-scheme: dark) {
  :root { --background: #1c1c1e; /* dark */ }
}
```

**After (class strategy):**

```css
:root {
  --background: #fefefb;
  --foreground: #1a1a1a;
  --surface: #f7f6f2;
  --muted: #6b6b6b;
  --border: #e5e4df;
  --accent: #33a6b8;
}

.dark {
  --background: #1c1c1e;
  --foreground: #ededed;
  --surface: #2c2c2e;
  --muted: #a1a1a6;
  --border: #3a3a3c;
  --accent: #f596aa;
}
```

Apply the same change to the paper-grain overlay (`body::before` currently uses `@media (prefers-color-scheme: dark)` → use `.dark body::before` or `html.dark body::before`).

**Alternative: keep default `data-theme`:**

```css
[data-theme='dark'] { /* tokens */ }
```

```tsx
<ThemeProvider attribute="data-theme" /* or omit attribute */ />
```

### 5. Tailwind v4 dark variant

Tailwind v4 defaults `dark:` to `prefers-color-scheme`. With a class-driven theme, override the variant in CSS (no `tailwind.config` needed):

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));
```

Source: [Tailwind dark mode — toggling manually](https://tailwindcss.com/docs/dark-mode).

If using `data-theme` instead:

```css
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));
```

Sleepy mostly uses CSS variables (`bg-background`, etc.), so this is optional until `dark:` utilities appear. Still recommended so future `dark:` usage stays consistent with the toggle.

### 6. Theme toggle UI (hydration-safe)

`useTheme()` returns `undefined` for theme fields until client mount. Rendering icons/labels from `theme` on the server causes hydration mismatches.

Official pattern:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    // Placeholder matching control size avoids layout shift
    return <button type="button" aria-hidden disabled className="..." />;
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      {/* icon based on resolvedTheme */}
    </button>
  );
}
```

Notes:

- Prefer `resolvedTheme` for “what is actually painted” when `theme === "system"`.
- Prefer `theme` when showing which **option** is selected (light / dark / system).
- Alternative: `next/dynamic(..., { ssr: false })` for the toggle only.

### 7. Minimal file change list

| File | Change |
| --- | --- |
| `package.json` | Add `next-themes` |
| `src/components/theme-provider.tsx` | New client wrapper |
| `src/app/layout.tsx` | `suppressHydrationWarning` + provider |
| `src/app/globals.css` | Class/attribute selectors; optional `@custom-variant dark` |
| `src/components/theme-toggle.tsx` (optional) | Hydration-safe toggle |
| Header / chrome | Mount toggle when UI shell exists |

## App Router pitfalls

1. **`suppressHydrationWarning` on `<html>`** — required; without it React warns about intentional DOM updates.
2. **Do not read `theme` during SSR for UI chrome** — mount gate or client-only dynamic import.
3. **Dev-mode flash is normal** — README FAQ: production builds avoid flash; dev may still flash.
4. **Font classes on `<html>`** — next-themes merges theme class with existing classes (`className` with font variables); keep font variables on `<html>` as today.
5. **Forced theme** — App Router does not use `Page.theme` (pages router). Use a nested layout with `<ThemeProvider forcedTheme="dark">` or pass `forcedTheme` where appropriate.

## Mapping to visual style

| Role | Light | Dark (via `.dark`) |
| --- | --- | --- |
| Background | `#FEFEFB` | `#1C1C1E` |
| Surface | `#F7F6F2` | `#2C2C2E` |
| Text | `#1A1A1A` | `#EDEDED` |
| Muted | `#6B6B6B` | `#A1A1A6` |
| Border | `#E5E4DF` | `#3A3A3C` |
| Accent | `#33A6B8` | `#F596AA` |

Token values already live in `globals.css`; integration is **wiring control**, not redesigning the palette.

## Suggested defaults for Sleepy

| Choice | Value | Rationale |
| --- | --- | --- |
| Attribute | `class` | Tailwind ecosystem + simple `.dark { }` token override |
| Default | `system` | Nighttime reading comfort without forcing a mode |
| Transitions | `disableTransitionOnChange` | Cleaner palette swap; fits restrained motion |
| Toggle | light ↔ dark (optional third “system”) | System can stay as default without a third control until needed |

## Out of scope / not required

- CSS-in-JS adapters
- Multiple named themes beyond light/dark
- CSP `nonce` unless a CSP is added later (`nonce` / `scriptProps` on provider)
- Cloudflare Rocket Loader (`scriptProps={{ 'data-cfasync': 'false' }}` only if that CDN feature is enabled)

## Verification checklist (when implementing)

1. First paint in production has no wrong-theme flash (light OS + saved dark, and reverse).
2. Toggle forces light while OS is dark (and reverse); tokens follow class, not media query alone.
3. Reload preserves choice (`localStorage` key `theme`).
4. Second tab syncs.
5. No hydration warnings with `suppressHydrationWarning` + mounted toggle.
6. Paper grain overlay opacity/blend tracks light vs dark.

## Sources

1. [next-themes README](https://github.com/pacocoursey/next-themes) — install, App Router layout, API, hydration, Tailwind class attribute  
2. [Tailwind CSS dark mode (v4)](https://tailwindcss.com/docs/dark-mode) — `@custom-variant dark` for class / data-attribute  
3. Repo: `src/app/globals.css`, `src/app/layout.tsx`, `docs/agents/visual-style.md`
