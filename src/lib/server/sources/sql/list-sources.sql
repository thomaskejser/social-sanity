SELECT s.content_source_id  AS "contentSourceId",
       s.content_source     AS "contentSource",
       s.human_id           AS "humanId",
       s.company_id         AS "companyId",
       s.channel_id         AS "channelId",
       s.publisher_id       AS "publisherId",
       COALESCE(h.human, c.company, ch.channel, p.publisher) AS "owner",
       s.feed_uri           AS "feedUri",
       s.last_fetched_at    AS "lastFetchedAt",
       s.last_fetch_ok      AS "lastFetchOk",
       s.last_fetch_message AS "lastFetchMessage"
FROM content_source s
LEFT JOIN human h ON h.human_id = s.human_id
LEFT JOIN company c ON c.company_id = s.company_id
LEFT JOIN channel ch ON ch.channel_id = s.channel_id
LEFT JOIN publisher p ON p.publisher_id = s.publisher_id
ORDER BY "owner" COLLATE NOCASE, s.content_source;
