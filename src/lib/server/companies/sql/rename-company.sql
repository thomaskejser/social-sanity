UPDATE company
SET company    = $name,
    updated_at = $now
WHERE company_id = $company_id;
