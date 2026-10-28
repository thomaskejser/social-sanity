UPDATE youtube_channel
SET added_at = $now
WHERE youtube_channel_id = $youtube_channel_id;
