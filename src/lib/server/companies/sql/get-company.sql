SELECT company_id AS "companyId",
       company,
       website,
       notes,
       kudos
FROM company
WHERE company_id = $company_id;
