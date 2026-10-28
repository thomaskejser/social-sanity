SELECT count(*) AS "total"
FROM company c
WHERE $search = '' OR instr(lower(c.company), lower($search)) > 0;
