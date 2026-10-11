# Social Sanity

Self-hosted, single-user app to **publish** to LinkedIn and Instagram (reformatted per platform) and to
**filter** what you see on those platforms via a Firefox extension that hides unwanted posts.

Built with SvelteKit (Svelte 5, TypeScript) on Node via `@sveltejs/adapter-node`, SQLite via Drizzle.

## Setup

```sh
npm install
cp .env.example .env
npm run hash-password -- 'your password'   # paste into APP_PASSWORD_HASH
openssl rand -base64 48                    # SESSION_SECRET
openssl rand -base64 32                    # TOKEN_ENC_KEY
npm run db:push                            # create/update the SQLite schema (needs DATABASE_URL in env)
npm run dev
```

## Connecting social accounts

Accounts are connected with OAuth on the **Integrations** page — you sign in on the platform's own
page and Social Sanity stores only an encrypted access token. Each platform needs a developer app:

- **LinkedIn** — create an app at <https://www.linkedin.com/developers/apps>, add the
  _Share on LinkedIn_ and _Sign In with LinkedIn using OpenID Connect_ products, register the
  redirect URI shown on the Integrations page, and set `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET`.
  Tokens last 60 days; reconnect when the page warns you.
- **Instagram** — create a Meta app with _Instagram API with Instagram Login_ at
  <https://developers.facebook.com/apps>, add your Professional account as a tester, register the
  redirect URI (must be HTTPS — set `PUBLIC_BASE_URL` to a tunnel or real host), and set
  `INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET`. Tokens are refreshed automatically.

### FTP / SFTP upload

The Integrations page can also hold an FTP or SFTP server for uploading files (e.g. media that
Instagram must fetch from a public URL). Pick the protocol, then enter host, port, username,
encryption (FTP only; FTPS recommended), remote directory and optionally the public URL of that
directory. For SFTP the server's host key is pinned on the first successful test; if it later
changes the connection is refused until you save the settings again. The password is **never stored**: put
it in an environment variable and enter that variable's name (e.g. `FTP_PASSWORD`). "Test
connection" logs in and writes/deletes a probe file.

## Posts repository

- Posts live as Markdown files in a git repository, added under **Integrations → Posts repository**.
- The app keeps its own clone (`REPO_DIR`, default `data/repo`).
  - It pulls every 5 minutes, and on "Pull now" on the Posts page.
  - Every change it makes is committed with the configured author and pushed straight away.
  - A push that fails stays committed locally and goes out with the next pull.
- Access:
  - SSH URLs (`git@host:org/repo.git`) use this machine's SSH keys; a new host key is accepted on first use.
  - HTTPS URLs can use a token from an environment variable whose name you enter; the token is never stored.
  - Only `https://`, `ssh://` and `git@host:path` URLs are accepted (plain `http://` only to this machine).

### File layout

- Each `.md` file under the posts folder is a post; `README.md` files are ignored.
- Posts written in the app get a folder `YYYY-MM-DD-slug/` with `index.md` and the uploaded media.
- The body is the post text, written in Markdown.
  - Markdown is turned into plain text for the platforms: emphasis is removed, `[label](url)` becomes `label url`, and list items get bullets.
  - HTML comments (`<!-- … -->`) are dropped, so they can hold private notes.
  - Images and videos are referenced with `![alt](file.jpg)`, relative to the Markdown file and inside the posts folder.
- Front matter holds the title, the date and per-platform state:

  ```yaml
  ---
  title: Autumn launch
  date: 2026-10-01
  platforms:
    instagram:
      text: |-
        Autumn collection is live! Link in bio.
        #autumn
    linkedin:
      url: https://www.linkedin.com/feed/update/urn:li:share:123/
      id: urn:li:share:123
      publishedAt: 2026-10-11T14:02:00.000Z
  ---
  ```

  - `text` replaces the text generated from the body for that platform.
  - `url`, `id` and `publishedAt` are written when a post is published; a platform with an `id` is never published again.

## Posting

- **Posts → New post** takes an optional title, the text and images or a video, and commits them as a new post.
- The preview page shows a card per platform with that platform's version of the text and media.
  - LinkedIn keeps the text as written (normalized whitespace).
  - Instagram moves links to the end of the caption, because links in captions are not clickable.
  - Each card's text can be edited; the preview, character count and checks update as you type.
  - "Save changes" commits edited texts to the front matter; "Reset text" restores the generated version.
- Publish to one platform from its card, or to every ready platform with "Publish to all".
  - Publishing runs in the background and the page refreshes until it finishes.
  - A platform is ready when it is connected and its checks show no errors.
  - Successful publishes are committed to the front matter; failures are shown in the app only.
- Instagram fetches media from a public URL.
  - With a file upload server that has a public URL, media is uploaded there first.
  - Otherwise it gets a signed link to `<PUBLIC_BASE_URL>/media/...` that expires after an hour.
- Instagram accepts only JPEG images; LinkedIn accepts JPEG, PNG and GIF, and MP4 video.
- GitHub rejects files over 100 MB, so large videos may not push.

## Scripts

| Command                           | Purpose                                   |
| --------------------------------- | ----------------------------------------- |
| `npm run dev`                     | Dev server                                |
| `npm run build` / `node build`    | Production build / run                    |
| `npm run check`                   | Type-check                                |
| `npm run lint` / `npm run format` | Prettier + ESLint                         |
| `npm test`                        | Unit (node) and component (browser) tests |
| `npm run db:push` / `db:studio`   | Drizzle schema push / browser             |

## Running in production

- Build and start with `npm run build && node build`.
- `@sveltejs/adapter-node` 6 assumes the public origin is **HTTPS** and does not read an `ORIGIN` variable.
- Run it behind a TLS-terminating reverse proxy and set `PROTOCOL_HEADER=x-forwarded-proto`.
  Also set `HOST_HEADER=x-forwarded-host` if the proxy rewrites the host.
- Plain-HTTP access without those headers makes form posts fail with 403 (CSRF check).
- Set `BODY_SIZE_LIMIT=300M` (or larger) so video uploads are accepted; the default is 512 KB.

## Layout

- `src/lib/components/` — every UI control is a component
- `src/lib/styles/` — global stylesheets and design tokens (no per-component styles)
- `src/lib/server/` — server-only code (db, auth, crypto)
