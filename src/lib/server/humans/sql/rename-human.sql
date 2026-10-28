UPDATE human
SET human      = $name,
    updated_at = $now
WHERE human_id = $human_id;
