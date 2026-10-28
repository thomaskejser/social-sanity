SELECT company_address_id AS "detailId",
       address_type       AS "type",
       company_address    AS "value",
       map_url            AS "mapUrl"
FROM company_address
WHERE company_id = $company_id
ORDER BY company_address_id;
