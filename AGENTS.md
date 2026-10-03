# Codex Working Agreement

Read `README.md` and `PROJECT_CONTEXT.md` before changing this project.

- Preserve financial precision at two decimal places; do not silently force a reconciliation difference to zero.
- Never commit source bank statements, PDF passwords, `.env` files, credentials, or exported production databases.
- Treat `public/dashboard-data.json` as the checked-in reporting snapshot and D1/R2 as mutable runtime records.
- Before committing, run `npm run doctor`, `npm run lint`, and `npm test`.
- Verify the rendered Dashboard after changing data or UI.
- Reuse the Sites project ID from `.openai/hosting.json`; never create a replacement project unless the user explicitly requests one.
- Preserve unrelated user changes in a dirty worktree.

