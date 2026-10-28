INSERT INTO human (human_id, human, first_name, family_name, birthday, created_at, updated_at)
VALUES ((SELECT COALESCE(MAX(human_id), 0) + 1 FROM human), $human, $first_name, $family_name,
        $birthday, $now, $now)
RETURNING human_id AS "humanId";
