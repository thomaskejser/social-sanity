DELETE FROM human_phone
WHERE human_phone_id = $detail_id
  AND human_id = $human_id;
