-- When Claude last looked up the $kind ('human', 'company' or 'channel') with ID $id; no row when
-- there is no such record.
SELECT enriched_at AS "enrichedAt" FROM human WHERE $kind = 'human' AND human_id = $id
UNION ALL
SELECT enriched_at FROM company WHERE $kind = 'company' AND company_id = $id
UNION ALL
SELECT enriched_at FROM channel WHERE $kind = 'channel' AND channel_id = $id;
