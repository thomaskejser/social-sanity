# Security

Social Sanity is built as a single-user app that runs on your own machine.
This document describes what that means today, and what it takes to host it somewhere other people can reach it.
Nothing here is implemented yet beyond what the "Today" section lists.

## Today

- There is no login.
  Anyone who can reach the port can do everything the user can:
  - read every human, company, address, phone number, birthday and task;
  - publish to LinkedIn and Instagram as the user;
  - change or remove integrations, and connect their own accounts;
  - download the whole database from Settings.
- What is protected already:
  - OAuth tokens and app client secrets are encrypted at rest with `SOCIAL_SANITY_TOKEN_ENC_KEY`, which lives only in the environment.
  - Passwords and API tokens (FTP, git, Claude, backup) are never stored; the database holds the name of the environment variable instead.
  - Form posts are checked against the request's origin (SvelteKit's CSRF check), so another site cannot submit forms on the user's behalf.
  - OAuth sign-ins carry a state cookie that is checked on the callback.
  - `GET /api/backup` needs `Authorization: Bearer <SOCIAL_SANITY_BACKUP_TOKEN>` and is off while the token is unset.
  - Articles from other sites are shown in a sandboxed frame with scripts blocked.
- Bind it to `127.0.0.1` (`SOCIAL_SANITY_SERVER_HOST=127.0.0.1`) as long as there is no login.

## Threats once it is hosted

- **Anyone on the internet uses the app as the user.**
  This is the main gap, and only authentication closes it.
- **`/media` must stay public for Instagram**, which fetches post images from `<SOCIAL_SANITY_PUBLIC_BASE_URL>/media/...`.
  Today it serves any image or video in the posts folder, including drafts that are not published yet.
- **The server fetches addresses the user types in** (content sources, feeds, Claude's suggestions).
  Hosted, that can be turned against the host's own network: `http://169.254.169.254/` (cloud metadata), `http://localhost:…`, other private addresses.
- **JSON endpoints** (`/humans/suggest`, `/companies/suggest`, `/humans/[id]/company-preview`) return personal data to anyone who asks.
- **The database download** hands over everything at once; the encryption key is not in it, but contacts are in plain text.
- **Claude and Google receive personal data** when the user asks them to: Find with Claude and Enhance send what the app knows about a human or company to Claude, and sorting YouTube channels sends their titles and descriptions.
- **Running Claude locally** uses the Claude Code login of whoever runs the server.
  Hosted, every visitor would spend that person's Claude plan, which Anthropic's terms don't allow; a hosted app uses an API token.
  Claude Code runs in an empty temporary folder with only web search, no settings and none of the app's secrets in its environment.

## Can we force OAuth before anything runs?

Yes.
SvelteKit runs `handle` in `src/hooks.server.ts` before every page, form action and endpoint, so one check there covers the whole app.
There are two ways to get there; the first needs no code.

### Option 1: an identity-aware proxy in front (no code)

Put the app behind a proxy that signs the user in before any request reaches it, and keep the app itself on `127.0.0.1`.

| Proxy                                      | Sign-in                                                 | Notes                                                                    |
| ------------------------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------ |
| Cloudflare Access (with Cloudflare Tunnel) | Google, GitHub, one-time e-mail codes                   | No open port on the host; free for a single user.                        |
| Tailscale (`tailscale serve`)              | The user's tailnet                                      | Not on the public internet at all; Instagram cannot fetch `/media` then. |
| oauth2-proxy                               | Any OpenID Connect provider (Google, GitHub, Microsoft) | Self-hosted, in front of the app on the same machine.                    |
| Authelia, Authentik                        | Their own accounts, passkeys, TOTP                      | Self-hosted; more to run.                                                |

- Allow exactly one account (the user's e-mail address), not "anyone with a Google account".
- Leave these paths outside the login, and protect them their own way:
  - `/media/*`, for Instagram; see "Narrow `/media`" below.
  - `/api/backup`, which has its own token; or give the backup agent the proxy's service token instead.
- The OAuth callbacks (`/integrations/*/callback`) need no exception: the user's browser reaches them already signed in.
- Run it over HTTPS and set `SOCIAL_SANITY_SERVER_PROTOCOL_HEADER=x-forwarded-proto` so the CSRF check and cookies see the real scheme.

This is the quickest safe way to host the app, and it keeps the app's code simple.

### Option 2: sign-in built into the app

The app checks the user itself, so it is safe even when someone reaches the port directly.

1. **Sign-in with OpenID Connect.**
   Add `/auth/login`, `/auth/callback` and `/auth/logout` routes using the authorization-code flow with PKCE, against Google (or any OpenID Connect provider).
   Ask only for `openid email`.
2. **One owner.**
   A new `SOCIAL_SANITY_OWNER_EMAIL` names the only account allowed in; refuse any other e-mail, and require `email_verified`.
3. **The sign-in app comes from the environment, not the database.**
   The Google app for Contacts is entered in the browser after the app is running, which a login cannot depend on.
   Use `SOCIAL_SANITY_LOGIN_CLIENT_ID` and `SOCIAL_SANITY_LOGIN_CLIENT_SECRET`, and refuse to start when they are missing while the app is not bound to `127.0.0.1`.
4. **Sessions.**
   After sign-in, store a random session id in a `session` table (with its expiry) and send it as a cookie: `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`.
   Expire sessions after a set time (e.g. 30 days), and on logout.
5. **The guard in `handle`.**
   For every request: allow `/auth/*`, `/media/*` and `/api/backup`; otherwise, without a valid session, send pages to `/auth/login` and answer endpoints with 401.
   Put the user on `event.locals` so pages can show who is signed in.
6. **Passkeys as an alternative.**
   WebAuthn passkeys need no third party at all, but need a first-run setup step to register the first passkey.

A built-in login and a proxy can be combined; the proxy then adds a second gate.

## Other hardening for a hosted app

- **Narrow `/media`.**
  Serve only files of posts that are being published, through signed links that expire (an HMAC of the path and an expiry time in the query).
  Or upload media to the blog site first, as the app already does when it has a public URL, and stop exposing `/media` at all.
- **Block internal addresses when fetching.**
  Resolve each host name first and refuse loopback, private, link-local and cloud-metadata addresses, including after redirects.
- **Content Security Policy.**
  Turn on SvelteKit's `csp` option (`script-src 'self'`, `frame-ancestors 'none'`), so injected markup cannot run scripts.
- **Rate limits** on `/auth/*` and `/api/backup`, in the proxy or in `handle`.
- **Backups.**
  Encrypt backup files at rest wherever the agent stores them; they hold personal data in plain text.
  Rotate `SOCIAL_SANITY_BACKUP_TOKEN` when an agent is retired.
- **The host.**
  Run the app as its own unprivileged user, with the `data/` folder readable only by it (`chmod 700`), and keep the environment variables out of shell history and logs.
- **Dependencies.**
  Keep `npm audit` clean and update SvelteKit, better-sqlite3, the Anthropic SDK and the Claude Agent SDK regularly.
- **Personal data sent to others.**
  Keep Find with Claude and Enhance as actions the user starts; never run them in the background.
  Sorting YouTube channels is the one background use of Claude; it sends only the public titles and descriptions of subscribed channels.

## Recommended path

1. Host behind Cloudflare Access or oauth2-proxy, allowing only the user's account (Option 1), with `/media/*` and `/api/backup` left outside.
2. Narrow `/media` to signed, expiring links, and block internal addresses in the feed fetcher.
3. Add the built-in sign-in (Option 2) when the app should be safe without a proxy, or before it ever serves more than one person.
