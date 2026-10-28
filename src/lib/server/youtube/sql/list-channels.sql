-- Every imported channel with what it became; channels still waiting come first.
SELECT c.youtube_channel_id AS "youtubeChannelId",
       c.channel_id         AS "channelId",
       c.youtube_channel    AS "youtubeChannel",
       c.thumbnail_url      AS "thumbnailUrl",
       c.suggestion_reason  AS "suggestionReason",
       c.added_at           AS "addedAt",
       r.human_id           AS "humanId",
       h.human              AS "human",
       r.company_id         AS "companyId",
       co.company           AS "company",
       r.channel_id         AS "appChannelId",
       ch.channel           AS "appChannel"
FROM youtube_channel c
LEFT JOIN external_reference r ON r.source = 'YOUTUBE' AND r.external_reference = c.channel_id
LEFT JOIN human h ON h.human_id = r.human_id
LEFT JOIN company co ON co.company_id = r.company_id
LEFT JOIN channel ch ON ch.channel_id = r.channel_id
ORDER BY c.added_at IS NOT NULL, c.youtube_channel COLLATE NOCASE
LIMIT $limit OFFSET $offset;
