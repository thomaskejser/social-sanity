SELECT c.channel_id AS "channelId",
       c.channel,
       c.kudos,
       EXISTS (SELECT 1 FROM avatar a WHERE a.channel_id = c.channel_id) AS "avatar",
       COALESCE((SELECT json_group_array(json_object('platform', s.platform, 'url', s.channel_social_account))
                 FROM channel_social_account s
                 WHERE s.channel_id = c.channel_id), '[]') AS "accounts",
       EXISTS (SELECT 1 FROM external_reference r
               WHERE r.channel_id = c.channel_id AND r.source = 'YOUTUBE') AS "fromYouTube",
       COALESCE((SELECT json_group_array(m.human_group_id)
                 FROM channel_group_member m
                 WHERE m.channel_id = c.channel_id), '[]') AS "groupIds"
FROM channel c
WHERE $search = '' OR instr(lower(c.channel), lower($search)) > 0
ORDER BY instr(lower(c.channel), lower($search)) <> 1, c.channel COLLATE NOCASE, c.channel_id
LIMIT $limit OFFSET $offset;
