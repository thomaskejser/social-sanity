INSERT INTO human_special_day (human_special_day_id, human_id, special_day_type, human_special_day)
VALUES ((SELECT COALESCE(MAX(human_special_day_id), 0) + 1 FROM human_special_day), $human_id,
        $type, $value);
