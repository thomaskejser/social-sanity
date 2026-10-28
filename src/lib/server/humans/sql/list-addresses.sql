SELECT human_address_id AS "detailId",
       address_type     AS "type",
       human_address    AS "value",
       map_url          AS "mapUrl"
FROM human_address
WHERE human_id = $human_id
ORDER BY human_address_id;
