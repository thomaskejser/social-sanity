DELETE FROM human_nickname
WHERE human_nickname_id = $detail_id
  AND human_id = $human_id;
