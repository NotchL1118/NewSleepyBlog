# Store pages separately from posts

Pages and posts use separate database tables because their identities, required fields, and lifecycles differ: a page is addressed by an immutable page key, may contain empty Markdown, and becomes available through code-defined routing, while a post has a slug, content grouping, publication lifecycle, and optional archive metadata. Keeping them separate avoids a shared table dominated by conditional fields and constraints, at the cost of comments needing to support both target types.
