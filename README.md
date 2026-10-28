# Social Sanity

Single-user app, run locally on your own machine, that shields you from the algorithms of social media.
It keeps track of the humans you care about, plans your tasks, reads your non-algorithmic feed, and publishes to LinkedIn and Instagram without opening them.

Built with SvelteKit (Svelte 5, TypeScript) on Node via `@sveltejs/adapter-node`, and SQLite through better-sqlite3 with plain SQL.

## Setup

```sh
npm install
npm run dev
```

- Settings come from environment variables named `SOCIAL_SANITY_*`; `.env.example` lists them.
- Keep the values in `~/.zshenv`, e.g. `export SOCIAL_SANITY_TOKEN_ENC_KEY='…'`.
  - A git-ignored `.env` in the project also works; a value set in the shell wins.
  - Restart the dev server after changing one.
- `SOCIAL_SANITY_DATABASE_URL` and `SOCIAL_SANITY_TOKEN_ENC_KEY` are required.
  Generate the key with `openssl rand -base64 32`.
- The app creates its SQLite tables on start from `src/lib/server/db/schema.sql`.

## Design

- What the app does is described in [DESIGN.md](./DESIGN.md) and the documents it links to.
- Each functionality is a tab in the left-hand navigation:

  | Tab          | Route           | Design                                           |
  | ------------ | --------------- | ------------------------------------------------ |
  | Consume      | `/consume`      | [DESIGN_CONSUME.md](./DESIGN_CONSUME.md)         |
  | Humans       | `/humans`       | [DESIGN_HUMANS.md](./DESIGN_HUMANS.md)           |
  | Tasks        | `/tasks`        | [DESIGN_TASKS.md](./DESIGN_TASKS.md)             |
  | Contribute   | `/contribute`   | [DESIGN_CONTRIBUTE.md](./DESIGN_CONTRIBUTE.md)   |
  | Integrations | `/integrations` | [DESIGN_INTEGRATION.md](./DESIGN_INTEGRATION.md) |
  | Settings     | `/settings`     | Credits and trademarks                           |

- Each integration has its own page, e.g. `/integrations/linkedin` or `/integrations/blog-site`.
- Content sources are read every 30 minutes, and on "Refresh now" on the Consume page.
  - A source URI that is itself an RSS or Atom feed is read directly; otherwise the feed its page advertises is used.
  - Articles whose feed carries the full text, and YouTube videos, open in the app in a sandboxed frame with scripts blocked.
  - Other articles link to their site, marked as leaving Social Sanity.

## Backups

- Settings → **Download database** saves a consistent copy of the SQLite database while the app runs.
- Backup agents fetch the same copy with `GET /api/backup` and `Authorization: Bearer <SOCIAL_SANITY_BACKUP_TOKEN>`.
  - The endpoint answers 404 while `SOCIAL_SANITY_BACKUP_TOKEN` is unset; the token must be at least 32 characters.
- Tokens and client secrets in the copy stay encrypted with `SOCIAL_SANITY_TOKEN_ENC_KEY`, which is not in the file; keep the key to restore.

## Scripts

| Command                           | Purpose                                   |
| --------------------------------- | ----------------------------------------- |
| `npm run dev`                     | Dev server                                |
| `npm run build` / `node build`    | Production build / run                    |
| `npm run check`                   | Type-check                                |
| `npm run lint` / `npm run format` | Prettier + ESLint                         |
| `npm test`                        | Unit (node) and component (browser) tests |

## Running in production

- There is no login: anyone who can reach the port can use the app and publish as you.
- Build with `npm run build`, then start with `node --env-file-if-exists=.env build`.
  - adapter-node's own settings carry the prefix `SOCIAL_SANITY_SERVER_`: `SOCIAL_SANITY_SERVER_HOST`, `SOCIAL_SANITY_SERVER_PORT` and so on.
    It rejects unknown variables with its prefix, so it cannot share `SOCIAL_SANITY_` with the app's own variables.
  - Set `SOCIAL_SANITY_SERVER_HOST=127.0.0.1` so it listens on this machine only.
- `@sveltejs/adapter-node` 6 assumes the public origin is **HTTPS** and does not read an `ORIGIN` variable.
- Run it behind a TLS-terminating reverse proxy and set `SOCIAL_SANITY_SERVER_PROTOCOL_HEADER=x-forwarded-proto`.
  Also set `SOCIAL_SANITY_SERVER_HOST_HEADER=x-forwarded-host` if the proxy rewrites the host.
- Plain-HTTP access without those headers makes form posts fail with 403 (CSRF check).
- Set `SOCIAL_SANITY_SERVER_BODY_SIZE_LIMIT=300M` (or larger) so video uploads are accepted; the default is 512 KB.

## Layout

- `src/lib/components/` — every UI control is a component
- `src/lib/styles/` — global stylesheets and design tokens (no per-component styles)
- `src/lib/server/` — server-only code (db, crypto, integrations, publishing)
  - Queries live in `.sql` files in each module's `sql/` folder, run with bound `$name` parameters.

## Credits

- Platform logos come from the `kejser-web:social-logos` skill, in `src/lib/social-logos/`.
  - [Simple Icons](https://simpleicons.org) (CC0), except LinkedIn.
  - LinkedIn: [Font Awesome Free](https://fontawesome.com) ([CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)).
- The logos are trademarks of their owners and only refer to the platforms.
