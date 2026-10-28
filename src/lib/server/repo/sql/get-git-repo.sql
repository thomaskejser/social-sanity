SELECT id,
       url,
       branch,
       posts_dir         AS "postsDir",
       token_env_var     AS "tokenEnvVar",
       token_username    AS "tokenUsername",
       author_name       AS "authorName",
       author_email      AS "authorEmail",
       last_sync_at      AS "lastSyncAt",
       last_sync_ok      AS "lastSyncOk",
       last_sync_message AS "lastSyncMessage",
       updated_at        AS "updatedAt"
FROM git_repo
WHERE id = 1;
