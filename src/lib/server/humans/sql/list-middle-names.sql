SELECT middle_name AS "middleName"
FROM human_middle_name
WHERE human_id = $human_id
ORDER BY position;
