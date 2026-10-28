DELETE FROM company_address
WHERE company_address_id = $detail_id
  AND company_id = $company_id;
