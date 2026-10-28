SELECT count(*)                                     AS "imported",
       count(*) FILTER (WHERE added_at IS NULL)     AS "waiting",
       count(*) FILTER (WHERE added_at IS NOT NULL) AS "added"
FROM youtube_channel;
