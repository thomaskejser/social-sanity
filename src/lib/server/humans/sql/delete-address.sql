DELETE FROM human_address
WHERE human_address_id = $detail_id
  AND human_id = $human_id;
