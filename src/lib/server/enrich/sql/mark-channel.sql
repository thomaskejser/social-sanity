UPDATE channel
SET enriched_at = $now
WHERE channel_id = $id;
