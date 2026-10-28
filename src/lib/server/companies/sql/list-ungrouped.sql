SELECT c.company_id AS "id",
       c.company    AS "name",
       EXISTS (SELECT 1 FROM avatar a WHERE a.company_id = c.company_id) AS "avatar",
       COALESCE((SELECT json_group_array(json_object('platform', s.platform, 'url', s.company_social_account))
                 FROM company_social_account s
                 WHERE s.company_id = c.company_id), '[]') AS "accounts"
FROM company c
WHERE NOT EXISTS (SELECT 1 FROM company_group_member m WHERE m.company_id = c.company_id)
ORDER BY c.company COLLATE NOCASE, c.company_id
LIMIT $limit OFFSET $offset;
