-- The next human after $after that Claude has not looked up yet and that lacks a name (it is known
-- only by an email address), a birthday, an address, a phone number, a social media account, a
-- content source or a picture; with what it lacks and how many such humans are left, this one
-- included.
WITH gap AS (
	SELECT h.human_id AS id,
	       h.human AS name,
	       (instr(h.human, '@') > 1 AND instr(trim(h.human), ' ') = 0) AS no_name,
	       h.birthday = '' AS no_birthday,
	       NOT EXISTS (SELECT 1 FROM human_address a WHERE a.human_id = h.human_id) AS no_address,
	       NOT EXISTS (SELECT 1 FROM human_phone p WHERE p.human_id = h.human_id) AS no_phone,
	       NOT EXISTS (SELECT 1 FROM human_social_account s WHERE s.human_id = h.human_id) AS no_social,
	       NOT EXISTS (SELECT 1 FROM content_source c WHERE c.human_id = h.human_id) AS no_source,
	       NOT EXISTS (SELECT 1 FROM human_avatar v WHERE v.human_id = h.human_id) AS no_picture
	FROM human h
	WHERE h.enriched_at IS NULL
	  AND h.human_id > $after
)
SELECT id AS "id",
       name AS "name",
       no_name AS "noName",
       no_birthday AS "noBirthday",
       no_address AS "noAddress",
       no_phone AS "noPhone",
       no_social AS "noSocial",
       no_source AS "noSource",
       no_picture AS "noPicture",
       count(*) OVER () AS "remaining"
FROM gap
WHERE no_name OR no_birthday OR no_address OR no_phone OR no_social OR no_source OR no_picture
ORDER BY id
LIMIT 1;
