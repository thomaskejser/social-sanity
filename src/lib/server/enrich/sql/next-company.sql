-- The next company after $after that Claude has not looked up yet and that lacks an address, a
-- phone number, a social media account or a content source; with what it lacks and how many such
-- companies are left, this one included.
WITH gap AS (
	SELECT co.company_id AS id,
	       co.company AS name,
	       NOT EXISTS (SELECT 1 FROM company_address a WHERE a.company_id = co.company_id) AS no_address,
	       NOT EXISTS (SELECT 1 FROM company_phone p WHERE p.company_id = co.company_id) AS no_phone,
	       NOT EXISTS (SELECT 1 FROM company_social_account s WHERE s.company_id = co.company_id)
	           AS no_social,
	       NOT EXISTS (SELECT 1 FROM content_source c WHERE c.company_id = co.company_id) AS no_source
	FROM company co
	WHERE co.enriched_at IS NULL
	  AND co.company_id > $after
)
SELECT id AS "id",
       name AS "name",
       0 AS "noName",
       0 AS "noPicture",
       0 AS "noBirthday",
       no_address AS "noAddress",
       no_phone AS "noPhone",
       no_social AS "noSocial",
       no_source AS "noSource",
       count(*) OVER () AS "remaining"
FROM gap
WHERE no_address OR no_phone OR no_social OR no_source
ORDER BY id
LIMIT 1;
