SELECT human_special_day_id AS "detailId",
       special_day_type     AS "type",
       human_special_day    AS "value"
FROM human_special_day
WHERE human_id = $human_id
ORDER BY human_special_day_id;
