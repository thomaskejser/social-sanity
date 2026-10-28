INSERT INTO human_phone (human_phone_id, human_id, phone_type, human_phone)
VALUES ((SELECT COALESCE(MAX(human_phone_id), 0) + 1 FROM human_phone), $human_id, $type, $value);
