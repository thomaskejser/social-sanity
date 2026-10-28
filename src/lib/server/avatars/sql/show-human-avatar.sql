-- Makes a picture the one shown for its human.
UPDATE human_avatar
SET position = (SELECT MIN(position) - 1 FROM human_avatar WHERE human_id = $human_id)
WHERE human_id = $human_id
  AND human_avatar_id = $human_avatar_id;
