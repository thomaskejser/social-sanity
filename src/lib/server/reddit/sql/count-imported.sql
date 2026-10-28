SELECT COUNT(*) AS "imported"
FROM external_reference
WHERE source = 'REDDIT'
  AND publisher_id IS NULL;
