DELETE FROM human_group_member
WHERE human_group_id = $human_group_id
  AND human_id = $human_id;
