-- The pictures of a human, the one shown first.
SELECT human_avatar_id AS "humanAvatarId",
       source_url      AS "sourceUrl"
FROM human_avatar
WHERE human_id = $human_id
ORDER BY position, human_avatar_id;
