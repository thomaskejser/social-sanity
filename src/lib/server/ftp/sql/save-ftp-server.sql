-- Changing the settings invalidates the previous connection test and the pinned SFTP host key.
INSERT INTO ftp_server (id, protocol, host, port, username, password_env_var, encryption,
                        host_key_fingerprint, remote_dir, public_url, last_tested_at, last_test_ok,
                        last_test_message, updated_at)
VALUES (1, $protocol, $host, $port, $username, $password_env_var, $encryption,
        NULL, $remote_dir, $public_url, NULL, NULL, NULL, $updated_at)
ON CONFLICT (id) DO UPDATE SET
    protocol             = excluded.protocol,
    host                 = excluded.host,
    port                 = excluded.port,
    username             = excluded.username,
    password_env_var     = excluded.password_env_var,
    encryption           = excluded.encryption,
    host_key_fingerprint = NULL,
    remote_dir           = excluded.remote_dir,
    public_url           = excluded.public_url,
    last_tested_at       = NULL,
    last_test_ok         = NULL,
    last_test_message    = NULL,
    updated_at           = excluded.updated_at;
