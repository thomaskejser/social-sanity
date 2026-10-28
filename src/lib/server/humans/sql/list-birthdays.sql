-- Humans whose birthday falls from $today to $days days later, soonest first, with the age they
-- turn when the year of birth is known. A 29 February birthday only falls in leap years.
WITH RECURSIVE day (offset, day) AS (
	SELECT 0, date($today)
	UNION ALL
	SELECT offset + 1, date(day, '+1 day')
	FROM day
	WHERE offset < $days
)
SELECT h.human_id AS "humanId",
       h.human    AS "human",
       d.day      AS "day",
       d.offset   AS "daysUntil",
       CASE
           WHEN h.birthday GLOB '[0-9][0-9][0-9][0-9]-*'
               THEN CAST(substr(d.day, 1, 4) AS INTEGER) - CAST(substr(h.birthday, 1, 4) AS INTEGER)
       END        AS "age",
       EXISTS (SELECT 1 FROM human_avatar a WHERE a.human_id = h.human_id) AS "avatar"
FROM human h
JOIN day d ON substr(h.birthday, -5) = substr(d.day, 6)
WHERE h.birthday <> ''
ORDER BY d.offset, h.human COLLATE NOCASE;
