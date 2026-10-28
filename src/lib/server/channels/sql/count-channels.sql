SELECT count(*) AS "total"
FROM channel c
WHERE $search = '' OR instr(lower(c.channel), lower($search)) > 0;
