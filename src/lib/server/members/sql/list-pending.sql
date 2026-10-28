SELECT merge_candidate_id AS "mergeCandidateId",
       first_id           AS "firstId",
       second_id          AS "secondId",
       reason
FROM merge_candidate
WHERE member_kind = $member_kind
  AND status = 'PENDING'
ORDER BY merge_candidate_id;
