-- Channels Claude has sorted that are not added yet.
SELECT youtube_channel_id AS "youtubeChannelId",
       suggested_kind     AS "kind",
       suggested_name     AS "name"
FROM youtube_channel
WHERE added_at IS NULL
  AND suggested_kind <> ''
ORDER BY youtube_channel_id;
