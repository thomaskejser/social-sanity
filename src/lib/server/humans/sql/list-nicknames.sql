SELECT human_nickname_id AS "detailId",
       ''                AS "type",
       human_nickname    AS "value"
FROM human_nickname
WHERE human_id = $human_id
ORDER BY human_nickname_id;
