INSERT INTO human_nickname (human_nickname_id, human_id, human_nickname)
VALUES ((SELECT COALESCE(MAX(human_nickname_id), 0) + 1 FROM human_nickname), $human_id, $value);
