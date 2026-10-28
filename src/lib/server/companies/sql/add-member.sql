INSERT INTO company_group_member (human_group_id, company_id)
VALUES ($human_group_id, $company_id)
ON CONFLICT DO NOTHING;
