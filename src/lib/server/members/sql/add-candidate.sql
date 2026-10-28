-- A pair already suggested keeps its status, so a dismissed pair is never asked about again.
INSERT INTO merge_candidate (merge_candidate_id, member_kind, first_id, second_id, reason,
                             created_at)
VALUES ((SELECT COALESCE(MAX(merge_candidate_id), 0) + 1 FROM merge_candidate), $member_kind,
        $first_id, $second_id, $reason, $now)
ON CONFLICT (member_kind, first_id, second_id) DO NOTHING;
