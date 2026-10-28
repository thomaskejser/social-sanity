DELETE FROM human_special_day
WHERE human_special_day_id = $detail_id
  AND human_id = $human_id;
