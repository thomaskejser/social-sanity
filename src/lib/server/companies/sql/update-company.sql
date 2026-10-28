UPDATE company
SET company    = $company,
    website    = $website,
    notes      = $notes,
    updated_at = $now
WHERE company_id = $company_id;
