INSERT INTO human_group (human_group_id, human_group)
VALUES ((SELECT COALESCE(MAX(human_group_id), 0) + 1 FROM human_group), $human_group);
