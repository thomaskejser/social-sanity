SELECT channel_id AS "channelId"
FROM channel
WHERE lower(channel) = lower($name)
ORDER BY channel_id
LIMIT 1;
