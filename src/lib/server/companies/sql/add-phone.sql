INSERT INTO company_phone (company_phone_id, company_id, phone_type, company_phone)
VALUES ((SELECT COALESCE(MAX(company_phone_id), 0) + 1 FROM company_phone), $company_id, $type,
        $value);
