INSERT INTO human_address (human_address_id, human_id, address_type, human_address, map_url)
VALUES ((SELECT COALESCE(MAX(human_address_id), 0) + 1 FROM human_address), $human_id, $type,
        $value, $map_url);
