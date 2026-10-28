SELECT human_id AS "humanId"
FROM human
WHERE lower(human) = lower($name)
ORDER BY human_id
LIMIT 1;
