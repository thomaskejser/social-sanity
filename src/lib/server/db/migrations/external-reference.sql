-- Moves the Google Contacts link from a column on human and company into external_reference,
-- where a record can collect the IDs of every source it came from. Run with foreign keys off.
CREATE TABLE IF NOT EXISTS external_reference (
	external_reference_id BIGINT NOT NULL PRIMARY KEY,
	source                TEXT   NOT NULL CHECK (source IN ('GOOGLE_CONTACTS', 'YOUTUBE')),
	external_reference    TEXT   NOT NULL,
	human_id              BIGINT REFERENCES human ON DELETE CASCADE,
	company_id            BIGINT REFERENCES company ON DELETE CASCADE,
	publisher_id          BIGINT REFERENCES publisher ON DELETE CASCADE,
	created_at            BIGINT NOT NULL,
	UNIQUE (source, external_reference),
	CHECK ((human_id IS NOT NULL) + (company_id IS NOT NULL) + (publisher_id IS NOT NULL) = 1)
);

INSERT INTO external_reference (external_reference_id, source, external_reference, human_id,
                                created_at)
SELECT row_number() OVER (ORDER BY human_id), 'GOOGLE_CONTACTS', google_resource_name, human_id,
       created_at
FROM human
WHERE google_resource_name <> '';

INSERT INTO external_reference (external_reference_id, source, external_reference, company_id,
                                created_at)
SELECT (SELECT COALESCE(MAX(external_reference_id), 0) FROM external_reference)
           + row_number() OVER (ORDER BY company_id),
       'GOOGLE_CONTACTS', google_resource_name, company_id, created_at
FROM company
WHERE google_resource_name <> '';

DROP INDEX IF EXISTS human_google_resource_name;
DROP INDEX IF EXISTS company_google_resource_name;
ALTER TABLE human DROP COLUMN google_resource_name;
ALTER TABLE company DROP COLUMN google_resource_name;
