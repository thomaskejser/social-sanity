SELECT h.human_id   AS "humanId",
       h.human,
       h.kudos,
       EXISTS (SELECT 1 FROM human_avatar a WHERE a.human_id = h.human_id) AS "avatar",
       COALESCE((SELECT json_group_array(json_object('platform', s.platform, 'url', s.human_social_account))
                 FROM human_social_account s
                 WHERE s.human_id = h.human_id), '[]') AS "accounts",
       EXISTS (SELECT 1 FROM external_reference r
               WHERE r.human_id = h.human_id AND r.source = 'GOOGLE_CONTACTS') AS "fromGoogle",
       COALESCE((SELECT json_group_array(m.human_group_id)
                 FROM human_group_member m
                 WHERE m.human_id = h.human_id), '[]') AS "groupIds"
FROM human h
WHERE $search = '' OR instr(lower(h.human), lower($search)) > 0
ORDER BY instr(lower(h.human), lower($search)) <> 1, h.human COLLATE NOCASE, h.human_id
LIMIT $limit OFFSET $offset;
