SELECT company_phone_id AS "detailId",
       phone_type       AS "type",
       company_phone    AS "value"
FROM company_phone
WHERE company_id = $company_id
ORDER BY company_phone_id;
