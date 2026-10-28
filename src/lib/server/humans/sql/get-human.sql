SELECT human_id   AS "humanId",
       human,
       first_name AS "firstName",
       family_name AS "familyName",
       birthday,
       kudos,
       created_at AS "createdAt",
       updated_at AS "updatedAt"
FROM human
WHERE human_id = $human_id;
