-- One picture of a human: the one asked for, or the one shown when none is asked for.
SELECT content_type AS "contentType",
       image
FROM human_avatar
WHERE human_id = $human_id
  AND ($human_avatar_id IS NULL OR human_avatar_id = $human_avatar_id)
ORDER BY position, human_avatar_id
LIMIT 1;
