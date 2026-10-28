SELECT company_id AS "companyId"
FROM company
WHERE lower(company) = lower($name)
ORDER BY company_id
LIMIT 1;
