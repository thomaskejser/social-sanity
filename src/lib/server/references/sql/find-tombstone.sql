SELECT 1 AS "buried"
FROM external_reference_tombstone
WHERE source = $source
  AND external_reference = $external_reference;
