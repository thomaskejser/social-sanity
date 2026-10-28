SELECT count(*) AS "total"
FROM human h
WHERE $search = '' OR instr(lower(h.human), lower($search)) > 0;
