SELECT youtube_channel_id AS "youtubeChannelId",
       youtube_channel    AS "youtubeChannel",
       description
FROM youtube_channel
WHERE added_at IS NULL
  AND suggested_kind = ''
ORDER BY youtube_channel_id
LIMIT $limit;
