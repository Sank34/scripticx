# Group GIF search

Set `KLIPY_API_KEY` in the server environment (locally in `.env.local`, and in the deployment environment). The authenticated `/api/groups/gifs` route uses it for featured GIFs and search; the key is never returned to the browser.

Uploads and direct GIF links remain available when search is unavailable. GIF messages use the same `expressionType`, `gifUrl`, and `stickerUrl` metadata as the mobile app. Custom emoji names use the existing sticker `name` column, so this feature requires no database migration. Legacy sticker shortcodes still render.
