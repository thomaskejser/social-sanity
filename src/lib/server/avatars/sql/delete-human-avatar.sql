DELETE FROM human_avatar
WHERE human_id = $human_id
  AND human_avatar_id = $human_avatar_id;
