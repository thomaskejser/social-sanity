SELECT count(*) AS "total"
FROM human h
WHERE NOT EXISTS (SELECT 1 FROM human_group_member m WHERE m.human_id = h.human_id);
