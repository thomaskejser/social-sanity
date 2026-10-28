DELETE FROM company_phone
WHERE company_phone_id = $detail_id
  AND company_id = $company_id;
