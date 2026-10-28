-- The reference tables whose source check does not allow Reddit IDs yet.
SELECT t.name AS "table"
FROM sqlite_schema t
WHERE t.type = 'table'
  AND t.name IN ('external_reference', 'external_reference_tombstone')
  AND t.sql NOT LIKE '%''REDDIT''%';
