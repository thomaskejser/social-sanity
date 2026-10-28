-- The humans, companies and channels linked to a Reddit subreddit or profile, by name.
SELECT CASE
           WHEN r.human_id IS NOT NULL THEN 'human'
           WHEN r.company_id IS NOT NULL THEN 'company'
           ELSE 'channel'
       END                                            AS "kind",
       COALESCE(r.human_id, r.company_id, r.channel_id) AS "id",
       COALESCE(h.human, co.company, ch.channel)        AS "name"
FROM external_reference r
LEFT JOIN human h ON h.human_id = r.human_id
LEFT JOIN company co ON co.company_id = r.company_id
LEFT JOIN channel ch ON ch.channel_id = r.channel_id
WHERE r.source = 'REDDIT'
  AND r.publisher_id IS NULL
ORDER BY "name" COLLATE NOCASE
LIMIT $limit OFFSET $offset;
