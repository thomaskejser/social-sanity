UPDATE channel
SET channel    = $channel,
    website    = $website,
    notes      = $notes,
    updated_at = $now
WHERE channel_id = $channel_id;
