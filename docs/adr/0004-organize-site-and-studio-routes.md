# Organize reader and Admin routes as site and studio

Sleepy organizes App Router pages into the virtual route groups `(site)` for the public reader-facing site and `(studio)` for the Admin's content-management workspace. Route-group names do not appear in URLs; every page in `(studio)` must live beneath a real `dashboard` segment and therefore use the `/dashboard/*` URL prefix, keeping the Admin workspace visually and structurally separate from public content routes.

The expected top-level shape is:

```text
src/app/
├── (site)/...
└── (studio)/
    └── dashboard/...
```

`(site)` and `(studio)` may provide their own layouts, while authentication and authorization remain explicit protections for `/dashboard/*`; the route name itself is not a security mechanism.
