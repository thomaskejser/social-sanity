-- Changing the settings clears the result of the last sync.
INSERT INTO git_repo (id, url, branch, posts_dir, token_env_var, token_username, author_name,
                      author_email, last_sync_at, last_sync_ok, last_sync_message, updated_at)
VALUES (1, $url, $branch, $posts_dir, $token_env_var, $token_username, $author_name,
        $author_email, NULL, NULL, NULL, $updated_at)
ON CONFLICT (id) DO UPDATE SET
    url               = excluded.url,
    branch            = excluded.branch,
    posts_dir         = excluded.posts_dir,
    token_env_var     = excluded.token_env_var,
    token_username    = excluded.token_username,
    author_name       = excluded.author_name,
    author_email      = excluded.author_email,
    last_sync_at      = NULL,
    last_sync_ok      = NULL,
    last_sync_message = NULL,
    updated_at        = excluded.updated_at;
