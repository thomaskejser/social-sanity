UPDATE channel
SET channel    = $name,
    updated_at = $now
WHERE channel_id = $channel_id;
