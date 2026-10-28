SELECT first_id  AS "firstId",
       second_id AS "secondId"
FROM merge_candidate
WHERE member_kind = $member_kind
  AND status <> 'PENDING';
