INSERT INTO human_group_member (human_group_id, human_id)
VALUES ($human_group_id, $human_id)
ON CONFLICT DO NOTHING;
