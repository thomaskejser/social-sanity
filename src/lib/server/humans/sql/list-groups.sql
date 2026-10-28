SELECT g.human_group_id AS "humanGroupId",
       g.human_group    AS "humanGroup",
       COALESCE((SELECT json_group_array(json_object('kind', m.kind, 'id', m.id, 'name', m.name, 'avatar', m.avatar,
                                          'accounts', json(m.accounts)))
                 FROM (SELECT 'human' AS kind, h.human_id AS id, h.human AS name,
                              EXISTS (SELECT 1 FROM human_avatar a WHERE a.human_id = h.human_id) AS avatar,
                              COALESCE((SELECT json_group_array(json_object('platform', s.platform, 'url', s.human_social_account))
                                        FROM human_social_account s WHERE s.human_id = h.human_id), '[]') AS accounts
                       FROM human_group_member hm
                       JOIN human h ON h.human_id = hm.human_id
                       WHERE hm.human_group_id = g.human_group_id
                       UNION ALL
                       SELECT 'company', c.company_id, c.company,
                              EXISTS (SELECT 1 FROM avatar a WHERE a.company_id = c.company_id),
                              COALESCE((SELECT json_group_array(json_object('platform', s.platform, 'url', s.company_social_account))
                                        FROM company_social_account s WHERE s.company_id = c.company_id), '[]')
                       FROM company_group_member cm
                       JOIN company c ON c.company_id = cm.company_id
                       WHERE cm.human_group_id = g.human_group_id
                       UNION ALL
                       SELECT 'channel', ch.channel_id, ch.channel,
                              EXISTS (SELECT 1 FROM avatar a WHERE a.channel_id = ch.channel_id),
                              COALESCE((SELECT json_group_array(json_object('platform', s.platform, 'url', s.channel_social_account))
                                        FROM channel_social_account s WHERE s.channel_id = ch.channel_id), '[]')
                       FROM channel_group_member chm
                       JOIN channel ch ON ch.channel_id = chm.channel_id
                       WHERE chm.human_group_id = g.human_group_id
                       ORDER BY 3 COLLATE NOCASE) m), '[]') AS "members"
FROM human_group g
ORDER BY g.human_group COLLATE NOCASE;
