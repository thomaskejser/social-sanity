SELECT count(*) AS "total"
FROM channel c
WHERE NOT EXISTS (SELECT 1 FROM channel_group_member m WHERE m.channel_id = c.channel_id);
