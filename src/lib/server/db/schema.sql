CREATE TABLE IF NOT EXISTS accounts (
	platform          TEXT    NOT NULL PRIMARY KEY,
	external_id       TEXT    NOT NULL,
	display_name      TEXT    NOT NULL,
	access_token_enc  TEXT    NOT NULL,
	refresh_token_enc TEXT,
	expires_at        INTEGER,
	scopes            TEXT    NOT NULL DEFAULT '',
	connected_at      INTEGER NOT NULL,
	refreshed_at      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS oauth_clients (
	platform          TEXT    NOT NULL PRIMARY KEY,
	client_id         TEXT    NOT NULL,
	client_secret_enc TEXT    NOT NULL,
	updated_at        INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS ftp_server (
	id                   INTEGER NOT NULL PRIMARY KEY,
	protocol             TEXT    NOT NULL DEFAULT 'ftp',
	host                 TEXT    NOT NULL,
	port                 INTEGER NOT NULL,
	username             TEXT    NOT NULL,
	password_env_var     TEXT    NOT NULL,
	encryption           TEXT    NOT NULL,
	host_key_fingerprint TEXT,
	remote_dir           TEXT    NOT NULL,
	public_url           TEXT,
	last_tested_at       INTEGER,
	last_test_ok         INTEGER,
	last_test_message    TEXT,
	updated_at           INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS git_repo (
	id                INTEGER NOT NULL PRIMARY KEY,
	url               TEXT    NOT NULL,
	branch            TEXT    NOT NULL,
	posts_dir         TEXT    NOT NULL,
	token_env_var     TEXT,
	token_username    TEXT    NOT NULL,
	author_name       TEXT    NOT NULL,
	author_email      TEXT    NOT NULL,
	last_sync_at      INTEGER,
	last_sync_ok      INTEGER,
	last_sync_message TEXT,
	updated_at        INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS publish_attempts (
	post_id      TEXT    NOT NULL,
	platform     TEXT    NOT NULL,
	status       TEXT    NOT NULL,
	error        TEXT,
	remote_id    TEXT,
	remote_url   TEXT,
	published_at INTEGER,
	updated_at   INTEGER NOT NULL,
	PRIMARY KEY (post_id, platform)
);

CREATE TABLE IF NOT EXISTS human (
	human_id             BIGINT NOT NULL PRIMARY KEY,
	human                TEXT   NOT NULL,
	first_name           TEXT   NOT NULL DEFAULT '',
	family_name          TEXT   NOT NULL DEFAULT '',
	birthday             TEXT   NOT NULL DEFAULT '',
	kudos                BIGINT NOT NULL DEFAULT 0 CHECK (kudos BETWEEN 0 AND 10),
	created_at           BIGINT NOT NULL,
	updated_at           BIGINT NOT NULL,
	enriched_at          BIGINT
);

CREATE TABLE IF NOT EXISTS human_middle_name (
	human_id    BIGINT NOT NULL REFERENCES human ON DELETE CASCADE,
	position    BIGINT NOT NULL,
	middle_name TEXT   NOT NULL,
	PRIMARY KEY (human_id, position)
);

CREATE TABLE IF NOT EXISTS human_nickname (
	human_nickname_id BIGINT NOT NULL PRIMARY KEY,
	human_id          BIGINT NOT NULL REFERENCES human ON DELETE CASCADE,
	human_nickname    TEXT   NOT NULL
);

CREATE TABLE IF NOT EXISTS human_address (
	human_address_id BIGINT NOT NULL PRIMARY KEY,
	human_id         BIGINT NOT NULL REFERENCES human ON DELETE CASCADE,
	address_type     TEXT   NOT NULL DEFAULT '',
	human_address    TEXT   NOT NULL,
	map_url          TEXT   NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS human_phone (
	human_phone_id BIGINT NOT NULL PRIMARY KEY,
	human_id       BIGINT NOT NULL REFERENCES human ON DELETE CASCADE,
	phone_type     TEXT   NOT NULL DEFAULT '',
	human_phone    TEXT   NOT NULL CHECK (human_phone GLOB '+[0-9]*')
);

CREATE TABLE IF NOT EXISTS human_special_day (
	human_special_day_id BIGINT NOT NULL PRIMARY KEY,
	human_id             BIGINT NOT NULL REFERENCES human ON DELETE CASCADE,
	special_day_type     TEXT   NOT NULL DEFAULT '',
	human_special_day    TEXT   NOT NULL
);

CREATE TABLE IF NOT EXISTS human_social_account (
	human_social_account_id BIGINT NOT NULL PRIMARY KEY,
	human_id                BIGINT NOT NULL REFERENCES human ON DELETE CASCADE,
	platform                TEXT   NOT NULL,
	human_social_account    TEXT   NOT NULL,
	UNIQUE (human_id, human_social_account)
);

CREATE TABLE IF NOT EXISTS human_group (
	human_group_id BIGINT NOT NULL PRIMARY KEY,
	human_group    TEXT   NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS human_group_member (
	human_group_id BIGINT NOT NULL REFERENCES human_group ON DELETE CASCADE,
	human_id       BIGINT NOT NULL REFERENCES human ON DELETE CASCADE,
	PRIMARY KEY (human_group_id, human_id)
);

CREATE TABLE IF NOT EXISTS publisher (
	publisher_id   BIGINT NOT NULL PRIMARY KEY,
	publisher      TEXT   NOT NULL,
	publisher_kind TEXT   NOT NULL CHECK (publisher_kind IN ('COMPANY', 'AGENT', 'CHANNEL')),
	kudos          BIGINT NOT NULL DEFAULT 0 CHECK (kudos BETWEEN 0 AND 10)
);

CREATE TABLE IF NOT EXISTS company (
	company_id           BIGINT NOT NULL PRIMARY KEY,
	company              TEXT   NOT NULL,
	website              TEXT   NOT NULL DEFAULT '',
	notes                TEXT   NOT NULL DEFAULT '',
	kudos                BIGINT NOT NULL DEFAULT 0 CHECK (kudos BETWEEN 0 AND 10),
	created_at           BIGINT NOT NULL,
	updated_at           BIGINT NOT NULL,
	enriched_at          BIGINT
);

CREATE TABLE IF NOT EXISTS company_address (
	company_address_id BIGINT NOT NULL PRIMARY KEY,
	company_id         BIGINT NOT NULL REFERENCES company ON DELETE CASCADE,
	address_type       TEXT   NOT NULL DEFAULT '',
	company_address    TEXT   NOT NULL,
	map_url            TEXT   NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS company_phone (
	company_phone_id BIGINT NOT NULL PRIMARY KEY,
	company_id       BIGINT NOT NULL REFERENCES company ON DELETE CASCADE,
	phone_type       TEXT   NOT NULL DEFAULT '',
	company_phone    TEXT   NOT NULL CHECK (company_phone GLOB '+[0-9]*')
);

CREATE TABLE IF NOT EXISTS company_social_account (
	company_social_account_id BIGINT NOT NULL PRIMARY KEY,
	company_id                BIGINT NOT NULL REFERENCES company ON DELETE CASCADE,
	platform                  TEXT   NOT NULL,
	company_social_account    TEXT   NOT NULL,
	UNIQUE (company_id, company_social_account)
);

CREATE TABLE IF NOT EXISTS company_group_member (
	human_group_id BIGINT NOT NULL REFERENCES human_group ON DELETE CASCADE,
	company_id     BIGINT NOT NULL REFERENCES company ON DELETE CASCADE,
	PRIMARY KEY (human_group_id, company_id)
);

CREATE TABLE IF NOT EXISTS channel (
	channel_id  BIGINT NOT NULL PRIMARY KEY,
	channel     TEXT   NOT NULL,
	website     TEXT   NOT NULL DEFAULT '',
	notes       TEXT   NOT NULL DEFAULT '',
	kudos       BIGINT NOT NULL DEFAULT 0 CHECK (kudos BETWEEN 0 AND 10),
	created_at  BIGINT NOT NULL,
	updated_at  BIGINT NOT NULL,
	enriched_at BIGINT
);

CREATE TABLE IF NOT EXISTS channel_social_account (
	channel_social_account_id BIGINT NOT NULL PRIMARY KEY,
	channel_id                BIGINT NOT NULL REFERENCES channel ON DELETE CASCADE,
	platform                  TEXT   NOT NULL,
	channel_social_account    TEXT   NOT NULL,
	UNIQUE (channel_id, channel_social_account)
);

CREATE TABLE IF NOT EXISTS channel_group_member (
	human_group_id BIGINT NOT NULL REFERENCES human_group ON DELETE CASCADE,
	channel_id     BIGINT NOT NULL REFERENCES channel ON DELETE CASCADE,
	PRIMARY KEY (human_group_id, channel_id)
);

CREATE TABLE IF NOT EXISTS content_source (
	content_source_id  BIGINT NOT NULL PRIMARY KEY,
	content_source     TEXT   NOT NULL,
	human_id           BIGINT REFERENCES human ON DELETE CASCADE,
	company_id         BIGINT REFERENCES company ON DELETE CASCADE,
	channel_id         BIGINT REFERENCES channel ON DELETE CASCADE,
	publisher_id       BIGINT REFERENCES publisher ON DELETE CASCADE,
	feed_uri           TEXT   NOT NULL DEFAULT '',
	last_fetched_at    BIGINT,
	last_fetch_ok      BIGINT,
	last_fetch_message TEXT,
	CHECK ((human_id IS NOT NULL) + (company_id IS NOT NULL) + (channel_id IS NOT NULL)
	       + (publisher_id IS NOT NULL) = 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS content_source_human_uri
	ON content_source (human_id, content_source) WHERE human_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS content_source_company_uri
	ON content_source (company_id, content_source) WHERE company_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS content_source_channel_uri
	ON content_source (channel_id, content_source) WHERE channel_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS content_source_publisher_uri
	ON content_source (publisher_id, content_source) WHERE publisher_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS article (
	article_id        BIGINT NOT NULL PRIMARY KEY,
	content_source_id BIGINT NOT NULL REFERENCES content_source ON DELETE CASCADE,
	guid              TEXT   NOT NULL,
	article           TEXT   NOT NULL,
	summary           TEXT   NOT NULL DEFAULT '',
	content_html      TEXT   NOT NULL DEFAULT '',
	video_id          TEXT   NOT NULL DEFAULT '',
	url               TEXT   NOT NULL,
	published_at      BIGINT NOT NULL,
	image_url         TEXT   NOT NULL DEFAULT '',
	image_checked_at  BIGINT,
	read_at           BIGINT,
	UNIQUE (content_source_id, guid)
);

CREATE TABLE IF NOT EXISTS task (
	task_id     BIGINT NOT NULL PRIMARY KEY,
	task        TEXT   NOT NULL,
	description TEXT   NOT NULL DEFAULT '',
	urgent      BIGINT NOT NULL DEFAULT 0,
	important   BIGINT NOT NULL DEFAULT 0,
	due_date    TEXT   NOT NULL DEFAULT '',
	created_at  BIGINT NOT NULL,
	updated_at  BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_setting (
	app_setting TEXT NOT NULL PRIMARY KEY,
	value       TEXT NOT NULL
);

-- The picture of a human, company or channel, downloaded from where it was imported from.
CREATE TABLE IF NOT EXISTS avatar (
	avatar_id    BIGINT NOT NULL PRIMARY KEY,
	company_id   BIGINT UNIQUE REFERENCES company ON DELETE CASCADE,
	channel_id   BIGINT UNIQUE REFERENCES channel ON DELETE CASCADE,
	content_type TEXT   NOT NULL,
	image        BLOB   NOT NULL,
	source_url   TEXT   NOT NULL,
	fetched_at   BIGINT NOT NULL,
	CHECK ((company_id IS NOT NULL) + (channel_id IS NOT NULL) = 1)
);

-- Pictures of a human; the one with the lowest position is shown.
CREATE TABLE IF NOT EXISTS human_avatar (
	human_avatar_id BIGINT NOT NULL PRIMARY KEY,
	human_id        BIGINT NOT NULL REFERENCES human ON DELETE CASCADE,
	position        BIGINT NOT NULL,
	content_type    TEXT   NOT NULL,
	image           BLOB   NOT NULL,
	source_url      TEXT   NOT NULL,
	fetched_at      BIGINT NOT NULL,
	UNIQUE (human_id, source_url)
);

-- Pairs of humans, companies or channels Claude thinks are the same, until the user decides.
-- The IDs point into the table of member_kind; a pair whose record is gone is skipped.
CREATE TABLE IF NOT EXISTS merge_candidate (
	merge_candidate_id BIGINT NOT NULL PRIMARY KEY,
	member_kind        TEXT   NOT NULL CHECK (member_kind IN ('human', 'company', 'channel')),
	first_id           BIGINT NOT NULL,
	second_id          BIGINT NOT NULL,
	reason             TEXT   NOT NULL DEFAULT '',
	status             TEXT   NOT NULL DEFAULT 'PENDING'
		CHECK (status IN ('PENDING', 'MERGED', 'DISMISSED')),
	created_at         BIGINT NOT NULL,
	CHECK (first_id < second_id),
	UNIQUE (member_kind, first_id, second_id)
);

-- Outside IDs of deleted records, so imports never bring them back.
CREATE TABLE IF NOT EXISTS external_reference_tombstone (
	external_reference_tombstone_id BIGINT NOT NULL PRIMARY KEY,
	external_reference_tombstone    TEXT   NOT NULL DEFAULT '',
	source                          TEXT   NOT NULL CHECK (source IN ('GOOGLE_CONTACTS', 'YOUTUBE', 'REDDIT')),
	external_reference              TEXT   NOT NULL,
	deleted_at                      BIGINT NOT NULL,
	UNIQUE (source, external_reference)
);

CREATE TABLE IF NOT EXISTS background_job (
	background_job_id BIGINT NOT NULL PRIMARY KEY,
	background_job    TEXT   NOT NULL UNIQUE,
	started_at        BIGINT NOT NULL,
	finished_at       BIGINT NOT NULL,
	ok                BIGINT NOT NULL CHECK (ok IN (0, 1)),
	outcome           TEXT   NOT NULL
);

CREATE TABLE IF NOT EXISTS youtube_channel (
	youtube_channel_id BIGINT NOT NULL PRIMARY KEY,
	channel_id         TEXT   NOT NULL UNIQUE,
	youtube_channel    TEXT   NOT NULL,
	description        TEXT   NOT NULL DEFAULT '',
	thumbnail_url      TEXT   NOT NULL DEFAULT '',
	suggested_kind     TEXT   NOT NULL DEFAULT '' CHECK (suggested_kind IN ('', 'HUMAN', 'COMPANY', 'CHANNEL')),
	suggested_name     TEXT   NOT NULL DEFAULT '',
	suggestion_reason  TEXT   NOT NULL DEFAULT '',
	fetched_at         BIGINT NOT NULL,
	added_at           BIGINT
);

CREATE TABLE IF NOT EXISTS external_reference (
	external_reference_id BIGINT NOT NULL PRIMARY KEY,
	source                TEXT   NOT NULL CHECK (source IN ('GOOGLE_CONTACTS', 'YOUTUBE', 'REDDIT')),
	external_reference    TEXT   NOT NULL,
	human_id              BIGINT REFERENCES human ON DELETE CASCADE,
	company_id            BIGINT REFERENCES company ON DELETE CASCADE,
	channel_id            BIGINT REFERENCES channel ON DELETE CASCADE,
	publisher_id          BIGINT REFERENCES publisher ON DELETE CASCADE,
	created_at            BIGINT NOT NULL,
	UNIQUE (source, external_reference),
	CHECK ((human_id IS NOT NULL) + (company_id IS NOT NULL) + (channel_id IS NOT NULL)
	       + (publisher_id IS NOT NULL) = 1)
);

CREATE INDEX IF NOT EXISTS external_reference_human ON external_reference (human_id)
	WHERE human_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS external_reference_company ON external_reference (company_id)
	WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS external_reference_channel ON external_reference (channel_id)
	WHERE channel_id IS NOT NULL;
