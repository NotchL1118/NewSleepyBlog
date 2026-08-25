# Sleepy

Sleepy 是一个由站点所有者独立写作、面向公开读者发布内容的个人博客。Admin 在 Studio 中创作普通文章和心作；读者阅读公开内容，登录后可以参与评论，但不会获得内容创作权限。

## 本地开发

本地内容库从空开始，不依赖演示文章。完整的启动、向前 migration、Admin 初始化和人工 smoke test 见 [docs/local-development.md](./docs/local-development.md)。GitHub 登录与生产回调见 [docs/auth-setup.md](./docs/auth-setup.md)。

```bash
cp .env.example .env.local
pnpm install
pnpm exec supabase start
pnpm exec supabase migration up --local
pnpm dev
```

首次通过 GitHub 登录后，把这次登录对应的 Auth UUID 写入 `private.site_admins`。不要对已经有 Admin 的本地库执行 `supabase db reset`。

## 验证

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm test
pnpm build
```

## License

本项目暂未指定开源许可证。
