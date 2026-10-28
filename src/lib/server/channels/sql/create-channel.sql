INSERT INTO channel (channel_id, channel, website, notes, kudos, created_at, updated_at)
VALUES ((SELECT COALESCE(MAX(channel_id), 0) + 1 FROM channel), $channel, $website, $notes, $kudos,
        $now, $now)
RETURNING channel_id AS "channelId";
