CREATE TABLE external_reference_tombstone_new (
	external_reference_tombstone_id BIGINT NOT NULL PRIMARY KEY,
	external_reference_tombstone    TEXT   NOT NULL DEFAULT '',
	source                          TEXT   NOT NULL CHECK (source IN ('GOOGLE_CONTACTS', 'YOUTUBE', 'REDDIT')),
	external_reference              TEXT   NOT NULL,
	deleted_at                      BIGINT NOT NULL,
	UNIQUE (source, external_reference)
);

INSERT INTO external_reference_tombstone_new
SELECT external_reference_tombstone_id, external_reference_tombstone, source, external_reference,
       deleted_at
FROM external_reference_tombstone;

DROP TABLE external_reference_tombstone;
ALTER TABLE external_reference_tombstone_new RENAME TO external_reference_tombstone;
