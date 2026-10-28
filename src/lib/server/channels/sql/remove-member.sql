DELETE FROM channel_group_member
WHERE human_group_id = $human_group_id
  AND channel_id = $channel_id;
