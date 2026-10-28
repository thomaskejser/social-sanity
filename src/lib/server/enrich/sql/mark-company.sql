UPDATE company
SET enriched_at = $now
WHERE company_id = $id;
