INSERT INTO publisher (publisher_id, publisher, publisher_kind)
VALUES ((SELECT COALESCE(MAX(publisher_id), 0) + 1 FROM publisher), $publisher, $publisher_kind)
RETURNING publisher_id AS "publisherId";
