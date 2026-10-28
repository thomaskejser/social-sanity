INSERT INTO company_address (company_address_id, company_id, address_type, company_address, map_url)
VALUES ((SELECT COALESCE(MAX(company_address_id), 0) + 1 FROM company_address), $company_id, $type,
        $value, $map_url);
