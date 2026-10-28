SELECT human_phone_id AS "detailId",
       phone_type     AS "type",
       human_phone    AS "value"
FROM human_phone
WHERE human_id = $human_id
ORDER BY human_phone_id;
