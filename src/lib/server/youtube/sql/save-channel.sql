-- A subscription seen on YouTube; refreshes its title and description, keeps the rest.
INSERT INTO youtube_channel (youtube_channel_id, channel_id, youtube_channel, description,
                             thumbnail_url, fetched_at)
VALUES ((SELECT COALESCE(MAX(youtube_channel_id), 0) + 1 FROM youtube_channel), $channel_id,
        $youtube_channel, $description, $thumbnail_url, $now)
ON CONFLICT (channel_id) DO UPDATE SET
    youtube_channel = excluded.youtube_channel,
    description     = excluded.description,
    thumbnail_url   = excluded.thumbnail_url,
    fetched_at      = excluded.fetched_at;
