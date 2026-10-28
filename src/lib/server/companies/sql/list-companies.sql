SELECT c.company_id AS "companyId",
       c.company,
       c.kudos,
       EXISTS (SELECT 1 FROM avatar a WHERE a.company_id = c.company_id) AS "avatar",
       COALESCE((SELECT json_group_array(json_object('platform', s.platform, 'url', s.company_social_account))
                 FROM company_social_account s
                 WHERE s.company_id = c.company_id), '[]') AS "accounts",
       EXISTS (SELECT 1 FROM external_reference r
               WHERE r.company_id = c.company_id AND r.source = 'GOOGLE_CONTACTS') AS "fromGoogle",
       COALESCE((SELECT json_group_array(m.human_group_id)
                 FROM company_group_member m
                 WHERE m.company_id = c.company_id), '[]') AS "groupIds"
FROM company c
WHERE $search = '' OR instr(lower(c.company), lower($search)) > 0
ORDER BY instr(lower(c.company), lower($search)) <> 1, c.company COLLATE NOCASE, c.company_id
LIMIT $limit OFFSET $offset;
