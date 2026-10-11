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

## Layout

- `src/lib/components/` — every UI control is a component
- `src/lib/styles/` — global stylesheets and design tokens (no per-component styles)
- `src/lib/server/` — server-only code (db, auth, crypto)
