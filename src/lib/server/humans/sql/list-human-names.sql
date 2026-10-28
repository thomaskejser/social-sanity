SELECT h.human_id    AS "humanId",
       h.human,
       h.first_name  AS "firstName",
       h.family_name AS "familyName",
       h.birthday,
       COALESCE((SELECT json_group_array(m.middle_name)
                 FROM (SELECT middle_name
                       FROM human_middle_name
                       WHERE human_id = h.human_id
                       ORDER BY position) m), '[]') AS "middleNames"
FROM human h
ORDER BY h.human_id;
