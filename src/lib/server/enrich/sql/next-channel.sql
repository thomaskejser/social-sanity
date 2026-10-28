-- The next channel after $after that Claude has not looked up yet and that lacks a social media
-- account or a content source; with what it lacks and how many such channels are left, this one
-- included.
WITH gap AS (
	SELECT ch.channel_id AS id,
	       ch.channel AS name,
	       NOT EXISTS (SELECT 1 FROM channel_social_account s WHERE s.channel_id = ch.channel_id)
	           AS no_social,
	       NOT EXISTS (SELECT 1 FROM content_source c WHERE c.channel_id = ch.channel_id) AS no_source
	FROM channel ch
	WHERE ch.enriched_at IS NULL
	  AND ch.channel_id > $after
)
SELECT id AS "id",
       name AS "name",
       0 AS "noName",
       0 AS "noPicture",
       0 AS "noBirthday",
       0 AS "noAddress",
       0 AS "noPhone",
       no_social AS "noSocial",
       no_source AS "noSource",
       count(*) OVER () AS "remaining"
FROM gap
WHERE no_social OR no_source
ORDER BY id
LIMIT 1;
