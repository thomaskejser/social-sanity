DELETE FROM company_group_member
WHERE human_group_id = $human_group_id
  AND company_id = $company_id;
