INSERT INTO channel_group_member (human_group_id, channel_id)
VALUES ($human_group_id, $channel_id)
ON CONFLICT DO NOTHING;
