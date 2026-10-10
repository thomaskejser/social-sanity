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

## Scripts

| Command                           | Purpose                                   |
| --------------------------------- | ----------------------------------------- |
| `npm run dev`                     | Dev server                                |
| `npm run build` / `node build`    | Production build / run                    |
| `npm run check`                   | Type-check                                |
| `npm run lint` / `npm run format` | Prettier + ESLint                         |
| `npm test`                        | Unit (node) and component (browser) tests |
| `npm run db:push` / `db:studio`   | Drizzle schema push / browser             |

## Layout

- `src/lib/components/` — every UI control is a component
- `src/lib/styles/` — global stylesheets and design tokens (no per-component styles)
- `src/lib/server/` — server-only code (db, auth, crypto)
