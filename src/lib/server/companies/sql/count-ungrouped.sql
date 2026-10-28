SELECT count(*) AS "total"
FROM company c
WHERE NOT EXISTS (SELECT 1 FROM company_group_member m WHERE m.company_id = c.company_id);
