SELECT publisher_id AS "publisherId"
FROM publisher
WHERE lower(publisher) = lower($publisher)
  AND publisher_kind = $publisher_kind
ORDER BY publisher_id
LIMIT 1;
