# Create Post taxonomy independently from Post persistence

Categories, Columns, and Tags are created as independent resources through an explicit Admin action, including when creation starts inside the Post editor. The editor receives the created resource ID and Post draft or publication mutations only persist and validate those references; they do not create taxonomy resources as a side effect. This keeps resource creation explicit, preserves a newly created selection across draft saves, and allows unused groups or tags to be managed independently.
