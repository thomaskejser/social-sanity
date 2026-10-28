-- Adds every human of one group to another; those already in it stay once.
INSERT INTO human_group_member (human_group_id, human_id)
SELECT $into_group_id, human_id
FROM human_group_member
WHERE human_group_id = $human_group_id
ON CONFLICT DO NOTHING;
