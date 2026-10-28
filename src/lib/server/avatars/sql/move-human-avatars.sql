-- Hands a human's pictures to another human, after that human's own.
UPDATE human_avatar
SET position = position
                   - (SELECT MIN(position) FROM human_avatar WHERE human_id = $human_id)
                   + (SELECT COALESCE(MAX(position) + 1, 0)
                      FROM human_avatar
                      WHERE human_id = $to_human_id),
    human_id = $to_human_id
WHERE human_id = $human_id;
