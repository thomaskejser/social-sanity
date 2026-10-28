-- Adds every company of one group to another; those already in it stay once.
INSERT INTO company_group_member (human_group_id, company_id)
SELECT $into_group_id, company_id
FROM company_group_member
WHERE human_group_id = $human_group_id
ON CONFLICT DO NOTHING;
