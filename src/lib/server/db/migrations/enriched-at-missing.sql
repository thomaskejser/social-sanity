-- The member tables that exist but have no enrichment mark yet.
SELECT t.name AS "table"
FROM sqlite_schema t
WHERE t.type = 'table'
  AND t.name IN ('human', 'company', 'channel')
  AND NOT EXISTS (SELECT 1 FROM pragma_table_info(t.name) c WHERE c.name = 'enriched_at');
