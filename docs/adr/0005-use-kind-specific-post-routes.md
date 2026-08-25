# Use kind-specific routes for published posts

Regular Posts use `/posts/[slug]`, while Heartworks use `/heartworks/[slug]`, even though both variants share one Post model and Slugs are globally unique. The separate, stable URLs preserve their distinct public browsing identities, while both routes still use the same content lookup and reading-page structure. A route returns 404 when the Slug belongs to the other Post kind, preventing a Post from being served from the wrong public collection.
