SELECT publisher_id   AS "publisherId",
       publisher,
       publisher_kind AS "publisherKind",
       kudos
FROM publisher
ORDER BY kudos DESC, publisher COLLATE NOCASE;
