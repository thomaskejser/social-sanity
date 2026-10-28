SELECT c.channel_id AS "id",
       c.channel    AS "name",
       EXISTS (SELECT 1 FROM avatar a WHERE a.channel_id = c.channel_id) AS "avatar",
       COALESCE((SELECT json_group_array(json_object('platform', s.platform, 'url', s.channel_social_account))
                 FROM channel_social_account s
                 WHERE s.channel_id = c.channel_id), '[]') AS "accounts"
FROM channel c
WHERE NOT EXISTS (SELECT 1 FROM channel_group_member m WHERE m.channel_id = c.channel_id)
ORDER BY c.channel COLLATE NOCASE, c.channel_id
LIMIT $limit OFFSET $offset;
