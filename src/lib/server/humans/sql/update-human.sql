UPDATE human
SET human      = $human,
    first_name = $first_name,
    family_name = $family_name,
    birthday   = $birthday,
    updated_at = $now
WHERE human_id = $human_id;
