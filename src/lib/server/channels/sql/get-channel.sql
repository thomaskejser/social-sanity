SELECT channel_id AS "channelId",
       channel,
       website,
       notes,
       kudos
FROM channel
WHERE channel_id = $channel_id;
