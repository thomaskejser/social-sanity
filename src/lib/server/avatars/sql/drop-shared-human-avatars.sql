-- Before moving pictures between humans: drops those the receiving human already has.
DELETE FROM human_avatar
WHERE human_id = $human_id
  AND source_url IN (SELECT source_url FROM human_avatar WHERE human_id = $to_human_id);
