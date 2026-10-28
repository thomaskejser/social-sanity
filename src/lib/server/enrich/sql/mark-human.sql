UPDATE human
SET enriched_at = $now
WHERE human_id = $id;
