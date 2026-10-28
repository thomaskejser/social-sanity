SELECT h.human_id AS "id",
       h.human    AS "name",
       EXISTS (SELECT 1 FROM human_avatar a WHERE a.human_id = h.human_id) AS "avatar",
       COALESCE((SELECT json_group_array(json_object('platform', s.platform, 'url', s.human_social_account))
                 FROM human_social_account s
                 WHERE s.human_id = h.human_id), '[]') AS "accounts"
FROM human h
WHERE NOT EXISTS (SELECT 1 FROM human_group_member m WHERE m.human_id = h.human_id)
ORDER BY h.human COLLATE NOCASE, h.human_id
LIMIT $limit OFFSET $offset;
