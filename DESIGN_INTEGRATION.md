# Integrations

Integrations are connections to various data sources, including:

- Social Media Sites
- Web Servers where you can blog
- Contact Storage systems such as Google Contacts

In integrations, you set up the required authentication so you can connect to these
source.

Whenever possible, OAuth is preferred. 
Passwords

## LinkedIn

Needs the _Share on LinkedIn_ and _Sign In with LinkedIn using OpenID Connect_ products.

Tokens last 60 days; reconnect when the page warns you.

## Instagram

Uses _Instagram API with Instagram Login_ with your Professional account added as a tester.

Tokens are refreshed automatically.

## Mastodon

TODO: Write this

## BlueSky

TODO: Write this

## Blog Site

This is where you personal blog info is stored. 
There can be more than one of these.

The assumption is that upload is done via FTP / SFTP.

You provide a username, an FTP URI and a web site URI.

The use can provide the name of an environment variable holding the password.
If the environment variable is not available or not set - the user will be prompted
for the password whenever the upload occurs.

The blog site is also where images are uploaded that much be reachable when posting
on social media sites.

## Posts Repository

The git repository holding the posts written in [Contribute](./DESIGN_CONTRIBUTE.md#posts-repository).

- SSH URLs (`git@host:org/repo.git`) use this machine's SSH keys; a new host key is accepted on first use.
- HTTPS URLs can use a token from an environment variable whose name you enter; the token is never stored.
- Only `https://`, `ssh://` and `git@host:path` URLs are accepted (plain `http://` only to this machine).

## Google Contacts

Integrates with Google Contacts to extract information about the users contacts and populate the [Humans](./DESIGN_HUMANS.md) data.

The integration is read-only.

## YouTube

Integrated with a Google OAuth login.
The integration needs to know the email of the google user.

YouTube integrations can also post videos as well as read the users feed and their
subscribed channels.

### Google app

- No separate YouTube app is needed.
  YouTube uses a Google Cloud OAuth client, just like Google Contacts.
- When another Google integration already has an OAuth client, the YouTube page offers to reuse it.
  The user then enables the _YouTube Data API v3_ in that Cloud project and adds the YouTube redirect URL to the client.
- Creating a new app for YouTube stays possible.
- YouTube keeps its own copy of the client and its own connection, so removing one integration does not affect the other.
- The connection asks only for read access (`youtube.readonly`).

### Importing subscriptions

- The channels the user subscribes to are imported into their own table, separate from humans, companies and channels.
- Import runs when the server starts, then every hour, and when the user presses _Import now_.
- An import only adds new channels and refreshes their titles and descriptions; it never changes what a channel became in the app.

### Sorting channels

- A background job asks Claude whether each imported channel is a human, a company or a channel.
  It runs after every import and every 15 minutes.
- Claude sees only the channel's public title and description.
- Each sorted channel is added straight away, without a review step:
  - a human or company gets the channel as a YouTube social account and its video feed as a content source;
  - a channel becomes a publisher of kind channel, under Consume → Sources, with its video feed.
- A human, company or channel with the same name is reused instead of creating a duplicate.
- The YouTube channel ID is stored as an external reference on the record it was added to.
  It is how the app knows which record a channel belongs to, and how records from several sources are merged later.
- When Claude is not set up, channels wait until it is.

### The app is the authority

- Once a channel is added, it is never sorted again.
- The user may turn a human into a company or the other way around; the external reference moves with the record.
- The YouTube page shows every imported channel and the record that holds its reference now, or that it is still waiting for Claude.


## Claude API token

For agentic functionality the user can supply the environment variable name of an agentic token.