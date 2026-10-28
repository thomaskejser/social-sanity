SELECT youtube_channel_id AS "youtubeChannelId",
       channel_id         AS "channelId",
       youtube_channel    AS "youtubeChannel",
       added_at           AS "addedAt"
FROM youtube_channel
WHERE youtube_channel_id = $youtube_channel_id;
