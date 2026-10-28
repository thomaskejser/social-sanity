# Contribute

Where the user can share information with others without actually opening the Social Media sites.

Posts are written once and published to LinkedIn and Instagram, reformatted per platform.

TODO: Mastodon, BlueSky and the blog site as publish targets.

## Posts repository

- Posts live as Markdown files in a git repository, added on the **Settings** page.
  Access to the repository is set up as described in [Integrations](./DESIGN_INTEGRATION.md#posts-repository).
- The app keeps its own clone (`SOCIAL_SANITY_REPO_DIR`, default `data/repo`).
  - It pulls every 5 minutes, and on "Pull now" on the Posts page.
  - Every change it makes is committed with the configured author and pushed straight away.
  - A push that fails stays committed locally and goes out with the next pull.

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

## Media

- Instagram fetches media from a public URL.
  - With a [blog site](./DESIGN_INTEGRATION.md#blog-site) that has a public URL, media is uploaded there first.
  - Otherwise it fetches `<SOCIAL_SANITY_PUBLIC_BASE_URL>/media/...`, which exposes the app at that address.
- Instagram accepts only JPEG images; LinkedIn accepts JPEG, PNG and GIF, and MP4 video.
- GitHub rejects files over 100 MB, so large videos may not push.
